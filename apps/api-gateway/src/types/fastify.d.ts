import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FastifyRedis } from '@fastify/redis';
import { JwtPayload } from '../plugins/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    redis: FastifyRedis;
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }

  interface FastifyRequest {
    jwtVerify<T = JwtPayload>(): Promise<T>;
    user: JwtPayload;
    tier: 'free' | 'pro';
  }
}
