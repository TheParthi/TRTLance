# 🔑 How to Get Your MetaMask Private Key TrustLance

## ⚠️ IMPORTANT SECURITY WARNING
Your private key gives FULL ACCESS to your wallet. Never share it with anyone!
This is for your TESTNET wallet only (with free Amoy tokens).

## Steps to Export Private Key:

### 1. Open MetaMask Extension
Click the MetaMask icon in your browser

### 2. Select Your Account
Make sure you're on the account that has Amoy testnet tokens

### 3. Click the 3 Dots (⋮)
In the top right corner of MetaMask

### 4. Account Details
Click **"Account details"**

### 5. Show Private Key
- Click **"Show private key"**
- Enter your MetaMask password
- Click **"Confirm"**

### 6. Copy the Key
- You'll see a string starting with `0x...`
- Click **"Copy to clipboard"**

### 7. Add to .env.local
Open `.env.local` and replace:
```bash
DEPLOYER_PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY_HERE
```

With:
```bash
DEPLOYER_PRIVATE_KEY=0xYourActualPrivateKeyHere
```

## ✅ Security Checklist
- ✅ This is a TESTNET wallet (not mainnet)
- ✅ Only has free Amoy tokens
- ✅ .env.local is in .gitignore (won't be committed)
- ✅ Never share this file or private key

## Next Step
Once you add the private key, run:
```bash
npm run deploy:amoy
```
