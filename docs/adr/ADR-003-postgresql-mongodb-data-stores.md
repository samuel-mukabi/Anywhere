# ADR-003: PostgreSQL (Supabase) for Transactional Data + MongoDB Atlas for Trip Documents

| Field       | Value                                    |
| ----------- | ---------------------------------------- |
| **Status**  | Accepted                                 |
| **Date**    | 2026-04-17                               |
| **Deciders**| Engineering Team                         |
| **Tags**    | database, postgresql, mongodb, supabase  |

---

## Context

Anywhere manages two fundamentally different categories of data:

**Category A — Transactional / Relational Data**
- Users, subscriptions, payment records
- Booking confirmations and affiliate tracking events
- Authentication tokens and session metadata

These entities have **strict relational integrity requirements** (e.g., a booking must reference a valid user, a subscription must be tied to a billing event) and must support ACID transactions.

**Category B — Trip Documents**
- Solo spontaneous searches: `{ from, budget, dates, filters: { climate, region } }`
- Group trip rooms: `{ participants: [{ userId, budget, constraints }], consensusResult, chatHistory }`
- Saved trip itineraries: flexible JSON blobs driven by user customization

Trip documents have **highly variable schemas** — a group trip room with 5 participants has completely different top-level fields from a solo budget search. Forcing these into a normalized relational schema would require many nullable columns or a fragile EAV pattern.

---

## Decision

### Store 1: PostgreSQL via Supabase

**Use for:** All transactional and relational workloads.

**Why Supabase over bare PostgreSQL?**
- Managed infrastructure (no ops burden for the current team size)
- Built-in Row Level Security (RLS) — critical for ensuring users can only read their own bookings/subscriptions
- Auto-generated REST and Realtime APIs (Supabase Realtime can be used for live subscription status changes)
- Integrated Auth (optional, can be bypassed in favor of custom JWT)
- Point-in-time recovery and automated backups

**Schema domains (logical grouping, single Supabase instance):**

```sql
-- Users & Auth (owned by User Service)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  tier        TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_sub_id  TEXT UNIQUE NOT NULL,
  status         TEXT NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL
);

-- Bookings & Affiliate (owned by Affiliate Tracker)
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  destination_slug TEXT NOT NULL,
  provider        TEXT NOT NULL,         -- 'skyscanner', 'booking.com', etc.
  affiliate_ref   TEXT,
  commission_usd  NUMERIC(10, 2),
  booked_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**ORM:** [Drizzle ORM](https://orm.drizzle.team/) — chosen for type-safe SQL that compiles to raw SQL (no N+1 footguns from abstracted query builders), and its excellent TypeScript inference.

```ts
// packages/types/src/db/schema.ts (shared via @anywhere/types)
import { pgTable, uuid, text, timestamptz } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  tier: text('tier').notNull().default('free'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});
```

---

### Store 2: MongoDB Atlas

**Use for:** Trip documents and group trip rooms.

**Why MongoDB Atlas over bare MongoDB?**
- Managed, auto-scaling clusters with serverless option
- Atlas Search (Lucene-based) — search trip documents by destination, tags, or date ranges without a separate Elasticsearch instance at early stage
- Atlas Data API for lightweight reads without a Node.js driver connection (useful for edge functions)
- Built-in time-series collections for price snapshot history

**Collection design:**

```js
// Collection: trip_sessions
{
  _id: ObjectId,
  type: "solo" | "group",
  ownerId: "uuid-from-postgres",        // FK reference to Supabase users.id
  createdAt: ISODate,
  updatedAt: ISODate,

  // Solo trip fields
  budget: { amount: 500, currency: "USD" },
  origin: { iata: "NBO", city: "Nairobi" },
  dateRange: { from: ISODate, to: ISODate },
  filters: { climate: "tropical", regions: ["Southeast Asia"] },
  results: [{ destination: "BKK", totalCost: 487, breakdown: {...} }],

  // Group trip fields (only present if type === "group")
  participants: [
    { userId: "uuid", budget: 400, currency: "USD", joinedAt: ISODate },
    { userId: "uuid", budget: 650, currency: "USD", joinedAt: ISODate }
  ],
  consensusBudget: 400,     // min of all participants
  roomCode: "XKPQ7",
  chatHistory: [{ userId, message, sentAt }]
}
```

**Mongoose schema (apps/api):**

```ts
// apps/api/src/models/TripSession.ts
import { Schema, model } from 'mongoose';

const TripSessionSchema = new Schema({
  type: { type: String, enum: ['solo', 'group'], required: true },
  ownerId: { type: String, required: true, index: true },  // Supabase UUID
  budget: { amount: Number, currency: String },
  participants: [{ userId: String, budget: Number, currency: String, joinedAt: Date }],
  results: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const TripSession = model('TripSession', TripSessionSchema);
```

---

## Cross-Store Consistency Strategy

There is no distributed transaction across PostgreSQL and MongoDB. The following patterns maintain eventual consistency:

1. **Ownership lives in PostgreSQL.** `userId` is always a Supabase UUID. MongoDB documents reference it as a string — MongoDB never owns user identity.
2. **Soft deletes in MongoDB.** When a user account is deleted in PostgreSQL, a Kafka `user.deleted` event is consumed by a worker that marks their MongoDB trip documents `{ deleted: true }` — no hard cascades.
3. **No cross-store joins at query time.** Services that need both user metadata and trip data fetch from each store independently and merge in application code.

---

## Alternatives Considered

### Option A: Single PostgreSQL Database with JSONB Columns for Trip Documents
- **Partially viable** but JSONB loses MongoDB's native array operators, Atlas Search, and change streams that power the Group Sync WebSocket service.
- PostgreSQL JSONB indexing is limited compared to MongoDB's compound document indexes.

### Option B: PlanetScale (MySQL-compatible) + MongoDB Atlas
- **Rejected**: PlanetScale lacks foreign key enforcement by default (Vitess sharding constraint). For a financial product handling bookings and commissions, FK enforcement is non-negotiable.

### Option C: Firebase Firestore for Trip Documents
- **Rejected**: Firestore's query model (no `OR` across different fields, limited aggregation) is insufficient for the destination filter queries (climate + region + budget range in a single query).

### Option D: Single MongoDB for Everything
- **Rejected**: MongoDB's lack of native ACID transactions across documents (without multi-document transactions, which are slower) makes it unsuitable for subscription + billing workflows where partial writes are catastrophic.

---

## Consequences

### Positive
- Each store optimized for its data shape: ACID guarantees for money, flexible documents for creative trip planning.
- Supabase RLS provides security without application-level row filtering on auth-sensitive tables.
- MongoDB Atlas Search defers the need for a dedicated Elasticsearch cluster until Anywhere crosses ~1M destination documents.

### Negative
- Two connection pools to manage in the API layer.
- Developers must know which store owns which data — mitigated by service ownership (User Service owns PostgreSQL, Trip Service owns MongoDB).
- Cross-store querying (e.g., "show me all group trips for Pro users") requires an application-level join. At scale this is a reporting/analytics concern handled by a data warehouse (Snowflake/BigQuery), not the operational stores.

---

## References
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Drizzle ORM](https://orm.drizzle.team/)
- [MongoDB Atlas Developer Data Platform](https://www.mongodb.com/atlas)
- [MongoDB Multi-Document ACID Transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- [PROJECT.md — Data Stores Layer](../../PROJECT.md)
