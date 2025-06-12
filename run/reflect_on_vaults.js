const replay = require('../agents/replay_agent');

function reflect(ids) {
  return replay(ids);
}

if (require.main === module) {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.log('Usage: node reflect_on_vaults.js <vault_id> [more...]');
    process.exit(1);
  }
  const result = reflect(ids);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = reflect;

