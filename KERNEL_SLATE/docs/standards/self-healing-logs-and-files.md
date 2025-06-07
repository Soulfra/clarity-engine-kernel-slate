---
title: Self-Healing Logs & File Creation Standard
description: Standard for robust, self-healing log and file creation in the CLARITY_ENGINE kernel slate. Ensures no process fails due to missing files or directories.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
tags: [kernel, self-healing, logs, files, onboarding]
status: living
---

# Self-Healing Logs & File Creation Standard

> See also: `shared/utils/ensureFileAndDir.js`, `tests/core/backup-buildup.e2e.test.js`

## Rationale
- Prevents errors from missing files or directories
- Ensures all logs and outputs are always available
- Makes the system robust, onboarding-friendly, and zero-downtime

## Usage
- Use `ensureFileAndDir(filePath)` before writing to any file or log
- Automatically creates parent directories and the file if missing
- Safe to call multiple times (idempotent)

## Example
```js
const ensureFileAndDir = require('../../shared/utils/ensureFileAndDir');
ensureFileAndDir('logs/error.log');
fs.appendFileSync('logs/error.log', 'Error: ...\n');
```

## Onboarding Notes
- All new features must use this standard for file/log writes
- E2E tests must validate self-healing behavior
- Reference this doc in onboarding and handoff materials

---

*This standard is required for all file and log writes in the kernel slate. Update as needed for new patterns.* 