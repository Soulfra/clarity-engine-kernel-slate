// CLARITY_ENGINE Kernel Slate: BackupOrchestrator
// See docs/standards/kernel-backup-e2e-checklist.md and self-healing-logs-and-files.md
// Minimal, E2E-tested, self-healing backup orchestrator

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ensureFileAndDir = require('../../../shared/utils/ensureFileAndDir');
const https = require('https');
const http = require('http');

const AUDIT_LOG_PATH = path.resolve('logs/backup-audit.log');
const SUGGESTION_LOG_PATH = path.resolve('project_meta/suggestion_log.md');

function getUser() {
  return process.env.USER || process.env.USERNAME || 'unknown';
}

function hashManifest(manifest) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(manifest));
  return hash.digest('hex');
}

function postWebhook(url, data) {
  try {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const opts = {
      method: 'POST',
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + (parsed.search || ''),
      headers: { 'Content-Type': 'application/json' },
    };
    const req = mod.request(opts, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        console.error('Webhook POST failed:', res.statusCode);
      }
    });
    req.on('error', err => console.error('Webhook POST error:', err.message));
    req.write(JSON.stringify(data));
    req.end();
  } catch (err) {
    console.error('Webhook POST error:', err.message);
  }
}

function logAuditEvent(event) {
  ensureFileAndDir(AUDIT_LOG_PATH);
  fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(event) + '\n');
  if (process.env.BACKUP_WEBHOOK_URL) {
    postWebhook(process.env.BACKUP_WEBHOOK_URL, event);
    console.log('Posted backup event to webhook.');
  }
}

function logSuggestion(event) {
  const entry = [
    '---',
    `timestamp: ${event.timestamp}`,
    `user: ${event.user}`,
    `action: ${event.action}`,
    `backupPath: ${event.backupPath || ''}`,
    `error: ${event.error || ''}`,
    '---',
    `# Backup/Restore Failure: ${event.action}`,
    `- **When:** ${event.timestamp}`,
    `- **User:** ${event.user}`,
    `- **Backup Path:** ${event.backupPath || ''}`,
    `- **Error:** ${event.error || ''}`,
    `- **Suggested Next Steps:** Investigate the error, check logs/backup-audit.log, and rerun the operation.`,
    '\n',
  ].join('\n');
  fs.mkdirSync(path.dirname(SUGGESTION_LOG_PATH), { recursive: true });
  fs.appendFileSync(SUGGESTION_LOG_PATH, entry);
}

class BackupOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      backupDir: options.backupDir || './backups',
      manifestName: options.manifestName || 'manifest.json',
      exclude: options.exclude || ['node_modules', '.git', 'cache', 'backups'],
      maxDepth: options.maxDepth || 10,
      ...options,
    };
    this.lastBackupStatus = null;
  }

  async backup({ scope = 'full', dryRun = false } = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = this.options.backupDir;
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    if (!dryRun) fs.mkdirSync(backupPath, { recursive: true, mode: 0o700 });
    const manifest = [];
    const rootDir = process.cwd();
    const excludeSet = new Set(this.options.exclude);
    // Helper: Recursively copy files
    const copyRecursive = (src, dest, depth = 0) => {
      if (depth > this.options.maxDepth) return;
      const rel = path.relative(rootDir, src);
      if (excludeSet.has(rel.split(path.sep)[0])) return;
      let stat;
      try {
        stat = fs.statSync(src);
      } catch (err) {
        return;
      }
      if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const file of fs.readdirSync(src)) {
          if (excludeSet.has(file)) continue;
          copyRecursive(path.join(src, file), path.join(dest, file), depth + 1);
        }
      } else {
        fs.copyFileSync(src, dest);
        const hash = this.hashFile(src);
        manifest.push({ file: rel, hash });
      }
    };
    for (const file of fs.readdirSync(rootDir)) {
      if (excludeSet.has(file)) continue;
      copyRecursive(path.join(rootDir, file), path.join(backupPath, file));
    }
    // Write manifest
    let status = 'success', error = null;
    try {
      if (!dryRun) {
        const manifestPath = path.join(backupPath, this.options.manifestName);
        ensureFileAndDir(manifestPath);
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
        // Write backup report
        const manifestHash = hashManifest(manifest);
        const report = {
          timestamp,
          user: getUser(),
          action: 'backup',
          scope,
          backupPath,
          manifestPath,
          manifestHash,
          status: 'success',
          fileCount: manifest.length
        };
        const reportPath = path.join(backupPath, 'backup-report.json');
        ensureFileAndDir(reportPath);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
        // Log audit event
        logAuditEvent(report);
      }
      this.lastBackupStatus = { backupPath, manifest, timestamp, dryRun };
      return { backupPath, manifest, dryRun };
    } catch (err) {
      status = 'failure';
      error = err.message;
      // Log failure
      const failEvent = {
        timestamp,
        user: getUser(),
        action: 'backup',
        scope,
        backupPath,
        status,
        error
      };
      logAuditEvent(failEvent);
      logSuggestion(failEvent);
      throw err;
    }
  }

  async restore(backupPath) {
    const manifestPath = path.join(backupPath, this.options.manifestName);
    if (!fs.existsSync(manifestPath)) return false;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    for (const entry of manifest) {
      const src = path.join(backupPath, entry.file);
      const dest = path.join(process.cwd(), entry.file);
      ensureFileAndDir(dest);
      fs.copyFileSync(src, dest);
      fs.chmodSync(dest, 0o600);
    }
    let status = 'success', error = null;
    const timestamp = new Date().toISOString();
    try {
      // Log audit event
      const manifestHash = hashManifest(manifest);
      const event = {
        timestamp,
        user: getUser(),
        action: 'restore',
        backupPath,
        manifestPath,
        manifestHash,
        status
      };
      logAuditEvent(event);
      return true;
    } catch (err) {
      status = 'failure';
      error = err.message;
      const failEvent = {
        timestamp,
        user: getUser(),
        action: 'restore',
        backupPath,
        status,
        error
      };
      logAuditEvent(failEvent);
      logSuggestion(failEvent);
      return false;
    }
  }

  hashFile(filePath) {
    const hash = crypto.createHash('sha256');
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
  }
}

BackupOrchestrator.hashManifest = hashManifest;

// Usage: node backup-orchestrator.js [--backup|--restore <backupPath>] [--webhook <url>]
// If BACKUP_WEBHOOK_URL is set, posts backup/restore events to that URL.
// Runs a real backup or restore in the current workspace. Prints summary to console.
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--webhook')) {
    const idx = args.indexOf('--webhook');
    if (args[idx + 1]) process.env.BACKUP_WEBHOOK_URL = args[idx + 1];
  }
  const orchestrator = new BackupOrchestrator();
  if (args[0] === '--restore' && args[1]) {
    orchestrator.restore(args[1]).then(success => {
      if (success) {
        console.log(`Restore complete. Backup: ${args[1]}`);
      } else {
        console.error('Restore failed.');
        process.exit(1);
      }
    });
  } else {
    orchestrator.backup().then(({ backupPath, manifest }) => {
      const manifestHash = BackupOrchestrator.hashManifest(manifest);
      const reportPath = require('path').join(backupPath, 'backup-report.json');
      console.log('Backup complete!');
      console.log(`  Path: ${backupPath}`);
      console.log(`  Manifest hash: ${manifestHash}`);
      console.log(`  Report: ${reportPath}`);
    }).catch(err => {
      console.error('Backup failed:', err.message);
      process.exit(1);
    });
  }
}

module.exports = BackupOrchestrator; 