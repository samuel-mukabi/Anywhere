import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const users = [
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', email: 'sam@example.com', tier: 'pro', password_hash: '$2b$10$S19D50vtQ0gVZE7cNrblMe3BdeuLv3XQ.Twi8kEamstSe5O4G2FpO', created_at: daysAgo(30) },
  { id: 'b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22', email: 'jane@anywhere.travel', tier: 'free', password_hash: '$2b$10$S19D50vtQ0gVZE7cNrblMe3BdeuLv3XQ.Twi8kEamstSe5O4G2FpO', created_at: daysAgo(15) },
  { id: 'c2eeac99-9c0b-4ef8-bb6d-6bb9bd380a33', email: 'traveller@gmail.com', tier: 'pro', password_hash: '$2b$10$S19D50vtQ0gVZE7cNrblMe3BdeuLv3XQ.Twi8kEamstSe5O4G2FpO', created_at: daysAgo(45) },
  { id: 'd3ddbc99-9c0b-4ef8-bb6d-6bb9bd380a44', email: 'budget_buddy@outlook.com', tier: 'free', password_hash: '$2b$10$S19D50vtQ0gVZE7cNrblMe3BdeuLv3XQ.Twi8kEamstSe5O4G2FpO', created_at: daysAgo(5) }
];

const group_rooms = [
  { id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', name: 'Euro Trip 2026', owner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', created_at: daysAgo(10) },
  { id: 'f5ffbc99-9c0b-4ef8-bb6d-6bb9bd380a66', name: 'Bali Chillout', owner_id: 'c2eeac99-9c0b-4ef8-bb6d-6bb9bd380a33', created_at: daysAgo(2) }
];

const group_members = [
  { room_id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', budget: 2500.00, joined_at: daysAgo(10) },
  { room_id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', user_id: 'b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22', budget: 1800.00, joined_at: daysAgo(9) },
  { room_id: 'f5ffbc99-9c0b-4ef8-bb6d-6bb9bd380a66', user_id: 'c2eeac99-9c0b-4ef8-bb6d-6bb9bd380a33', budget: 3000.00, joined_at: daysAgo(2) },
  { room_id: 'f5ffbc99-9c0b-4ef8-bb6d-6bb9bd380a66', user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', budget: 2800.00, joined_at: daysAgo(1) }
];

const price_alerts = [
  { user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', destination_id: 'tokyo-japan', budget_ceiling: 1200.00, is_active: true, created_at: daysAgo(5) },
  { user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', destination_id: 'lisbon-portugal', budget_ceiling: 800.00, is_active: true, created_at: daysAgo(20) },
  { user_id: 'b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22', destination_id: 'mexico-city-mexico', budget_ceiling: 500.00, is_active: true, created_at: daysAgo(3) }
];

const bookings = [
  { user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', destination_id: 'reykjavik-iceland', total_cost: 1450.00, currency: 'USD', booked_at: daysAgo(365) },
  { user_id: 'c2eeac99-9c0b-4ef8-bb6d-6bb9bd380a33', destination_id: 'kyoto-japan', total_cost: 2100.00, currency: 'USD', booked_at: daysAgo(180) }
];

const affiliate_clicks = [
  { user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', destination_id: 'tokyo-japan', provider: 'duffel', offer_price: 1150.00, clicked_at: daysAgo(0) },
  { user_id: 'b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22', destination_id: 'mexico-city-mexico', provider: 'skyscanner', offer_price: 480.00, clicked_at: daysAgo(2) }
];

async function seed() {
  console.log('Seeding users...');
  const { error: err1 } = await supabase.from('users').upsert(users);
  if (err1) { console.error('Failed to seed users', err1); } else console.log('Users seeded');

  console.log('Seeding group rooms...');
  const { error: err2 } = await supabase.from('group_rooms').upsert(group_rooms);
  if (err2) { console.error('Failed to seed group rooms', err2); } else console.log('Group rooms seeded');

  console.log('Seeding group members...');
  // group_members doesn't have an id, we might just insert, but let's try upsert if it has primary key (room_id, user_id)
  const { error: err3 } = await supabase.from('group_members').upsert(group_members);
  if (err3) { console.error('Failed to seed group members', err3); } else console.log('Group members seeded');

  console.log('Seeding price alerts...');
  // No id provided in seed SQL, auto-generated probably. We can just insert.
  const { error: err4 } = await supabase.from('price_alerts').insert(price_alerts);
  if (err4) { console.error('Failed to seed price alerts', err4); } else console.log('Price alerts seeded');

  console.log('Seeding bookings...');
  const { error: err5 } = await supabase.from('bookings').insert(bookings);
  if (err5) { console.error('Failed to seed bookings', err5); } else console.log('Bookings seeded');

  console.log('Seeding affiliate clicks...');
  const { error: err6 } = await supabase.from('affiliate_clicks').insert(affiliate_clicks);
  if (err6) { console.error('Failed to seed affiliate clicks', err6); } else console.log('Affiliate clicks seeded');

  console.log('Done!');
}

seed();
