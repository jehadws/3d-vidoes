import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import { findAssetFiles, loadRegistry, resolveAsset } from '../../assets/src/index.js';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const fmt = (errs) => (errs || []).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');

export function createValidators(root) {
  const ajv = new Ajv({ allErrors: true });
  const load = (n) => ajv.compile(readJson(path.join(root, 'schemas', n)));
  return { asset: load('asset.schema.json'), shot: load('shot.schema.json'), project: load('project.schema.json') };
}

export function listShots(root, project) {
  const dir = path.join(root, 'projects', project, 'shots');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(dir, f));
}

/**
 * Validate all assets and one project's shots.
 * strict=true (use before final render) also requires status "approved" and existing source/preview files.
 * Returns { errors, warnings, shots, registry }.
 */
export function checkProject(root, project, { strict = false } = {}) {
  const v = createValidators(root);
  const errors = [];
  const warnings = [];
  const rel = (p) => path.relative(root, p);

  // --- Assets
  for (const a of findAssetFiles(root)) {
    if (a.parseError) errors.push(`${rel(a.file)}: invalid JSON (${a.parseError})`);
    else if (!v.asset(a.data)) errors.push(`${rel(a.file)}: ${fmt(v.asset.errors)}`);
  }
  const { registry, duplicates } = loadRegistry(root);
  for (const id of duplicates) errors.push(`duplicate asset id "${id}"`);

  if (strict) {
    for (const [id, a] of registry) {
      if (a.data.status !== 'approved') errors.push(`asset "${id}": status is "${a.data.status}", must be "approved" (strict)`);
      for (const key of ['source', 'preview']) {
        if (!a.data[key]) errors.push(`asset "${id}": missing "${key}" (strict)`);
        else if (!fs.existsSync(path.join(a.dir, a.data[key]))) errors.push(`asset "${id}": ${key} file "${a.data[key]}" not found (strict)`);
      }
    }
  }

  // --- Project config
  const projFile = path.join(root, 'projects', project, 'project.json');
  if (!fs.existsSync(projFile)) errors.push(`projects/${project}/project.json: missing`);
  else if (!v.project(readJson(projFile))) errors.push(`projects/${project}/project.json: ${fmt(v.project.errors)}`);

  // --- Shots
  const shots = [];
  const seen = new Set();
  const files = listShots(root, project);
  if (files.length === 0) warnings.push(`projects/${project}: no shots found`);
  for (const file of files) {
    let shot;
    try { shot = readJson(file); } catch (e) { errors.push(`${rel(file)}: invalid JSON (${e.message})`); continue; }
    if (!v.shot(shot)) { errors.push(`${rel(file)}: ${fmt(v.shot.errors)}`); continue; }
    if (seen.has(shot.id)) errors.push(`${rel(file)}: duplicate shot id "${shot.id}"`);
    seen.add(shot.id);
    shots.push(shot);

    const env = resolveAsset(registry, shot.environment, 'environment');
    if (env.error) errors.push(`${shot.id}: ${env.error}`);

    for (const c of shot.characters ?? []) {
      const r = resolveAsset(registry, c.asset, 'character');
      if (r.error) { errors.push(`${shot.id}: ${r.error}`); continue; }
      const { animations = [], expressions = [] } = r.asset.data;
      if (c.animation && !animations.includes(c.animation)) errors.push(`${shot.id}: "${c.asset}" has no animation "${c.animation}"`);
      if (c.expression && !expressions.includes(c.expression)) errors.push(`${shot.id}: "${c.asset}" has no expression "${c.expression}"`);
    }
    for (const p of shot.props ?? []) {
      const r = resolveAsset(registry, p, 'prop');
      if (r.error) errors.push(`${shot.id}: ${r.error}`);
    }
    if (shot.lighting && resolveAsset(registry, shot.lighting, 'lighting').error) {
      warnings.push(`${shot.id}: lighting "${shot.lighting}" is not a registered lighting asset (treated as a free-form preset name)`);
    }
  }
  return { errors, warnings, shots, registry };
}
