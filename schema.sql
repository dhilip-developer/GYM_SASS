-- GymOS Database Schema
-- Create tables in Supabase PostgreSQL Editor

-- 1. GYM SETTINGS
CREATE TABLE IF NOT EXISTS gym_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_name        text NOT NULL,
  owner_name      text NOT NULL,
  phone           text NOT NULL,
  whatsapp_number text,
  email           text,
  address         text,
  created_at      timestamptz DEFAULT now()
);

-- Ensure only one row is allowed in gym_settings by adding a constraint
-- (or we can handle this purely via UPSERT in the server routes).

-- 2. MEMBERS
CREATE TABLE IF NOT EXISTS members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  text NOT NULL,
  phone      text NOT NULL UNIQUE,
  email      text,
  dob        date,
  gender     text CHECK (gender IN ('Male','Female','Other')),
  address    text,
  photo_url  text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. PLANS
CREATE TABLE IF NOT EXISTS plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  duration_days integer NOT NULL,
  price         numeric(10,2) NOT NULL,
  description   text,
  is_active     boolean DEFAULT true
);

-- Seed plans immediately after creation
INSERT INTO plans (name, duration_days, price, description)
VALUES 
  ('Monthly',    30,  800.00,  '1 month membership'),
  ('Quarterly',  90,  2100.00, '3 months membership'),
  ('Half-yearly',180, 3800.00, '6 months membership'),
  ('Annual',     365, 6500.00, '1 year membership')
ON CONFLICT DO NOTHING;

-- 4. MEMBERSHIPS
CREATE TABLE IF NOT EXISTS memberships (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      uuid REFERENCES members(id) ON DELETE CASCADE,
  plan_id        uuid REFERENCES plans(id),
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid','pending')),
  amount_paid    numeric(10,2) DEFAULT 0,
  payment_mode   text CHECK (payment_mode IN ('cash','upi','card')),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  created_at     timestamptz DEFAULT now()
);

-- 5. MESSAGE TEMPLATES
CREATE TABLE IF NOT EXISTS message_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type  text NOT NULL UNIQUE CHECK (trigger_type IN ('expiry_3day','expiry_1day','expired')),
  template_body text NOT NULL,
  is_active     boolean DEFAULT true,
  updated_at    timestamptz DEFAULT now()
);

-- Seed message templates
INSERT INTO message_templates (trigger_type, template_body)
VALUES
  ('expiry_3day', 'Hi {Name}, your {GymName} membership expires in 3 days on {ExpiryDate}. Renew now! Contact: {OwnerPhone}'),
  ('expiry_1day', 'Hi {Name}, your {GymName} membership expires TOMORROW ({ExpiryDate}). Renew today! Call: {OwnerPhone}'),
  ('expired',     'Hi {Name}, your {GymName} membership expired on {ExpiryDate}. We miss you! Renew anytime: {OwnerPhone}')
ON CONFLICT (trigger_type) DO UPDATE SET template_body = EXCLUDED.template_body;

-- 6. MESSAGE LOGS
CREATE TABLE IF NOT EXISTS message_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid REFERENCES members(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES memberships(id) ON DELETE CASCADE,
  trigger_type  text,
  message_sent  text,
  status        text CHECK (status IN ('sent','failed')),
  sent_at       timestamptz DEFAULT now()
);
