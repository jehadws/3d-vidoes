import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  return v;
}

/** Asset IDs a shot depends on (free-form lighting names simply resolve to "missing"). */
export function shotDependencies(shot) {
  return [...new Set([shot.environment, ...(shot.characters ?? []).map((c) => c.asset), ...(shot.props ?? []), ...(shot.lighting ? [shot.lighting] : [])])].sort();
}

/**
 * Content hash of everything that affects a shot's pixels:
 * the shot spec, each dependency's version, the render preset, fps and resolution.
 */
export function cacheKey(shot, registry, quality, cfg = {}) {
  const deps = shotDependencies(shot).map((id) => [id, registry.get(id)?.data.version ?? 'missing']);
  const payload = canonical({ shot, deps, quality, render: cfg.render?.[quality] ?? null, fps: cfg.fps ?? null, resolution: cfg.resolution ?? null });
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

export const manifestPath = (root, project) => path.join(root, 'projects', project, 'renders', '.manifest.json');

export function readManifest(root, project) {
  const p = manifestPath(root, project);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}

export function writeManifest(root, project, manifest) {
  const p = manifestPath(root, project);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(manifest, null, 2) + '\n');
}

/** Decide which shots need rendering for "preview" or "final". Cached = key matches the manifest. */
export function planJobs(root, project, shots, registry, quality = 'preview') {
  const cfgFile = path.join(root, 'projects', project, 'project.json');
  const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, 'utf8')) : {};
  const manifest = readManifest(root, project);
  return shots.map((shot) => {
    const key = cacheKey(shot, registry, quality, cfg);
    const cached = manifest[`${shot.id}:${quality}`];
    return { shot: shot.id, quality, key, status: cached?.key === key ? 'cached' : 'render' };
  });
}
