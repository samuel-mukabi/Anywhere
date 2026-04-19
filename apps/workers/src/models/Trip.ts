import mongoose, { Schema, Document } from 'mongoose';

export interface ITrip extends Document {
  userId: string; // UUID from PostgreSQL
  destinationId: mongoose.Types.ObjectId; // Pointer to NoSQL Destination Entry
  searchParams: Record<string, unknown>; // Flexible caching map allowing fast replication
  totalCost: number;
  breakdown: Record<string, number>;
  savedAt: Date;
}

const TripSchema = new Schema<ITrip>({
  userId: { type: String, required: true, index: true },
  destinationId: { type: Schema.Types.ObjectId, ref: 'Destination', required: true },
  searchParams: { type: Schema.Types.Mixed },
  totalCost: { type: Number, required: true },
  breakdown: { type: Schema.Types.Mixed },
  savedAt: { type: Date, default: Date.now }
});

export const Trip = mongoose.model<ITrip>('Trip', TripSchema);
