const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const KEY_FILE = path.resolve('admin/env_keys.json');
const SESSION_FILE = path.resolve('runtime/session_env.json');

function loadKeys() {
  ensureFileAndDir(KEY_FILE, '{}');
  try {
    return JSON.parse(fs.readFileSync(KEY_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveKeys(data) {
  ensureFileAndDir(KEY_FILE);
  fs.writeFileSync(KEY_FILE, JSON.stringify(data, null, 2));
}

function setKey(userId, keyName, value) {
  const keys = loadKeys();
  if (!keys[userId]) keys[userId] = {};
  keys[userId][keyName] = value;
  saveKeys(keys);
  return keys[userId];
}

function injectEnv(userId, sessionId = 'default') {
  const keys = loadKeys();
  const user = keys[userId];
  if (!user) throw new Error('missing_user');
  for (const [k, v] of Object.entries(user)) {
    if (k !== 'credits') process.env[k] = v;
  }
  ensureFileAndDir(SESSION_FILE);
  const sessionData = { session: sessionId, ...user };
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
  return sessionData;
}

module.exports = { loadKeys, saveKeys, setKey, injectEnv };
