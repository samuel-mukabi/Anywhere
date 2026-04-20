-- Core Architecture & Schema Migration
-- Designed for complete Row Level Security scaling natively tied to Custom JWT identities.

-----------------------------------------
-- TABLE DEFINITIONS
-----------------------------------------

CREATE TABLE users (
    id UUID PRIMARY KEY, -- Driven explicitly from the Auth JWT sub claim
    email TEXT UNIQUE NOT NULL,
    tier VARCHAR(50) DEFAULT 'free' NOT NULL,
    auth_provider VARCHAR(50),
    avatar_url TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL
);

CREATE TABLE price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    destination_id VARCHAR(50) NOT NULL,
    budget_ceiling DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_members (
    room_id UUID REFERENCES group_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    budget DECIMAL(10, 2) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    destination_id VARCHAR(50) NOT NULL,
    provider TEXT NOT NULL,
    offer_price DECIMAL(10, 2),
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    commission_est DECIMAL(10, 2)
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    duffel_order_id TEXT,
    offer_id TEXT,
    currency VARCHAR(10) DEFAULT 'USD',
    destination_id VARCHAR(50) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    booked_at TIMESTAMPTZ DEFAULT NOW(),
    affiliate_ref TEXT
);


-----------------------------------------
-- VIEWS & VIRTUAL COMPUTATIONS
-----------------------------------------

-- Safely aggregates the budget metrics natively across groups without messy physical Triggers
CREATE OR REPLACE VIEW v_group_rooms_aggregated AS
SELECT 
    gr.id,
    gr.name,
    gr.owner_id,
    gr.created_at,
    COALESCE(MIN(gm.budget), 0) as budget_ceiling,
    COUNT(gm.user_id) as member_count
FROM group_rooms gr
LEFT JOIN group_members gm ON gr.id = gm.room_id
GROUP BY gr.id;


-----------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-----------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "Users can fully manage their own profile" ON users
FOR ALL USING (auth.uid() = id);

-- subscriptions
CREATE POLICY "Users can safely view their active subscription boundaries" ON subscriptions
FOR SELECT USING (auth.uid() = user_id);

-- price_alerts
CREATE POLICY "Users fully manipulate their personal alerts" ON price_alerts
FOR ALL USING (auth.uid() = user_id);

-- group_rooms 
-- (You can manipulate the room if you are the physical owner)
CREATE POLICY "Room Owners hold full command of their rooms" ON group_rooms
FOR ALL USING (auth.uid() = owner_id);

-- (You can view the specific room details completely if you exist in the group_members table for it)
CREATE POLICY "Room Members can transparently view their active groups" ON group_rooms
FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM group_members 
        WHERE room_id = group_rooms.id AND user_id = auth.uid()
    )
);

-- group_members
CREATE POLICY "Members have line of site sequentially on shared roommates" ON group_members
FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM group_rooms 
        WHERE group_rooms.id = group_members.room_id AND group_rooms.owner_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM group_members gm2 
        WHERE gm2.room_id = group_members.room_id AND gm2.user_id = auth.uid()
    )
);

-- group_members allow inserts/updates physically scoped to self or the room creator
CREATE POLICY "Users can manage their specific group budget directly." ON group_members
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Room owner can forcibly manage physical memberships." ON group_members
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM group_rooms 
        WHERE group_rooms.id = group_members.room_id AND group_rooms.owner_id = auth.uid()
    )
);


-- Analytics 
CREATE POLICY "Users isolate their independent monetization views" ON affiliate_clicks
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users map transparently to their finalized bookings" ON bookings
FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_price_alerts_user_active ON price_alerts(user_id, is_active);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_affiliate_clicks_user_date ON affiliate_clicks(user_id, clicked_at);
