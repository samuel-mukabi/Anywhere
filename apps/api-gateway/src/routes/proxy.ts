import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { executeWithCircuitBreaker, SERVICE_REGISTRY } from '../lib/circuit-breaker';
import { Dispatcher } from 'undici';

export async function proxyRoutes(fastify: FastifyInstance) {
  // Wildcard match for all routes (excluding /health which registered before this)
  fastify.all('/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const urlPath = request.url; // Relative path e.g. /api/search/flights

    // 1. Identify downstream service config based on prefix
    // E.g., match "/api/search" prefix and retrieve "http://localhost:8001"
    const prefixMatch = Object.keys(SERVICE_REGISTRY).find((prefix) => 
      urlPath.startsWith(prefix)
    );

    if (!prefixMatch) {
      request.log.warn({ urlPath }, 'No downstream route configured for path');
      return reply.code(404).send({ error: 'Not Found', message: 'Downstream service endpoint not configured.' });
    }

    const downstreamHost = SERVICE_REGISTRY[prefixMatch];
    
    // Construct the explicit target URL including parameters
    // E.g., http://localhost:8001/api/search/flights
    const targetUrl = new URL(urlPath, downstreamHost).toString();

    request.log.info({ targetUrl, upstream: downstreamHost }, 'Proxying downward');

    try {
      // 2. Execute against downstream with the resilient Circuit Breaker
      const upstreamResponse = await executeWithCircuitBreaker(downstreamHost, {
        method: request.method as Dispatcher.HttpMethod,
        url: targetUrl,
        headers: request.headers as IncomingHttpHeaders,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      // 3. Replay headers safely from downstream to the client
      for (const [key, value] of Object.entries(upstreamResponse.headers)) {
        if (value) {
          reply.header(key, value);
        }
      }

      // Convert undici streaming body to fastify raw response buffer natively
      const responseData = await upstreamResponse.body.arrayBuffer();
      
      // 4. Conclude
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
  });
}

import { IncomingHttpHeaders } from 'http';
