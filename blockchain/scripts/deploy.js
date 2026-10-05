// Deploys TrustLanceEscrow and writes deployments/<network>.json.
// ESCROW_ARBITER_ADDRESS must be set (use a multisig on any network that holds real value).
const fs = require('node:fs');
const path = require('node:path');
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const arbiter = process.env.ESCROW_ARBITER_ADDRESS || (hre.network.name === 'localhost' || hre.network.name === 'hardhat' ? deployer.address : '');
  if (!arbiter) throw new Error('Set ESCROW_ARBITER_ADDRESS');

  const Escrow = await hre.ethers.getContractFactory('TrustLanceEscrow');
  const escrow = await Escrow.deploy(arbiter);
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();
  const { chainId } = await hre.ethers.provider.getNetwork();

  const record = {
    contract: 'TrustLanceEscrow',
    network: hre.network.name,
    chainId: Number(chainId),
    address,
    arbiter,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    txHash: escrow.deploymentTransaction()?.hash,
  };
  fs.mkdirSync(path.join(__dirname, '..', 'deployments'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'deployments', `${hre.network.name}.json`), JSON.stringify(record, null, 2));
  console.log(record);
  console.log(`\nSet in .env.local:\nNEXT_PUBLIC_ESCROW_ADDRESS=${address}\nNEXT_PUBLIC_CHAIN_ID=${record.chainId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
