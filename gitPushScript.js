#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execFunc = util.promisify(exec);

const [,,arg] = process.argv;

async function runScript() {
  try {
    await execFunc(`echo "- README changes: ${arg}" >> README.md`)
    await execFunc('git add README.md');
    await execFunc(`git commit --amend --no-edit`);
    execFunc('git push -f');
  } catch (error) {
    throw error;
  }
}

runScript();
