import Fastify from 'fastify';
import socketio from 'fastify-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import pino from 'pino';
import { Socket } from 'socket.io';

const logger = pino({ level: 'info' });

export async function buildApp() {
  const app = Fastify({ logger });

  const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const subClient = pubClient.duplicate();

  await app.register(socketio, {
    cors: {
      origin: process.env.WEB_URL || '*',
      methods: ['GET', 'POST'],
    },
    adapter: createAdapter(pubClient, subClient),
  });

  app.ready((err) => {
    if (err) {
      logger.error(err);
      process.exit(1);
    }

    (app as any).io.on('connection', (socket: Socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      socket.on('JOIN_ROOM', async (data: any) => {
        const { roomId, userId, tier } = data;
        if (tier !== 'pro') {
          socket.emit('PERMISSION_DENIED', { message: 'Pro tier required' });
          return;
        }
        socket.join(roomId);
        logger.info(`User ${userId} joined room ${roomId}`);
        // Logic to update MongoDB and broadcast member list would go here
      });

      socket.on('UPDATE_BUDGET', async (data: any) => {
        const { roomId, userId, budget } = data;
        // Logic to update member budget and broadcast BUDGET_UPDATED
      });

      socket.on('TRIGGER_SEARCH', async (data: any) => {
        const { roomId, userId } = data;
        // Logic for room owner to fire search and broadcast RESULTS_READY
      });

      socket.on('PIN_DESTINATION', async (data: any) => {
        const { roomId, destinationId } = data;
        // Logic to track votes and broadcast VOTES_UPDATED
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  });

  app.get('/health', async () => {
    return { status: 'ok', service: 'group-service' };
  });

  return app;
}
