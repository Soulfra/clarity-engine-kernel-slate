const fs = require('fs');
const path = require('path');
const author = require('../agents/agent_author');

describe('Generated Agent Authoring', () => {
  const draftsRoot = path.resolve('plugins/drafts');
  const metaFile = path.resolve('plugins/agent_drafts.json');

  beforeEach(() => {
    fs.rmSync(draftsRoot, { recursive: true, force: true });
    fs.mkdirSync(draftsRoot, { recursive: true });
    fs.writeFileSync(metaFile, '[]');
  });

  test('create agent draft and metadata', () => {
    const result = author.createAgentDraft('prompt', {
      name: 'tester',
      model: 'gpt-4',
      purpose: 'testing',
      created_by: 'jest'
    });
    const agentDir = path.join(draftsRoot, 'tester');
    expect(fs.existsSync(path.join(agentDir, 'agent.json'))).toBe(true);
    expect(fs.existsSync(path.join(agentDir, 'README.md'))).toBe(true);
    const spec = JSON.parse(fs.readFileSync(path.join(agentDir, 'agent.json'), 'utf-8'));
    expect(spec.id).toBe('tester');
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    expect(meta[0].agent_id).toBe('tester');
  });
});
