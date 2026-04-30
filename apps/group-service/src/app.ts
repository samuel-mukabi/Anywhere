import Fastify from 'fastify';
import socketio from 'fastify-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import pino from 'pino';
import { Socket } from 'socket.io';
import { Group } from './models/Group';

const logger = pino({ level: 'info' });

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    }
  });

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
        const { roomId, userId, tier, budget = 0 } = data;
        if (tier !== 'pro') {
          socket.emit('PERMISSION_DENIED', { message: 'Pro tier required' });
          return;
        }

        socket.join(roomId);

        const group = await Group.findOneAndUpdate(
          { roomId },
          {
            $setOnInsert: { ownerId: userId },
            $pull: { members: { userId } },
          },
          { upsert: true, new: false }
        );

        await Group.updateOne(
          { roomId },
          {
            $push: {
              members: { userId, socketId: socket.id, budget, joinedAt: new Date() },
            },
          }
        );

        const updated = await Group.findOne({ roomId }).lean();
        (app as any).io.to(roomId).emit('MEMBERS_UPDATED', { members: updated?.members ?? [] });
        logger.info(`User ${userId} joined room ${roomId}`);
      });

      socket.on('UPDATE_BUDGET', async (data: any) => {
        const { roomId, userId, budget } = data;

        await Group.updateOne(
          { roomId, 'members.userId': userId },
          { $set: { 'members.$.budget': budget } }
        );

        const group = await Group.findOne({ roomId }).lean();
        (app as any).io.to(roomId).emit('BUDGET_UPDATED', {
          userId,
          budget,
          members: group?.members ?? [],
        });
      });

      socket.on('TRIGGER_SEARCH', async (data: any) => {
        const { roomId, userId } = data;

        const group = await Group.findOne({ roomId }).lean();
        if (!group) {
          socket.emit('ERROR', { message: 'Room not found' });
          return;
        }
        if (group.ownerId !== userId) {
          socket.emit('PERMISSION_DENIED', { message: 'Only the room owner can trigger search' });
          return;
        }

        const minBudget = Math.min(...group.members.map(m => m.budget).filter(b => b > 0));
        (app as any).io.to(roomId).emit('SEARCH_TRIGGERED', { roomId, minBudget });
      });

      socket.on('PIN_DESTINATION', async (data: any) => {
        const { roomId, destinationId, userId } = data;

        await Group.updateOne(
          { roomId, 'pinnedDestinations.destinationId': destinationId },
          { $addToSet: { 'pinnedDestinations.$.votes': userId } }
        );

        // If destination not yet in the array, insert it
        await Group.updateOne(
          { roomId, 'pinnedDestinations.destinationId': { $ne: destinationId } },
          { $push: { pinnedDestinations: { destinationId, votes: [userId] } } }
        );

        const group = await Group.findOne({ roomId }).lean();
        (app as any).io.to(roomId).emit('VOTES_UPDATED', {
          pinnedDestinations: group?.pinnedDestinations ?? [],
        });
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
