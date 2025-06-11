const fs = require('fs');
const path = require('path');

const vaultDir = path.resolve('vaults/vault_kernel_build');
const logFile = path.resolve('loop_log.json');

function checkFile(file) {
  const filePath = path.join(vaultDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
    return true;
  } else {
    console.log(`❌ ${file}`);
    return false;
  }
}

function checkLog() {
  if (!fs.existsSync(logFile)) {
    console.log('❌ loop_log.json');
    return false;
  }
  const log = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
  const last = log[log.length - 1] || {};
  if (last.success) {
    console.log('✅ loop_log.json success');
    return true;
  } else {
    console.log('❌ loop_log.json failure');
    return false;
  }
}

checkFile('README.md');
checkFile('SystemIntent.md');
checkFile('T01_LoopRunner.md');
checkLog();
