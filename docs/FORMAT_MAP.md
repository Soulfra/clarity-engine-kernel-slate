# Format Map

This document lists the basic conversions supported by the infinity router.

| Input | Output | Notes |
|-------|-------|-------|
| JSON  | Markdown (`.md`) | Wraps JSON content in a code block. |
| JSON  | Text (`.txt`) | Pretty printed JSON. |
| Markdown/Text | JSON (`.json`) | Attempts JSON parse or wraps as `{ text }`. |
| Any | QR (`.png`) | Encodes file contents into a QR image. |

All conversions deduct 1 credit from the initiating user unless otherwise whitelisted.
