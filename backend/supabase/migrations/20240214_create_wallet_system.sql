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
-- Note: This assumes 'users' table exists and we want to auto-create wallet.
-- If users already exist, we might need a separate migration to backfill.
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- Backfill function for existing users (optional, run manually if needed)
INSERT INTO user_wallets (user_id, token_balance)
SELECT id, 0 FROM users
WHERE id NOT IN (SELECT user_id FROM user_wallets)
ON CONFLICT (user_id) DO NOTHING;
