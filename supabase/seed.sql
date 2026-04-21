-- anywhere-monorepo: Supabase Seed Script
-- Realistic test data for all core tables

-- ---------------------------------------------------------
-- 1. USERS (Hashed password: 'password123')
-- ---------------------------------------------------------
INSERT INTO users (id, email, tier, password_hash, created_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'sam@example.com', 'pro', '$2b$10$S19D50vtQ0gVZE7cNrblMe3BdeuLv3XQ.Twi8kEamstSe5O4G2FpO', NOW() - INTERVAL '30 days'),
('b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'jane@anywhere.travel', 'free', '$2b$10$S19D50vtQ0gVZE7cNrblMe3BdeuLv3XQ.Twi8kEamstSe5O4G2FpO', NOW() - INTERVAL '15 days'),
('c2eeac99-9c0b-4ef8-bb6d-6bb9bd380a33', 'traveller@gmail.com', 'pro', '$2b$10$S19D50vtQ0gVZE7cNrblMe3BdeuLv3XQ.Twi8kEamstSe5O4G2FpO', NOW() - INTERVAL '45 days'),
('d3ddbc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'budget_buddy@outlook.com', 'free', '$2b$10$S19D50vtQ0gVZE7cNrblMe3BdeuLv3XQ.Twi8kEamstSe5O4G2FpO', NOW() - INTERVAL '5 days');

-- ---------------------------------------------------------
-- 2. GROUP ROOMS
-- ---------------------------------------------------------
INSERT INTO group_rooms (id, name, owner_id, created_at) VALUES
('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Euro Trip 2026', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '10 days'),
('f5ffbc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Bali Chillout', 'c2eeac99-9c0b-4ef8-bb6d-6bb9bd380a33', NOW() - INTERVAL '2 days');

-- ---------------------------------------------------------
-- 3. GROUP MEMBERS (Collaborative Budgets)
-- ---------------------------------------------------------
INSERT INTO group_members (room_id, user_id, budget, joined_at) VALUES
('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2500.00, NOW() - INTERVAL '10 days'),
('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22', 1800.00, NOW() - INTERVAL '9 days'),
('f5ffbc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'c2eeac99-9c0b-4ef8-bb6d-6bb9bd380a33', 3000.00, NOW() - INTERVAL '2 days'),
('f5ffbc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2800.00, NOW() - INTERVAL '1 day');

-- ---------------------------------------------------------
-- 4. PRICE ALERTS
-- ---------------------------------------------------------
INSERT INTO price_alerts (user_id, destination_id, budget_ceiling, is_active, created_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'tokyo-japan', 1200.00, true, NOW() - INTERVAL '5 days'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'lisbon-portugal', 800.00, true, NOW() - INTERVAL '20 days'),
('b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'mexico-city-mexico', 500.00, true, NOW() - INTERVAL '3 days');

-- ---------------------------------------------------------
-- 5. BOOKINGS (History)
-- ---------------------------------------------------------
INSERT INTO bookings (user_id, destination_id, total_cost, currency, booked_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'reykjavik-iceland', 1450.00, 'USD', NOW() - INTERVAL '1 year'),
('c2eeac99-9c0b-4ef8-bb6d-6bb9bd380a33', 'kyoto-japan', 2100.00, 'USD', NOW() - INTERVAL '6 months');

-- ---------------------------------------------------------
-- 6. AFFILIATE CLICKS (Engagement tracking)
-- ---------------------------------------------------------
INSERT INTO affiliate_clicks (user_id, destination_id, provider, offer_price, clicked_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'tokyo-japan', 'duffel', 1150.00, NOW() - INTERVAL '1 hour'),
('b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'mexico-city-mexico', 'skyscanner', 480.00, NOW() - INTERVAL '2 days');
