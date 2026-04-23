import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { executeWithCircuitBreaker, SERVICE_REGISTRY } from '../lib/circuit-breaker';
import { Dispatcher } from 'undici';

export async function proxyRoutes(fastify: FastifyInstance) {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
  
  methods.forEach((method) => {
    fastify.route({
      method,
      url: '/*',
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        const urlPath = request.url;
        const prefixMatch = Object.keys(SERVICE_REGISTRY).find((prefix) => 
          urlPath.startsWith(prefix)
        );

        if (!prefixMatch) {
          request.log.warn({ urlPath }, 'No downstream route configured for path');
          return reply.code(404).send({ error: 'Not Found', message: 'Downstream service endpoint not configured.' });
        }

        const downstreamHost = SERVICE_REGISTRY[prefixMatch];
        const targetPath = urlPath.replace(/^\/api/, '');
        const targetUrl = new URL(targetPath, downstreamHost).toString();

        request.log.info({ targetUrl, upstream: downstreamHost }, 'Proxying downward');

        try {
          const headers = { ...request.headers };
          delete headers.host;
          delete headers['content-length'];

          // Inject user identity for downstream services
          if (request.user?.sub) {
            headers['x-user-id'] = request.user.sub;
          }
          if (request.tier) {
            headers['x-user-tier'] = request.tier;
          }

          const upstreamResponse = await executeWithCircuitBreaker(downstreamHost, {
            method: request.method as Dispatcher.HttpMethod,
            url: targetUrl,
            headers: headers as IncomingHttpHeaders,
            body: request.body ? JSON.stringify(request.body) : undefined,
          });

          for (const [key, value] of Object.entries(upstreamResponse.headers)) {
            if (value) {
              reply.header(key, value);
            }
          }

          const responseData = await upstreamResponse.body.arrayBuffer();
          reply.code(upstreamResponse.statusCode).send(Buffer.from(responseData));

        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : '';
          if (message === 'Service Unavailable - Circuit Breaker Open') {
            request.log.error({ target: downstreamHost }, 'Circuit Breaker prevented connection');
            return reply.code(503).send({ error: 'Service Unavailable', message: 'Downstream dependency unavailable momentarily.' });
          }

          request.log.error(error, 'Downstream proxy routing failure');
          return reply.code(502).send({ error: 'Bad Gateway', message: 'Failed to communicate with backing service.' });
        }
      }
    });
  });
}

import { IncomingHttpHeaders } from 'http';
