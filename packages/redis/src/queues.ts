import { Queue } from 'bullmq';
import { redisClient } from './client';

function createTestQueue() {
  return {
    add: async () => undefined,
    close: async () => undefined,
  };
}

/**
 * BullMQ requires distinct logical definitions dynamically spanning the applications natively.
 */

// 1. Price Alert Checker => Handles recursive 30m checks natively over User's flight tracking goals.
export const priceAlertsQueue = process.env.NODE_ENV === 'test'
  ? createTestQueue()
  : new Queue('price-alert-check', { connection: redisClient });

// 2. Nightly Seed Loader => Safely routes massive Numbeo fetches preventing locking API endpoints.
export const nightlySeedQueue = process.env.NODE_ENV === 'test'
  ? createTestQueue()
  : new Queue('nightly-seed', { connection: redisClient });

// 3. Notification Dispatcher => Allows non-blocking email/push messages directly immediately instantly.
export const pushNotificationQueue = process.env.NODE_ENV === 'test'
  ? createTestQueue()
  : new Queue('notification-dispatch', { connection: redisClient });

// 4. Booking Completion Events => Drives affiliate payouts, confirmation emails, CRM logging
export const bookingEventsQueue = process.env.NODE_ENV === 'test'
  ? createTestQueue()
  : new Queue('booking.completed', { connection: redisClient });

// 5. Quarterly Climate Seed => Pre-computes and caches 2-year average climate scores globally
export const quarterlyClimateQueue = process.env.NODE_ENV === 'test'
  ? createTestQueue()
  : new Queue('quarterly-climate', { connection: redisClient });

