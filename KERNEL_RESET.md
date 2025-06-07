---
title: Kernel Reset
description: Rationale, process, and onboarding for the CLARITY_ENGINE kernel slate reset. Clean, minimal, E2E-tested foundation for all future work.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
---
# Kernel Reset: CLARITY_ENGINE

## Why a Kernel Reset?
- The legacy codebase became bloated, hard to maintain, and full of legacy/unused files.
- This reset provides a clean, minimal, E2E-tested foundation for all future work.
- Only proven, self-healing, and documented code is included.

## What's in `KERNEL_SLATE/`?
- Minimal, working backup+buildup kernel
- Self-healing file/dir utility (`ensureFileAndDir`)
- E2E test for backup+buildup
- Canonical standards, checklists, and onboarding docs

## How to Add New Features
1. **Write or port the feature in isolation.**
2. **Add/expand E2E tests to cover the new feature.**
3. **Use `ensureFileAndDir` for all file writes.**
4. **Update documentation and checklists.**
5. **Only merge if all E2E tests pass green.**

## Where's the Old Code?
- The old codebase is archived in `/archive/` (or `/legacy/`).
- Only port over code that is E2E-tested, self-healing, and documented.
- Do NOT copy over bloat, legacy, or unused files.

## Onboarding & Handoff
- Start here. Read the README and standards.
- Every addition must be E2E-tested, self-healing, and documented.
- Reference the checklist and standards for every change.

---

*This is your clean slate. Spiral out from here—every addition must be E2E-tested, self-healing, and documented.* 