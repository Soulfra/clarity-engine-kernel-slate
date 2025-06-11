const fs = require('fs');
const path = require('path');
const { applyPatch } = require('../engine/patch_runner');

function resolvePatch(idOrPath) {
  if (fs.existsSync(idOrPath)) return idOrPath;
  const candidate = path.resolve('patches', `${idOrPath}.patch.json`);
  if (fs.existsSync(candidate)) return candidate;
  throw new Error('patch_not_found');
}

if (require.main === module) {
  const [, , patchArg] = process.argv;
  if (!patchArg) {
    console.log('Usage: node run/apply_patch.js <patch_id_or_path>');
    process.exit(1);
  }
  try {
    const patchPath = resolvePatch(patchArg);
    const entry = applyPatch(patchPath, process.env.USER_ID || 'local_user');
    console.log('Patch applied:', entry.patch_id);
  } catch (err) {
    console.error('Patch failed:', err.message);
    process.exit(1);
  }
}

module.exports = resolvePatch;
