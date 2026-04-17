import { Queue, Worker } from 'bullmq';
import { redisClient } from './client';

/**
 * BullMQ requires distinct logical definitions dynamically spanning the applications natively.
 */

// 1. Price Alert Checker => Handles recursive 30m checks natively over User's flight tracking goals.
export const priceAlertsQueue = new Queue('price-alert-check', { connection: redisClient });

// 2. Nightly Seed Loader => Safely routes massive Numbeo fetches preventing locking API endpoints.
export const nightlySeedQueue = new Queue('nightly-seed', { connection: redisClient });

// 3. Notification Dispatcher => Allows non-blocking email/push messages directly immediately instantly.
export const pushNotificationQueue = new Queue('notification-dispatch', { connection: redisClient });
