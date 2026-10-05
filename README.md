# 🚀 TrustLance – Trust_First Freelance Marketplace

TrustLance is a **trust-driven freelance marketplace** that focuses on **secure payments, verified identities, and transparent communication**.  
Instead of ratings and platform-controlled mediation, TrustLance uses **milestones, escrow-style payments, wallet-based identity, and encrypted messaging** to build trust between clients and freelancers.

---

## 🧠 Problem Statement

Traditional freelance platforms suffer from:
- Lack of payment trust
- Delayed or denied payments
- Opaque dispute handling
- Fake or unverifiable user identities
- Platform-controlled messaging and moderation

Both **clients** and **freelancers** operate with uncertainty.

---

## 💡 Our Solution

TrustLance introduces a **workflow-first approach** where:
- Payments are locked before work begins
- Funds are released only after milestone approval
- User identity is tied to Google authentication and wallet ownership
- Communication happens via encrypted wallet-to-wallet messaging (XMTP)
- Disputes follow a clear, auditable process

The platform prioritizes **clarity, security, and accountability** over social features.

---

## 👥 User Roles

### 👤 Client
- Post jobs and define milestones
- Hire freelancers with escrow-style payment protection
- Approve or reject milestone submissions
- Raise disputes when required

### 👨‍💻 Freelancer
- Submit proposals
- Work on milestone-based projects
- Get paid automatically on approval
- Communicate securely with clients

### 🛡️ Admin
- Monitor disputes
- Review evidence
- Resolve conflicts fairly (off-chain)

---

## 🔐 Authentication & Identity

- **Google Authentication only**
- Facebook login is completely removed
- No email/password signup
- Users are created uniquely in the backend
- Username is auto-generated from Google account
- Wallet linking is **one-time and irreversible**
- A wallet cannot be reused by another account

This ensures **clean identity mapping** and prevents impersonation.

---

## 💬 Secure Messaging (XMTP)

TrustLance uses **XMTP (wallet-to-wallet encrypted messaging)**:

- End-to-end encrypted communication
- Messages are tied to verified wallet identities
- Platform cannot read message content
- Messaging is enabled **only after hiring**
- Builds trust when sharing sensitive details

Privacy is preserved while accountability remains.

---

## 💰 Payments & Escrow Logic

- Milestone-based payment workflow
- Funds are locked before work starts
- Payments are released automatically after approval
- Disputes pause fund release
- Escrow is simulated using:
  - Blockchain testnet OR
  - PayPal sandbox (platform-managed escrow)

This ensures **fairness for both sides**.

---

## 🧱 Tech Stack

### Frontend
- Next.js (App Router)
- React
- Tailwind CSS

### Backend
- Supabase (PostgreSQL)
- Row Level Security (RLS)
- Supabase Auth (Google OAuth)

### Web3 / Identity
- MetaMask
- Ethereum Sepolia Testnet
- Custom ERC-20 Token (TrustToken – TRT)

### Messaging
- XMTP Protocol (wallet-based encrypted chat)

---

## 📦 Features in Scope

- Google authentication
- Unique user creation
- Wallet linking & enforcement
- Job posting & proposals
- Milestone-based projects
- Escrow-style payments
- Dispute handling
- Secure messaging
- Clean, demo-ready UI

---

## 🚫 Out of Scope (Intentional)

- Ratings & reviews
- Social features
- Multiple wallets per user
- Wallet unlinking
- Mobile app
- Mainnet deployment
- Advanced AI moderation

Scope is intentionally limited to ensure **quality and completeness**.

---

## 🧪 Demo & Testing

- Uses seeded demo data
- Testnet deployment (Sepolia)
- Local development setup
- Screenshots and workflows prepared for demo

---

## 🏁 Project Status

✅ Database schema completed  
✅ Authentication implemented  
✅ Wallet integration ready  
✅ Messaging architecture defined  
✅ Escrow logic designed  
✅ Demo-ready  

---

## 🗂️ Repository Structure

```
TRTLance/
├── src/                  Next.js app (App Router): pages, API routes, components
│   ├── app/              routes and /api handlers
│   ├── components/       UI, dashboard, disputes, wallet, payments
│   ├── ai/               Genkit flows (risk analysis, recommendations)
│   └── lib/              Supabase clients, contracts, payments, config
├── backend/              smart contracts and AI agent (own package.json)
│   ├── contracts/        Solidity: Escrow, ProjectEscrow, TrustToken
│   ├── scripts/          Hardhat deploy scripts (Amoy, Shardeum, local)
│   ├── deployments/      deployed contract addresses
│   ├── ai/               dispute-resolution agent
│   └── supabase/         schema, RLS policies, migrations, seed SQL
├── blockchain/contracts/ earlier contract versions
├── docs/                 product blueprint
└── public/               static assets
```

`node_modules/` and Hardhat build output (`backend/artifacts/`, `backend/cache/`) are not committed —
they are recreated by `npm install` and `npm run compile`.

---

## 📌 How to Run Locally

```bash
# 1. Web app (http://localhost:9002)
npm install
cp .env.example .env.local   # then fill in the keys — see SETUP_STEPS.md
npm run dev

# 2. Smart contracts (optional)
cd backend
npm install
npm run compile
npm run deploy:amoy          # reads DEPLOYER_PRIVATE_KEY from the root .env.local
```

See `SETUP_STEPS.md` for Supabase and wallet setup, and `DISPUTE_RESOLUTION_SYSTEM.md` for the
dispute flow.
