# TrustLance Backend

Complete blockchain-powered freelance marketplace backend with AI dispute resolution.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment

Copy `.env.example` to `.env.local` and fill in:
- Supabase credentials
- MetaMask wallet private key (testnet wallet)
- Admin wallet address

### 3. Deploy Smart Contract

```bash
# Deploy to Amoy Testnet (FREE)
npm run deploy:amoy
```

### 4. Setup Database

1. Go to Supabase SQL Editor
2. Run `supabase/schema.sql`
3. Run `supabase/rls_policies.sql`

### 5. Start Development

```bash
cd ..
npm run dev
```

## 📁 Structure

```
backend/
├── contracts/          # Solidity smart contracts
│   └── ProjectEscrow.sol
├── scripts/           # Deployment scripts
│   └── deploy.js
├── ai/                # AI dispute agent
│   └── dispute-agent.js
├── supabase/          # Database schemas & policies
│   ├── schema.sql
│   └── rls_policies.sql
└── deployments/       # Contract addresses (generated)
```

## 🛠 Available Scripts

- `npm run compile` - Compile smart contracts
- `npm run deploy:amoy` - Deploy to Amoy testnet
- `npm run deploy:polygon` - Deploy to Polygon mainnet
- `npm run node` - Start local Hardhat node
- `npm run test` - Run contract tests

## 💰 Cost

**Development (Testnet):**
- Everything FREE
- Get test MATIC from faucets
- Unlimited testing

**Production (Mainnet):**
- ~$0.10 per project
- ~$5-10/month for gas
- Much cheaper than PayPal (2.9%)

## 🤖 AI Agent

Three options:
1. **Ollama (FREE)** - Run locally, no API costs
2. **OpenAI** - $5 free credits, then $0.02/dispute
3. **Mock** - Rule-based, for testing

Configure in `.env.local`:
```bash
AI_PROVIDER=ollama  # or openai or mock
```

## 📊 Demo Data

The schema includes demo data:
- 4 demo users (client, freelancers)
- 3 demo projects
- 2 proposals
- 1 active dispute
- Sample transactions

## 🔐 Security

- All tables have Row Level Security (RLS)
- Smart contract uses OpenZeppelin
- Private keys never committed to git
- Service role key only on server

## 🌐 Networks

**Amoy Testnet** (Development):
- Chain ID: 80002
- RPC: https://rpc-amoy.polygon.technology
- Explorer: https://amoy.polygonscan.com
- Faucet: https://faucet.polygon.technology

**Polygon Mainnet** (Production):
- Chain ID: 137
- RPC: https://polygon-rpc.com
- Explorer: https://polygonscan.com

## 📝 License

MIT
