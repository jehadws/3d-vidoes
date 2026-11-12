#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProject } from '../../../packages/quality/src/index.js';
import { planJobs } from '../../../packages/rendering/src/index.js';
import { analyzeAudio } from '../../../packages/audio-analysis/src/index.js';
import { directStory } from '../../../packages/story/src/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = {
    project: 'pilot-video',
    strict: false,
    quality: 'preview',
    language: 'auto',
    minimumPause: 0.25
  };
  const valueOptions = new Set(['--project', '--quality', '--audio', '--script', '--model', '--language', '--output', '--minimum-pause', '--transcript', '--director-model']);
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--strict') opts.strict = true;
    else if (valueOptions.has(arg)) {
      const value = rest[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      const key = ({
        '--project': 'project',
        '--quality': 'quality',
        '--audio': 'audio',
        '--script': 'script',
        '--model': 'model',
        '--language': 'language',
        '--output': 'output',
        '--minimum-pause': 'minimumPause',
        '--transcript': 'transcript',
        '--director-model': 'directorModel'
      })[arg];
      opts[key] = key === 'minimumPause' ? Number(value) : value;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!Number.isFinite(opts.minimumPause) || opts.minimumPause < 0) {
    throw new Error('--minimum-pause must be a non-negative number');
  }
  return { command, opts };
}

const USAGE = `d3-video production CLI

  validate [--project NAME] [--strict]   Validate assets, project config, and shots.
                                         --strict: require approved assets with existing files.
  jobs     [--project NAME] [--quality preview|final]
                                         Show which shots need rendering vs are cached.
  analyze-audio [--project NAME] --audio FILE [--script FILE] [--model FILE]
                [--language auto|CODE] [--output FILE] [--minimum-pause SECONDS]
                                         Probe audio, transcribe with Whisper.cpp, and write
                                         phrase timestamps + script comparison as JSON.

Audio analysis requirements:
  ffprobe on PATH (or FFPROBE), whisper-cli on PATH (or WHISPER_CLI),
  and a Whisper.cpp model (--model or WHISPER_MODEL).
`;

async function main() {
  let command;
  let opts;
  try {
    ({ command, opts } = parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }

  if (command === 'validate') {
    const { errors, warnings, shots, registry } = checkProject(ROOT, opts.project, { strict: opts.strict });
    warnings.forEach((w) => console.warn(`warn  ${w}`));
    errors.forEach((e) => console.error(`error ${e}`));
    console.log(`${registry.size} assets, ${shots.length} shots, ${errors.length} errors, ${warnings.length} warnings${opts.strict ? ' (strict)' : ''}`);
    process.exitCode = errors.length ? 1 : 0;
    return;
  }

  if (command === 'jobs') {
    if (!['preview', 'final'].includes(opts.quality)) {
      console.error('--quality must be preview or final');
      process.exitCode = 2;
      return;
    }
    const { errors, shots, registry } = checkProject(ROOT, opts.project, { strict: opts.quality === 'final' });
    if (errors.length) {
      errors.forEach((e) => console.error(`error ${e}`));
      console.error('Fix validation errors before planning jobs.');
      process.exitCode = 1;
      return;
    }
    for (const job of planJobs(ROOT, opts.project, shots, registry, opts.quality)) {
      console.log(`${job.shot}  ${job.quality}  ${job.key}  ${job.status}`);
    }
    return;
  }

  if (command === 'analyze-audio') {
    const projectDir = path.resolve(ROOT, 'projects', opts.project);
    if (!projectDir.startsWith(path.resolve(ROOT, 'projects') + path.sep)) {
      console.error('--project must be a project directory name inside projects/');
      process.exitCode = 2;
      return;
    }
    const audioPath = path.resolve(opts.audio ?? path.join(projectDir, 'audio', 'voiceover.wav'));
    const defaultScript = path.join(projectDir, 'script', 'script.md');
    const scriptPath = opts.script ? path.resolve(opts.script) : (fs.existsSync(defaultScript) ? defaultScript : undefined);
    const outputPath = path.resolve(opts.output ?? path.join(projectDir, 'analysis', 'transcript.json'));
    try {
      const result = await analyzeAudio({
        audioPath,
        scriptPath,
        outputPath,
        modelPath: opts.model,
        language: opts.language,
        minimumPauseSeconds: opts.minimumPause
      });
      console.log(`Audio analysis saved: ${outputPath}`);
      console.log(`Duration: ${result.duration_seconds}s | ${result.sample_rate ?? 'unknown'} Hz | ${result.channels ?? 'unknown'} channel(s)`);
      console.log(`Timed phrases: ${result.transcription.segments.length} | pauses: ${result.pauses.length} | script match: ${result.script_comparison.status}`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
    return;
  }

  console.log(USAGE);
  process.exitCode = command ? 2 : 0;
}

await main();
