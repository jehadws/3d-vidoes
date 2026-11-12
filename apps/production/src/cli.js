#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProject } from '../../../packages/quality/src/index.js';
import { planJobs } from '../../../packages/rendering/src/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { project: 'pilot-video', strict: false, quality: 'preview' };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--strict') opts.strict = true;
    else if (rest[i] === '--project') opts.project = rest[++i];
    else if (rest[i] === '--quality') opts.quality = rest[++i];
    else { console.error(`unknown option ${rest[i]}`); process.exit(2); }
  }
  return { command, opts };
}

const USAGE = `d3-video production CLI

  validate [--project NAME] [--strict]   Validate assets, project config, and shots.
                                         --strict: require approved assets with existing files (pre-final-render gate).
  jobs     [--project NAME] [--quality preview|final]
                                         Show which shots need rendering vs are cached.
`;

const { command, opts } = parseArgs(process.argv.slice(2));

if (command === 'validate') {
  const { errors, warnings, shots, registry } = checkProject(ROOT, opts.project, { strict: opts.strict });
  warnings.forEach((w) => console.warn(`warn  ${w}`));
  errors.forEach((e) => console.error(`error ${e}`));
  console.log(`${registry.size} assets, ${shots.length} shots, ${errors.length} errors, ${warnings.length} warnings${opts.strict ? ' (strict)' : ''}`);
  process.exit(errors.length ? 1 : 0);
} else if (command === 'jobs') {
  if (!['preview', 'final'].includes(opts.quality)) { console.error('--quality must be preview or final'); process.exit(2); }
  const { errors, shots, registry } = checkProject(ROOT, opts.project, { strict: opts.quality === 'final' });
  if (errors.length) { errors.forEach((e) => console.error(`error ${e}`)); console.error('Fix validation errors before planning jobs.'); process.exit(1); }
  for (const j of planJobs(ROOT, opts.project, shots, registry, opts.quality)) console.log(`${j.shot}  ${j.quality}  ${j.key}  ${j.status}`);
} else {
  console.log(USAGE);
  process.exit(command ? 2 : 0);
}
