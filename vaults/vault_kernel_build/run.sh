#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
node engine/LoopRunner.js
cd output
zip -r export.zip README.md SystemIntent.md T01_LoopRunner.md loop_log.json >/dev/null
mv export.zip ..
