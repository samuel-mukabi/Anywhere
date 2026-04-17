import mongoose, { Schema, Document } from 'mongoose';

export interface IDestination extends Document {
  name: string;
  country: string;
  iso: string; // ISO 3166-1 alpha-3
  coords: {
    type: 'Point';
    coordinates: number[]; // [longitude, latitude]
  };
  vibes: string[];
  climate: {
    bestMonths: number[]; // [0 = Jan, 11 = Dec]
    annualClimateScore: number;
  };
  avgCosts: {
    total: number;
    flightEst: number;
    dailyLiving: number;
  };
  imageUrl: string;
  hiddenGemScore: number; // 0 - 100 dynamically tracked based on low footprint volume
  updatedAt: Date;
}

const DestinationSchema = new Schema<IDestination>({
  name: { type: String, required: true },
  country: { type: String, required: true },
  iso: { type: String, required: true },
  coords: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  vibes: [{ type: String }],
  climate: {
    bestMonths: [{ type: Number }], // 0 - 11
    annualClimateScore: { type: Number, min: 0, max: 100 }
  },
  avgCosts: {
    total: { type: Number, required: true },
    flightEst: { type: Number },
    dailyLiving: { type: Number }
  },
  imageUrl: { type: String },
  hiddenGemScore: { type: Number, min: 0, max: 100, default: 50 },
  updatedAt: { type: Date, default: Date.now }
});

// Ensures precise bounding box targeting (Nearest Neigbhors querying locally mapping Map Bounds directly)
DestinationSchema.index({ coords: '2dsphere' });

// Compound index enabling high-speed aggregation specifically evaluating the Business logic criteria algorithms
DestinationSchema.index({ vibes: 1, 'climate.bestMonths': 1, 'avgCosts.total': 1 });

export const Destination = mongoose.model<IDestination>('Destination', DestinationSchema);
