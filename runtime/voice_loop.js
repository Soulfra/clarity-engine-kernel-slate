const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const { startExperience } = require('./soulfra_os');

async function voiceToVault(audioPath){
  const txt = path.join('input','voice_transcript.txt');
  ensureFileAndDir(txt);
  try {
    execSync(`echo "[voice placeholder]" > ${txt}`); // placeholder for transcription
  } catch {}
  const vaultDir = path.join('vaults','vault_voice_loop');
  fs.mkdirSync(vaultDir,{ recursive:true });
  fs.copyFileSync(txt, path.join(vaultDir,'seed_chatlog.txt'));
  return startExperience(vaultDir);
}

module.exports = { voiceToVault };

if (require.main === module) {
  const audio = process.argv[2];
  voiceToVault(audio).then(info=>console.log(info));
}
