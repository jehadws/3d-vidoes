import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProject } from '../packages/quality/src/index.js';
import { cacheKey, planJobs, writeManifest } from '../packages/rendering/src/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Copy the repo's schemas/assets/projects into a temp dir so tests can mutate them. */
function sandbox() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'd3-'));
  for (const d of ['schemas', 'assets', 'projects']) fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true });
  return tmp;
}
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2));
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

test('example pilot project passes non-strict validation', () => {
  const r = checkProject(ROOT, 'pilot-video');
  assert.deepEqual(r.errors, []);
  assert.equal(r.shots.length, 2);
  assert.equal(r.registry.size, 3);
});

test('strict validation fails while assets are unapproved or files are missing', () => {
  const r = checkProject(ROOT, 'pilot-video', { strict: true });
  assert.ok(r.errors.some((e) => e.includes('must be "approved"')));
  assert.ok(r.errors.some((e) => e.includes('not found (strict)')));
});

test('unknown environment, animation, and expression are rejected', () => {
  const tmp = sandbox();
  const f = path.join(tmp, 'projects/pilot-video/shots/shot_001.json');
  const shot = readJson(f);
  shot.environment = 'moon_base';
  shot.characters[0].animation = 'moonwalk';
  shot.characters[0].expression = 'smug';
  writeJson(f, shot);
  const { errors } = checkProject(tmp, 'pilot-video');
  assert.ok(errors.some((e) => e.includes('moon_base')));
  assert.ok(errors.some((e) => e.includes('moonwalk')));
  assert.ok(errors.some((e) => e.includes('smug')));
});

test('a shot without a story_beat is rejected by schema', () => {
  const tmp = sandbox();
  const f = path.join(tmp, 'projects/pilot-video/shots/shot_001.json');
  const shot = readJson(f);
  delete shot.story_beat;
  writeJson(f, shot);
  assert.ok(checkProject(tmp, 'pilot-video').errors.some((e) => e.includes('story_beat')));
});

test('duplicate shot ids are rejected', () => {
  const tmp = sandbox();
  const dir = path.join(tmp, 'projects/pilot-video/shots');
  fs.copyFileSync(path.join(dir, 'shot_001.json'), path.join(dir, 'shot_003.json'));
  assert.ok(checkProject(tmp, 'pilot-video').errors.some((e) => e.includes('duplicate shot id')));
});

test('cache key changes when a dependency asset version changes, and only for shots that use it', () => {
  const tmp = sandbox();
  const before = checkProject(tmp, 'pilot-video');
  const keys1 = before.shots.map((s) => cacheKey(s, before.registry, 'preview'));

  const f = path.join(tmp, 'assets/environments/living_room/metadata.json');
  const m = readJson(f); m.version = '0.0.2'; writeJson(f, m);
  const afterUnrelated = checkProject(tmp, 'pilot-video');
  assert.deepEqual(afterUnrelated.shots.map((s) => cacheKey(s, afterUnrelated.registry, 'preview')), keys1, 'unrelated asset must not invalidate');

  const g = path.join(tmp, 'assets/characters/protagonist/metadata.json');
  const c = readJson(g); c.version = '0.1.0'; writeJson(g, c);
  const afterRelated = checkProject(tmp, 'pilot-video');
  const keys3 = afterRelated.shots.map((s) => cacheKey(s, afterRelated.registry, 'preview'));
  assert.notDeepEqual(keys3[0], keys1[0]);
});

test('planJobs marks unchanged shots cached and changed shots render', () => {
  const tmp = sandbox();
  const { shots, registry } = checkProject(tmp, 'pilot-video');
  const manifest = {};
  for (const j of planJobs(tmp, 'pilot-video', shots, registry)) manifest[`${j.shot}:${j.quality}`] = { key: j.key };
  writeManifest(tmp, 'pilot-video', manifest);
  assert.ok(planJobs(tmp, 'pilot-video', shots, registry).every((j) => j.status === 'cached'));

  const f = path.join(tmp, 'projects/pilot-video/shots/shot_002.json');
  const s = readJson(f); s.duration = 4; writeJson(f, s);
  const re = checkProject(tmp, 'pilot-video');
  const plan = planJobs(tmp, 'pilot-video', re.shots, re.registry);
  assert.equal(plan.find((j) => j.shot === 'shot_001').status, 'cached');
  assert.equal(plan.find((j) => j.shot === 'shot_002').status, 'render');
});
