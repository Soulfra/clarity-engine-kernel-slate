// CLARITY_ENGINE Kernel Slate: Backup Dashboard
// Lists all backups, their health, last backup time, and status badge.
// See docs/standards/kernel-backup-e2e-checklist.md
const fs = require('fs');
const path = require('path');
const BackupOrchestrator = require('./backup-orchestrator');

const backupsDir = path.resolve('backups');
if (!fs.existsSync(backupsDir)) {
  console.log('No backups directory found.');
  process.exit(0);
}
const backupDirs = fs.readdirSync(backupsDir).filter(f => f.startsWith('backup-'));
if (backupDirs.length === 0) {
  console.log('No backups found.');
  process.exit(0);
}

function color(str, code) { return `\x1b[${code}m${str}\x1b[0m`; }
function green(str) { return color(str, 32); }
function red(str) { return color(str, 31); }
function badge(ok) { return ok ? green('✅') : red('❌'); }

console.log('Backup Dashboard');
console.log('================');
console.log('');
console.log('Backup Name                        | Date                | Status | Files | Hash                                 | Report');
console.log('-----------------------------------|---------------------|--------|-------|--------------------------------------|------------------------------');

let healthy = 0, unhealthy = 0, lastBackup = null;
for (const dir of backupDirs.sort()) {
  const backupPath = path.join(backupsDir, dir);
  const manifestPath = path.join(backupPath, 'manifest.json');
  const reportPath = path.join(backupPath, 'backup-report.json');
  let status = 'healthy', manifestHash = '', fileCount = 0, ok = true, date = '', report = '';
  if (!fs.existsSync(manifestPath) || !fs.existsSync(reportPath)) {
    status = 'missing manifest or report';
    ok = false;
    unhealthy++;
  } else {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const reportObj = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      manifestHash = BackupOrchestrator.hashManifest(manifest);
      fileCount = manifest.length;
      date = reportObj.timestamp || '';
      report = reportPath;
      if (manifestHash !== reportObj.manifestHash) {
        status = 'manifest hash mismatch';
        ok = false;
        unhealthy++;
      } else if (reportObj.status !== 'success') {
        status = 'backup not successful';
        ok = false;
        unhealthy++;
      } else {
        healthy++;
        lastBackup = date;
      }
    } catch (err) {
      status = 'error';
      ok = false;
      unhealthy++;
    }
  }
  console.log(
    `${dir.padEnd(35)}| ${date.padEnd(19)}| ${badge(ok)} ${status.padEnd(6)}| ${String(fileCount).padEnd(5)}| ${manifestHash.slice(0,38).padEnd(38)}| ${report}`
  );
}
console.log('');
console.log(`Summary: ${green(healthy + ' healthy')} / ${red(unhealthy + ' unhealthy')}`);
if (lastBackup) console.log(`Last backup: ${lastBackup}`); 