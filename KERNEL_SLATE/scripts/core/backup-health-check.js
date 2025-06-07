// CLARITY_ENGINE Kernel Slate: Backup Health Check
// Scans backups/, verifies manifests and reports, prints health summary.
// See docs/standards/kernel-backup-e2e-checklist.md
const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../../shared/utils/ensureFileAndDir');
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
let healthy = 0, unhealthy = 0;
for (const dir of backupDirs) {
  const backupPath = path.join(backupsDir, dir);
  const manifestPath = path.join(backupPath, 'manifest.json');
  const reportPath = path.join(backupPath, 'backup-report.json');
  let status = 'healthy', manifestHash = '', fileCount = 0;
  if (!fs.existsSync(manifestPath) || !fs.existsSync(reportPath)) {
    status = 'missing manifest or report';
    unhealthy++;
  } else {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      manifestHash = BackupOrchestrator.hashManifest(manifest);
      fileCount = manifest.length;
      if (manifestHash !== report.manifestHash) {
        status = 'manifest hash mismatch';
        unhealthy++;
      } else if (report.status !== 'success') {
        status = 'backup not successful';
        unhealthy++;
      } else {
        healthy++;
      }
    } catch (err) {
      status = 'error: ' + err.message;
      unhealthy++;
    }
  }
  console.log(`Backup: ${dir}`);
  console.log(`  Status: ${status}`);
  console.log(`  Manifest hash: ${manifestHash}`);
  console.log(`  File count: ${fileCount}`);
  console.log('');
}
console.log(`Backup health summary: ${healthy} healthy, ${unhealthy} unhealthy.`); 