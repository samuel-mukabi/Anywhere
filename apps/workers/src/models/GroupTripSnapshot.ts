import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupTripSnapshot extends Document {
  roomId: string; // UUID mapped to the group_rooms PostgreSQL relation
  members: string[]; // UUIDs
  agreedDestination: mongoose.Types.ObjectId;
  splitBreakdown: Record<string, number>; // Flexible dictionary outlining splits dynamically
  createdAt: Date;
}

const GroupTripSnapshotSchema = new Schema<IGroupTripSnapshot>({
  roomId: { type: String, required: true, index: true },
  members: [{ type: String }],
  agreedDestination: { type: Schema.Types.ObjectId, ref: 'Destination', required: true },
  splitBreakdown: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export const GroupTripSnapshot = mongoose.model<IGroupTripSnapshot>('GroupTripSnapshot', GroupTripSnapshotSchema);
