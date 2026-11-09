#!/usr/bin/env node
/**
 * Runs the unit test suite and fails the build when line coverage drops below
 * the configured threshold. Node 20's test runner has no built-in coverage
 * threshold flag, so this parses the text coverage report instead.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const threshold = Number(process.env.COVERAGE_LINE_THRESHOLD || 80);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const result = spawnSync(npmCommand, ['test'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, NODE_ENV: 'test' }
});

const output = `${result.stdout || ''}\n${result.stderr || ''}`;
process.stdout.write(output);

if (result.status !== 0) {
  process.exit(result.status || 1);
}

const match = output.match(/^#\s+all files\s+\|\s+([\d.]+)\s+\|/m);
if (!match) {
  console.error('Coverage report not found in test output.');
  process.exit(1);
}

const lineCoverage = Number.parseFloat(match[1]);
console.log(`\nLine coverage: ${lineCoverage.toFixed(2)}% (threshold ${threshold}%)`);

if (lineCoverage < threshold) {
  console.error(`Coverage ${lineCoverage.toFixed(2)}% is below the ${threshold}% threshold.`);
  process.exit(1);
}
