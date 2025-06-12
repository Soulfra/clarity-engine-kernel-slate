const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadJson(file, def) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return Array.isArray(def) ? [] : Object.assign({}, def);
  }
}

function saveJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function fakeCompile(prompt, opts) {
  const name = opts.name || 'draft_agent';
  return {
    spec: {
      id: name,
      name,
      preferred_model: opts.model || 'gpt-4',
      description: opts.purpose || 'generated agent',
      credits_per_use: opts.credits_per_use || 0,
      permissions: ['read']
    },
    readme: `# ${name}\n\n${opts.purpose || 'Generated agent.'}\n`,
    trust: {
      created_by: opts.created_by || 'unknown',
      trusted: false,
      badges: opts.badges || []
    }
  };
}

function sandboxCheck(spec) {
  // placeholder sandbox logic
  const passed = !!spec.permissions;
  return { passed };
}

function createAgentDraft(prompt, opts = {}) {
  const compiled = fakeCompile(prompt, opts);
  const draftDir = path.resolve('plugins/drafts', compiled.spec.id);
  ensureDir(draftDir);
  saveJson(path.join(draftDir, 'agent.json'), compiled.spec);
  fs.writeFileSync(path.join(draftDir, 'README.md'), compiled.readme);
  saveJson(path.join(draftDir, 'trust.json'), compiled.trust);

  const metaFile = path.resolve('plugins/agent_drafts.json');
  const meta = loadJson(metaFile, []);
  const entry = {
    agent_id: compiled.spec.id,
    created_by: compiled.trust.created_by,
    trusted: false,
    sandbox_passed: false,
    preferred_model: compiled.spec.preferred_model
  };

  if (opts.sandbox) {
    const result = sandboxCheck(compiled.spec);
    entry.sandbox_passed = result.passed;
    const logFile = path.resolve('sandbox', 'sandbox_log.json');
    ensureDir(path.dirname(logFile));
    const log = loadJson(logFile, []);
    log.push({ agent_id: entry.agent_id, passed: result.passed, time: new Date().toISOString() });
    saveJson(logFile, log);
  }

  const existingIndex = meta.findIndex(m => m.agent_id === entry.agent_id);
  if (existingIndex >= 0) meta[existingIndex] = entry; else meta.push(entry);
  saveJson(metaFile, meta);

  return compiled;
}

module.exports = { createAgentDraft };
