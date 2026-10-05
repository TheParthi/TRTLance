require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config({ path: '../.env.local' });

// Deployment accounts come from the environment. Never reuse a testnet key on a mainnet.
const testnetAccounts = process.env.TESTNET_DEPLOYER_PRIVATE_KEY ? [process.env.TESTNET_DEPLOYER_PRIVATE_KEY] : [];
const mainnetAccounts = process.env.MAINNET_DEPLOYER_PRIVATE_KEY ? [process.env.MAINNET_DEPLOYER_PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },
    shardeumTestnet: {
      url: process.env.SHARDEUM_TESTNET_RPC || 'https://api-testnet.shardeum.org',
      chainId: Number(process.env.SHARDEUM_TESTNET_CHAIN_ID || 8083),
      accounts: testnetAccounts,
    },
    shardeum: {
      url: process.env.SHARDEUM_RPC || 'https://api.shardeum.org',
      chainId: 8118,
      accounts: mainnetAccounts,
    },
  },
};
