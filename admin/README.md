# Admin Referral Payout Management

This directory stores referral reward data and guidelines for managing payouts.

## Files
- `referral_rewards.json` - tracks credit balances, export percentages, and ownership stakes for each referrer.

## Assigning Rewards
1. When a QR code is scanned, an entry is added to `auth/referral_log.json` and the dropper's credits are incremented in `referral_rewards.json`.
2. Review `referral_rewards.json` regularly to calculate equity buybacks or leaderboard standings.
3. To assign retroactive shares, edit `referral_rewards.json` manually, adjusting the `credits` or other fields as needed.

## Payout Simulation
The system only logs credit payouts. No actual transfers occur. Use this log to simulate rewards before executing real buybacks.
