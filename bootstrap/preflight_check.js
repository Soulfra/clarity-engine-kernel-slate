const fs = require('fs');
const path = require('path');
const SealManager = require('../engine/SealManager');

function checkFile(file) {
  return fs.existsSync(file);
}

function runPreflight() {
  const results = {
    fingerprint: false,
    env: false,
    credits: false,
    registry: false,
    wallet: false,
    llm_router: false,
  };

  const masterFile = path.resolve('.soulfra_fingerprint');
  const seal = SealManager.loadSeal();
  if (checkFile(masterFile) && seal) {
    try {
      const fp = fs.readFileSync(masterFile, 'utf-8').trim();
      results.fingerprint = fp === seal.kernel_fingerprint;
    } catch {}
  }

  results.env = checkFile('.env');
  results.credits = checkFile(path.resolve('credits.json')) || checkFile(path.resolve('admin/credits.json'));
  results.registry = checkFile('vault_registry.json');
  results.wallet = checkFile(path.resolve('wallets/template/wallet.json'));
  results.llm_router = checkFile(path.resolve('engine/model_configs.json'));

  return { pass: Object.values(results).every(Boolean), results };
}

if (require.main === module) {
  const { pass, results } = runPreflight();
  if (!pass) {
    console.error('Preflight check failed:', results);
    process.exit(1);
  } else {
    console.log('Preflight check passed');
  }
}

module.exports = runPreflight;
