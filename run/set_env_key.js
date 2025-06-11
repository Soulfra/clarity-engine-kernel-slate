const { setKey } = require('../engine/env_loader');

const [,, userId, keyName, value] = process.argv;

if (!userId || !keyName || !value) {
  console.log('Usage: node run/set_env_key.js <user_id> <KEY_NAME> <value>');
  process.exit(1);
}

setKey(userId, keyName, value);
console.log(`Set ${keyName} for ${userId}`);
