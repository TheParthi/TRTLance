// Copies the compiled ABI into the web app so the frontend and server share one source of truth.
const fs = require('node:fs');
const path = require('node:path');

const artifact = require('../artifacts/contracts/TrustLanceEscrow.sol/TrustLanceEscrow.json');
const out = path.join(__dirname, '..', '..', 'src', 'lib', 'chain', 'escrow-abi.json');
fs.writeFileSync(out, JSON.stringify(artifact.abi, null, 2) + '\n');
console.log(`Wrote ${out}`);
