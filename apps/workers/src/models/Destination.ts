import mongoose, { Schema, Document } from 'mongoose';

// ---------------------------------------------------------------------------
// Monthly Climate Sub-document
// ---------------------------------------------------------------------------

export interface IMonthlyClimate {
  month: number;            // 1–12
  avgTempC: number;
  avgPrecipMm: number;
  avgSunshineHours: number;
  computedAt: Date;
  scores: Map<string, number>; // vibe → 0-100
}

const MonthlyClimateSchema = new Schema<IMonthlyClimate>(
  {
    month:              { type: Number, required: true, min: 1, max: 12 },
    avgTempC:           { type: Number, required: true },
    avgPrecipMm:        { type: Number, required: true },
    avgSunshineHours:   { type: Number, required: true },
    computedAt:         { type: Date,   required: true },
    scores:             { type: Map, of: Number, default: {} },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Destination Interface
// ---------------------------------------------------------------------------

export interface IDestination extends Document {
  name: string;
  slug: string; // Dynamic identifier commonly queried directly
  country: string;
  iso: string; // ISO 3166-1 alpha-3
  coords: {
    type: 'Point';
    coordinates: number[]; // [longitude, latitude]
  };
  vibes: string[];
  climate: {
    bestMonths: number[]; // 0-indexed: 0 = Jan … 11 = Dec (backward-compat)
    annualClimateScore: number;
    monthly: IMonthlyClimate[];         // NEW — 12 entries after first recompute
    lastRecomputedAt?: Date;            // NEW — UTC timestamp of last cron run
  };
  climateMatrix?: Record<string, Record<string, number>>; // month -> vibe -> score
  bestMonths?: number[]; // Raw root map specifically for search runtime cache
  lastClimateUpdate?: Date;
  avgCosts: {
    mealCheap?: number;
    mealMid?: number;
    localTransport?: number;
    coffee?: number;
    total: number;
    flightEst: number;
    dailyLiving: number;
  };
  colTier?: 'budget' | 'mid' | 'premium';
  imageUrl: string;
  
  // Geodata / Demographic enrichments natively bound
  population?: number;
  timezone?: string;
  flag?: string;
  currencies?: Record<string, unknown>;
  languages?: Record<string, string>;
  region?: string;
  subregion?: string;

  hiddenGemScore: number; // 0–100 dynamically tracked
  safetyScore?: number; // 0-100 normalized dynamically via GPI
  gpiRank?: number; // Global standing from native GPI CSV mappings mapped locally
  gpiYear?: number;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Destination Schema
// ---------------------------------------------------------------------------

const DestinationSchema = new Schema<IDestination>({
  name:    { type: String, required: true },
  slug:    { type: String, required: false },
  country: { type: String, required: true },
  iso:     { type: String, required: true },

  coords: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },

  vibes: [{ type: String }],

  climate: {
    bestMonths:         [{ type: Number }],
    annualClimateScore: { type: Number, min: 0, max: 100 },
    // Monthly climate profiles — populated by quarterly cron via ClimateRecomputer
    monthly:            { type: [MonthlyClimateSchema], default: [] },
    lastRecomputedAt:   { type: Date },
  },

  climateMatrix:      { type: Map, of: Map, default: {} },
  bestMonths:         [{ type: Number }],
  lastClimateUpdate:  { type: Date },

  avgCosts: {
    mealCheap:   { type: Number },
    mealMid:     { type: Number },
    localTransport: { type: Number },
    coffee:      { type: Number },
    total:       { type: Number, required: true },
    flightEst:   { type: Number },
    dailyLiving: { type: Number },
  },
  colTier:       { type: String, enum: ['budget', 'mid', 'premium'] },
  imageUrl:      { type: String },

  population:    { type: Number },
  timezone:      { type: String },
  flag:          { type: String },
  currencies:    { type: Map, of: Schema.Types.Mixed },
  languages:     { type: Map, of: String },
  region:        { type: String },
  subregion:     { type: String },

  hiddenGemScore: { type: Number, min: 0, max: 100, default: 50 },
  safetyScore:   { type: Number, min: 0, max: 100 },
  gpiRank:       { type: Number },
  gpiYear:       { type: Number },
  updatedAt:     { type: Date, default: Date.now },
});

// Geo index — precise bounding-box + nearest-neighbor queries
DestinationSchema.index({ coords: '2dsphere' });

// Compound index — high-speed aggregation across business logic criteria
DestinationSchema.index({ vibes: 1, 'climate.bestMonths': 1, 'avgCosts.total': 1 });

// Fast climate lookup by month (used by /climate/score route)
DestinationSchema.index({ 'climate.monthly.month': 1 });

export const Destination = mongoose.model<IDestination>('Destination', DestinationSchema);
