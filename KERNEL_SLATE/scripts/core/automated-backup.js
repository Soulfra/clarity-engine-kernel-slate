// CLARITY_ENGINE Kernel Slate: Automated Backup with Retention
// Runs a backup and prunes old backups (keep last N). See docs/standards/kernel-backup-e2e-checklist.md
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backupsDir = path.resolve('backups');
const N = parseInt(process.env.BACKUP_RETENTION || '5', 10);

console.log('Running automated backup...');
execSync('node scripts/core/backup-orchestrator.js --backup', { stdio: 'inherit' });

if (!fs.existsSync(backupsDir)) {
  console.log('No backups directory found.');
  process.exit(0);
}
const backupDirs = fs.readdirSync(backupsDir)
  .filter(f => f.startsWith('backup-'))
  .map(f => ({ name: f, mtime: fs.statSync(path.join(backupsDir, f)).mtime }))
  .sort((a, b) => b.mtime - a.mtime);

if (backupDirs.length > N) {
  const toDelete = backupDirs.slice(N);
  for (const b of toDelete) {
    const fullPath = path.join(backupsDir, b.name);
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log('Pruned old backup:', b.name);
  }
}
console.log(`Retention enforced: kept ${Math.min(N, backupDirs.length)} most recent backups.`); 