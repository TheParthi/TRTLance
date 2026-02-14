-- TrustLance Complete Database Schema with Demo Data
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'freelancer', 'both')),
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  wallet_address TEXT UNIQUE,
  paypal_email TEXT,
  balance DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0,
  membership_tier TEXT DEFAULT 'free' CHECK (membership_tier IN ('free', 'plus', 'premium')),
  bids_remaining INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('fixed', 'hourly')),
  budget_range TEXT NOT NULL,
  budget_min DECIMAL(12, 2),
  budget_max DECIMAL(12, 2),
  duration TEXT NOT NULL,
  experience_level TEXT NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'expert')),
  skills TEXT[] DEFAULT '{}',
  location_preference TEXT DEFAULT 'anywhere',
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  status TEXT DEFAULT 'open' CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
  hired_freelancer_id UUID REFERENCES users(id),
  client_signature TEXT,
  client_signed_at TIMESTAMPTZ,
  time_remaining TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PROJECT ATTACHMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS project_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. PROPOSALS (BIDS)
-- ============================================
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover_letter TEXT NOT NULL,
  proposed_budget DECIMAL(12, 2) NOT NULL,
  estimated_duration TEXT NOT NULL,
  milestones JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, freelancer_id)
);

-- ============================================
-- 5. MILESTONES
-- ============================================
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'paid')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. SERVICES
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  delivery_time TEXT NOT NULL,
  revisions INTEGER DEFAULT 3,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  category TEXT NOT NULL CHECK (category IN ('project_payment', 'withdrawal', 'deposit', 'platform_fee', 'refund')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('blockchain_escrow', 'paypal', 'bank_transfer', 'wallet')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. DISPUTES
-- ============================================
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES users(id),
  project_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CLIENT', 'FREELANCER')),
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'AWAITING_EVIDENCE', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED')),
  reason TEXT NOT NULL,
  outcome TEXT CHECK (outcome IN ('FREELANCER', 'CLIENT', 'PARTIAL')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('BLOCKCHAIN_ESCROW', 'PAYPAL_PLATFORM_MANAGED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. DISPUTE EVIDENCE
-- ============================================
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id TEXT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES users(id),
  evidence_text TEXT NOT NULL,
  attachments TEXT[],
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('project', 'proposal', 'payment', 'dispute', 'message', 'system')),
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. BOOKMARKS
-- ============================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- ============================================
-- 13. BLOCKCHAIN ESCROWS
-- ============================================
CREATE TABLE IF NOT EXISTS blockchain_escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_address TEXT NOT NULL,
  project_id_bytes32 TEXT NOT NULL,
  client_wallet TEXT NOT NULL,
  freelancer_wallet TEXT NOT NULL,
  total_amount DECIMAL(18, 8) NOT NULL,
  currency TEXT DEFAULT 'MATIC',
  network TEXT DEFAULT 'mumbai',
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'funded', 'completed', 'refunded', 'disputed')),
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. AI DISPUTE RECOMMENDATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS ai_dispute_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id TEXT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  recommended_outcome TEXT NOT NULL CHECK (recommended_outcome IN ('FREELANCER', 'CLIENT', 'PARTIAL')),
  freelancer_percentage INTEGER DEFAULT 0,
  confidence_score INTEGER NOT NULL,
  reasoning TEXT NOT NULL,
  key_factors TEXT[] DEFAULT '{}',
  evidence_summary TEXT,
  admin_override BOOLEAN DEFAULT false,
  final_decision TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_freelancer_id ON proposals(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_project_id ON disputes(project_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_escrows_project_id ON blockchain_escrows(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_dispute ON ai_dispute_recommendations(dispute_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_blockchain_escrows_updated_at
  BEFORE UPDATE ON blockchain_escrows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update user balance on transaction
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    IF NEW.type = 'credit' THEN
      UPDATE users SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.type = 'debit' THEN
      UPDATE users SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_balance_on_transaction
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_user_balance();

-- ============================================
-- 14. CONTRACTS
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id),
  freelancer_id UUID NOT NULL REFERENCES users(id),
  total_amount DECIMAL(12, 2) NOT NULL,
  locked_amount DECIMAL(12, 2) DEFAULT 0,
  released_amount DECIMAL(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disputed', 'cancelled', 'paused')),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  milestones JSONB DEFAULT '[]',
  smart_contract_address TEXT,
  chain_id INTEGER,
  freelancer_signature TEXT,
  freelancer_signed_at TIMESTAMPTZ,
  agreement_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Update timestamp trigger
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 15. TOKEN WALLET SYSTEM (NEW)
-- ============================================

-- Create user_wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_balance INTEGER DEFAULT 0 CHECK (token_balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create token_transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SPEND', 'RECEIVE', 'REDEEM')),
  tokens INTEGER NOT NULL,
  amount_inr DECIMAL(12, 2),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  payment_ref TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(type);

-- RLS Policies
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for user_wallets: Users can view their own wallet
CREATE POLICY "Users can view own wallet" ON user_wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for token_transactions: Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON token_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger to update updated_at for user_wallets
CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON user_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to handle new user wallet creation
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, token_balance)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet for new users
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- Backfill function for existing users (run manually if needed)
INSERT INTO user_wallets (user_id, token_balance)
SELECT id, 0 FROM users
WHERE id NOT IN (SELECT user_id FROM user_wallets)
ON CONFLICT (user_id) DO NOTHING;
