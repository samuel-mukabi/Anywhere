import { buildApp } from './app';
// Ensure the worker script processes async jobs immediately upon booting the search service cluster
import './queue/searchQueue'; 

const PORT = parseInt(process.env.PORT || '8001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Search Engine running aggressively on http://${HOST}:${PORT}`);
    
    const shutdown = async (signal: string) => {
      app.log.info(`Received ${signal}. Draining queues and shutting down safely...`);
      // Optional: Add logic to cleanly drain/suspend BullMQ processing
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    console.error('Fatal internal Search Engine startup error:', err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

start();
