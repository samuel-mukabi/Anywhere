import { Kafka } from 'kafkajs';

export const kafkaClient = new Kafka({
  clientId: 'search-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

export const producer = kafkaClient.producer();

// Lazily connect immediately in background
let isConnected = false;
producer.connect().then(() => {
  isConnected = true;
}).catch(console.error);

/**
 * Fire and Forget Broadcast to analytics stream.
 */
export async function emitSearchCompleted(analyticsPayload: { 
  totalResults: number; 
  topDestination: string; 
  queryBudget: number 
}) {
  if (!isConnected) return; // Prevent crashing during startup

  try {
    await producer.send({
      topic: 'search.completed',
      messages: [
        { value: JSON.stringify(analyticsPayload) },
      ],
    });
  } catch (err) {
    console.error('Failed to emit kafka stream', err);
  }
}

export async function emitSearchRanked(analyticsPayload: {
  searchId: string;
  topDestination: string;
  avgRankScore: number;
  resultCount: number;
  droppedCount: number;
}) {
  if (!isConnected) return;

  try {
    await producer.send({
      topic: 'search.ranked',
      messages: [{ value: JSON.stringify(analyticsPayload) }],
    });
  } catch (err) {
    console.error('Failed to emit ranked analytics stream', err);
  }
}
