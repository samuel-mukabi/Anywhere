import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupMember {
  userId: string;
  socketId: string;
  budget: number;
  joinedAt: Date;
}

export interface IPinnedDestination {
  destinationId: string;
  votes: string[]; // userIds
}

export interface IGroup extends Document {
  roomId: string;
  ownerId: string;
  members: IGroupMember[];
  pinnedDestinations: IPinnedDestination[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupMemberSchema = new Schema<IGroupMember>(
  {
    userId:   { type: String, required: true },
    socketId: { type: String, required: true },
    budget:   { type: Number, required: true, default: 0 },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const PinnedDestinationSchema = new Schema<IPinnedDestination>(
  {
    destinationId: { type: String, required: true },
    votes:         [{ type: String }],
  },
  { _id: false }
);

const GroupSchema = new Schema<IGroup>(
  {
    roomId:             { type: String, required: true, unique: true, index: true },
    ownerId:            { type: String, required: true },
    members:            [GroupMemberSchema],
    pinnedDestinations: [PinnedDestinationSchema],
  },
  { timestamps: true }
);

export const Group = mongoose.model<IGroup>('Group', GroupSchema);
