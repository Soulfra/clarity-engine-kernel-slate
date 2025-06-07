// CLARITY_ENGINE Kernel Slate: Backup Compliance Report
// Lists all backups, health, retention, and issues. Outputs Markdown to stdout and file.
// See docs/standards/kernel-backup-e2e-checklist.md
const fs = require('fs');
const path = require('path');
const BackupOrchestrator = require('./backup-orchestrator');

const backupsDir = path.resolve('backups');
const reportFile = path.resolve('reports/backup-compliance-report.md');
const N = parseInt(process.env.BACKUP_RETENTION || '5', 10);

let md = '# Backup Compliance Report\n\n';
if (!fs.existsSync(backupsDir)) {
  md += 'No backups directory found.\n';
  process.stdout.write(md);
  fs.writeFileSync(reportFile, md);
  process.exit(0);
}
const backupDirs = fs.readdirSync(backupsDir).filter(f => f.startsWith('backup-')).sort();
if (backupDirs.length === 0) {
  md += 'No backups found.\n';
  process.stdout.write(md);
  fs.writeFileSync(reportFile, md);
  process.exit(0);
}
md += '| Backup | Date | Status | Files | Hash | Issues |\n';
md += '|--------|------|--------|-------|------|--------|\n';
let healthy = 0, unhealthy = 0;
for (const dir of backupDirs) {
  const backupPath = path.join(backupsDir, dir);
  const manifestPath = path.join(backupPath, 'manifest.json');
  const reportPath = path.join(backupPath, 'backup-report.json');
  let status = 'healthy', manifestHash = '', fileCount = 0, date = '', issues = '';
  if (!fs.existsSync(manifestPath) || !fs.existsSync(reportPath)) {
    status = 'unhealthy';
    issues = 'missing manifest or report';
    unhealthy++;
  } else {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      manifestHash = BackupOrchestrator.hashManifest(manifest);
      fileCount = manifest.length;
      date = report.timestamp || '';
      if (manifestHash !== report.manifestHash) {
        status = 'unhealthy';
        issues = 'manifest hash mismatch';
        unhealthy++;
      } else if (report.status !== 'success') {
        status = 'unhealthy';
        issues = 'backup not successful';
        unhealthy++;
      } else {
        healthy++;
      }
    } catch (err) {
      status = 'unhealthy';
      issues = 'error: ' + err.message;
      unhealthy++;
    }
  }
  md += `| ${dir} | ${date} | ${status} | ${fileCount} | ${manifestHash.slice(0,12)} | ${issues} |\n`;
}
md += `\n**Retention policy:** keep last ${N} backups. Current: ${backupDirs.length}.\n`;
if (backupDirs.length > N) {
  md += `:warning: Too many backups! Prune to comply.\n`;
}
md += `\nSummary: ${healthy} healthy, ${unhealthy} unhealthy.\n`;
process.stdout.write(md);
fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, md); 