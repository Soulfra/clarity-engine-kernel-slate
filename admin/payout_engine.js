const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const REFERRAL_LOG = path.resolve('referral_rewards.json');
const BUYBACK_LOG = path.resolve('buyback_log.json');
const LEADERBOARD_FILE = path.resolve('admin/leaderboard.json');
const PAYOUT_SUMMARY_FILE = path.resolve('admin/payout_summary.json');

const REWARD_PERCENT = 0.15; // 15% of credits
const DECAY_DAYS = 60;
const DECAY_FACTOR = 0.5;

function loadJson(file, defaultContent = '[]') {
  ensureFileAndDir(file, defaultContent);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return JSON.parse(defaultContent);
  }
}

function saveJson(file, data) {
  ensureFileAndDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function appendReferralEvent(event) {
  const events = loadJson(REFERRAL_LOG);
  const entry = Object.assign({ timestamp: new Date().toISOString() }, event);
  events.push(entry);
  saveJson(REFERRAL_LOG, events);
  return entry;
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function computePayoutSummary(events, now = new Date()) {
  const referrers = {};
  for (const ev of events) {
    const reward = (ev.credits || 0) * REWARD_PERCENT;
    const ts = new Date(ev.timestamp || now);
    const r = ev.referrer_id || 'unknown';
    if (!referrers[r]) {
      referrers[r] = { totalEarned: 0, monthly: {}, lastTimestamp: ts.toISOString() };
    }
    referrers[r].totalEarned += reward;
    const mk = monthKey(ts);
    referrers[r].monthly[mk] = (referrers[r].monthly[mk] || 0) + reward;
    if (new Date(referrers[r].lastTimestamp) < ts) {
      referrers[r].lastTimestamp = ts.toISOString();
    }
  }
  const nowMonth = monthKey(now);
  for (const id of Object.keys(referrers)) {
    const last = new Date(referrers[id].lastTimestamp);
    const diffDays = (now - last) / (1000 * 60 * 60 * 24);
    let payout = referrers[id].monthly[nowMonth] || 0;
    if (diffDays > DECAY_DAYS) {
      payout *= DECAY_FACTOR;
    }
    referrers[id].payoutThisMonth = Number(payout.toFixed(2));
    referrers[id].totalEarned = Number(referrers[id].totalEarned.toFixed(2));
  }
  return { generatedAt: now.toISOString(), referrers };
}

function updateLeaderboard(summary) {
  const leaderboard = Object.entries(summary.referrers).map(([id, data]) => ({
    referrer_id: id,
    totalEarned: data.totalEarned,
    payoutThisMonth: data.payoutThisMonth,
  }));
  leaderboard.sort((a, b) => b.totalEarned - a.totalEarned);
  saveJson(LEADERBOARD_FILE, leaderboard);
  return leaderboard;
}

function runPayoutEngine(now = new Date()) {
  const events = loadJson(REFERRAL_LOG);
  const summary = computePayoutSummary(events, now);
  saveJson(PAYOUT_SUMMARY_FILE, summary);
  updateLeaderboard(summary);
  return summary;
}

if (require.main === module) {
  const summary = runPayoutEngine();
  console.log(JSON.stringify(summary, null, 2));
}

module.exports = { computePayoutSummary, runPayoutEngine, appendReferralEvent };
