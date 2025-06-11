---
title: Soulfra Onboarding
description: Introduction to the Soulfra runtime shell and vault system.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
---
# Soulfra Onboarding

Welcome to **Soulfra**. This project lets you run the kernel locally, spawn a new vault, and export your work without any online services.

## What is Soulfra?
Soulfra is an offline-first framework for building agent vaults. A vault stores your agents, logs, and exports so you can remix and evolve them over time.

## First Run
1. Run `node runtime/start.js` to launch the shell.
2. Click **Start Vault** in the browser or run with `--cli` for a pure CLI run.
3. A new vault folder is forked from `templates/first_run_bundle` and processed by the LoopRunner.
4. When complete, an `export_bundle.zip` appears in your vault directory.

## Exporting and Forking
Exporting packages your vault into a zip for sharing or remixing. Forking creates a fresh vault from the seed bundle so you can start again or branch in a new direction.

## Credits & Referrals
The bundle grants you 100 test credits stored in `credits.json`. Invite friends with the codes in `invite_codes.json` and track progress in `runtime/session_log.json`.

Enjoy your journey and help build the future!
