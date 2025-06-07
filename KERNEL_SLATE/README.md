---
title: CLARITY_ENGINE Kernel Slate
description: Clean, minimal, E2E-tested backup+buildup kernel for CLARITY_ENGINE. Spiral-out ready, onboarding-friendly, and self-healing.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
---
# CLARITY_ENGINE Kernel Slate

## What is this?

This directory contains the **clean, minimal, E2E-tested backup+buildup kernel** for CLARITY_ENGINE. It is the foundation for all future development, onboarding, and scaling.

## Why a Kernel Slate?
- Avoids bloat and legacy entropy
- Ensures only E2E-tested, self-healing, and documented code is included
- Makes onboarding, handoff, and scaling 10x easier
- Provides a single source of truth for the system's core logic

## What's Included?
- Minimal backup+buildup orchestrator (self-healing, modular)
- `ensureFileAndDir` utility for robust file/dir creation
- E2E test for backup+buildup
- Canonical standards and checklists
- This README and a Kernel Reset doc

## How to Add New Features/Modules
1. **Write or port the feature in isolation.**
2. **Add/expand E2E tests to cover the new feature.**
3. **Use `ensureFileAndDir` for all file writes.**
4. **Update documentation and checklists.**
5. **Only merge if all E2E tests pass green.**

## How to Run the E2E Test
```
npx jest tests/core/backup-buildup.e2e.test.js
```

## How to Run a Real Backup or Restore
To create a real backup in your workspace:
```
node scripts/core/backup-orchestrator.js --backup
```
To restore from a backup:
```
node scripts/core/backup-orchestrator.js --restore <backupPath>
```

## How to Check Backup Health
To verify all backups:
```
node scripts/core/backup-health-check.js
```

> The E2E test uses a temp directory and does not create persistent backups. Use the above commands for real, operator-facing backups.

## Backup Dashboard
To see all backups, their health, and status:
```
node scripts/core/backup-dashboard.js
```

## Webhook Notification
To post backup/restore events to a webhook:
```
export BACKUP_WEBHOOK_URL=https://your-endpoint
node scripts/core/backup-orchestrator.js --backup
```
Or pass --webhook:
```
node scripts/core/backup-orchestrator.js --backup --webhook https://your-endpoint
```

## Automated Backup with Retention
To run a backup and prune old backups (default: keep last 5):
```
node scripts/core/automated-backup.js
```
Set retention with:
```
export BACKUP_RETENTION=10
```

## Compliance Report
To generate a Markdown compliance report:
```
node scripts/core/backup-compliance-report.js
```
See `reports/backup-compliance-report.md`.

## Suggestion Log Integration
On backup/restore failure, an entry is added to `project_meta/suggestion_log.md` with details and next steps.

## References
- [Kernel Reset Doc](./KERNEL_RESET.md)
- [Kernel Backup+Buildup E2E Checklist](../docs/standards/kernel-backup-e2e-checklist.md)
- [Self-Healing Logs & File Creation Standard](../docs/standards/self-healing-logs-and-files.md)

---

*This is your clean slate. Spiral out from here—every addition must be E2E-tested, self-healing, and documented.* 