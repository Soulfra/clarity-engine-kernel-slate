const fs = require('fs');
const path = require('path');
const os = require('os');
const BackupOrchestrator = require('../../scripts/core/backup-orchestrator');
const ensureFileAndDir = require('../../shared/utils/ensureFileAndDir');

/**
 * Kernel Slate: Backup+Buildup E2E Test
 * See docs/standards/kernel-backup-e2e-checklist.md and self-healing-logs-and-files.md
 */
describe('Kernel Slate: Backup+Buildup E2E', () => {
  let tempDir, backupDir, backupPath, manifest;
  const origCwd = process.cwd();
  const FILES_TO_COPY = [
    'scripts/core/backup-orchestrator.js',
    'shared/utils/ensureFileAndDir.js',
    'README.md',
  ];
  const AUDIT_LOG_PATH = path.resolve('logs/backup-audit.log');

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clarity-e2e-'));
    // Copy minimal files
    for (const relPath of FILES_TO_COPY) {
      const src = path.resolve(origCwd, relPath);
      const dest = path.resolve(tempDir, relPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    // Create unique temp logs dir and files
    const logsDir = path.join(tempDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    ['error.log', 'warn.log', 'debug.log', 'info.log'].forEach(f => {
      const logPath = path.join(logsDir, f);
      ensureFileAndDir(logPath);
    });
    process.chdir(tempDir);
  });

  afterAll(() => {
    process.chdir(origCwd);
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (backupDir && fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  });

  it('creates a backup, wipes, builds up, and verifies integrity', async () => {
    backupDir = path.join(tempDir, 'backups');
    const orchestrator = new BackupOrchestrator({ backupDir });
    const backupResult = await orchestrator.backup({ scope: 'full', dryRun: false });
    backupPath = backupResult.backupPath;
    manifest = backupResult.manifest;
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(fs.existsSync(path.join(backupPath, orchestrator.options.manifestName))).toBe(true);
    // Validate backup
    for (const entry of manifest) {
      expect(fs.existsSync(path.join(backupPath, entry.file))).toBe(true);
    }
    // Wipe temp workspace (except backups)
    for (const relPath of FILES_TO_COPY) {
      const file = path.join(tempDir, relPath);
      if (fs.existsSync(file)) fs.rmSync(file);
    }
    // Buildup (restore) from backup
    await orchestrator.restore(backupPath);
    // Validate rebuilt workspace matches original (by hash)
    for (const relPath of FILES_TO_COPY) {
      const orig = path.resolve(origCwd, relPath);
      const rebuilt = path.join(tempDir, relPath);
      expect(fs.existsSync(rebuilt)).toBe(true);
      expect(hashFile(orig)).toBe(hashFile(rebuilt));
    }
    // After restore, verify all logs exist
    ['error.log', 'warn.log', 'debug.log', 'info.log'].forEach(f => {
      const logPath = path.join(tempDir, 'logs', f);
      expect(fs.existsSync(logPath)).toBe(true);
    });
    // Validate backup report
    const reportPath = path.join(backupPath, 'backup-report.json');
    expect(fs.existsSync(reportPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    expect(report.status).toBe('success');
    expect(report.user).toBeDefined();
    expect(report.manifestHash).toBe(BackupOrchestrator.hashManifest(manifest));
    // Validate audit log
    expect(fs.existsSync(AUDIT_LOG_PATH)).toBe(true);
    const auditLines = fs.readFileSync(AUDIT_LOG_PATH, 'utf-8').trim().split('\n');
    const backupEvent = JSON.parse(auditLines.find(l => l.includes('"action":"backup"') && l.includes(report.backupPath)));
    expect(backupEvent).toBeDefined();
    expect(backupEvent.status).toBe('success');
    expect(backupEvent.manifestHash).toBe(report.manifestHash);
    expect(backupEvent.user).toBe(report.user);
    // After restore, check restore event is logged
    const restoreEvent = JSON.parse(auditLines.find(l => l.includes('"action":"restore"') && l.includes(report.backupPath)));
    expect(restoreEvent).toBeDefined();
    expect(restoreEvent.status).toBe('success');
    expect(restoreEvent.user).toBe(report.user);
  });

  function hashFile(filePath) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
  }
}); 