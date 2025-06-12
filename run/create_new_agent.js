const readline = require('readline');
const author = require('../agents/agent_author');

function ask(rl, q) {
  return new Promise(res => rl.question(q, ans => res(ans)));
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const name = (await ask(rl, 'Agent name: ')).trim();
  const model = (await ask(rl, 'Preferred model (default gpt-4): ')).trim() || 'gpt-4';
  const purpose = (await ask(rl, 'Purpose: ')).trim();
  const credits = parseInt(await ask(rl, 'Credits per use (number): '), 10) || 0;
  const badges = (await ask(rl, 'Badges (comma separated): ')).split(',').map(b => b.trim()).filter(Boolean);
  rl.close();
  const prompt = `Create agent ${name} for ${purpose} using model ${model}.`;
  const result = author.createAgentDraft(prompt, {
    name,
    model,
    purpose,
    credits_per_use: credits,
    badges,
    created_by: process.env.USER || 'cli_user',
    sandbox: true
  });
  console.log('Draft created for', result.spec.id);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = main;
