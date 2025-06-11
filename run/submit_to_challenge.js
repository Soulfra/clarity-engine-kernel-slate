const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const CHALLENGE_REGISTRY = path.resolve('challenges/challenge_registry.json');
const LOOP_SUBMISSIONS = path.resolve('challenges/loop_submissions.json');

function loadJson(file, defaultVal) {
  if (!fs.existsSync(file)) {
    ensureFileAndDir(file, JSON.stringify(defaultVal, null, 2));
    return defaultVal;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return defaultVal;
  }
}

function saveJson(file, data) {
  ensureFileAndDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getChallenge(challengeId, registry) {
  return registry.find(c => c.challenge_id === challengeId);
}

function usage() {
  console.log('Usage: node submit_to_challenge.js <challengeId> <vaultId> <userId>');
}

function main() {
  const [, , challengeId, vaultId, userId] = process.argv;
  if (!challengeId || !vaultId || !userId) {
    usage();
    process.exit(1);
  }

  const registry = loadJson(CHALLENGE_REGISTRY, []);
  const challenge = getChallenge(challengeId, registry);
  if (!challenge) {
    console.error('Challenge not found:', challengeId);
    process.exit(1);
  }

  const submissions = loadJson(LOOP_SUBMISSIONS, []);
  submissions.push({
    challenge_id: challengeId,
    vault_id: vaultId,
    user_id: userId,
    timestamp: new Date().toISOString(),
    remix_score: 0
  });
  saveJson(LOOP_SUBMISSIONS, submissions);
  console.log(`Vault ${vaultId} submitted to challenge ${challengeId}`);
}

if (require.main === module) {
  main();
}
