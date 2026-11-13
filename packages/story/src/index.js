import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const round = (value) => Math.round(value * 1000) / 1000;

export class StoryDirectorError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'StoryDirectorError';
  }
}

export function validateTranscript(transcript) {
  if (!transcript || typeof transcript !== 'object') throw new StoryDirectorError('Transcript must be a JSON object.');
  const duration = Number(transcript.duration_seconds);
  const segments = transcript.transcription?.segments;
  if (!Number.isFinite(duration) || duration <= 0) throw new StoryDirectorError('Transcript duration_seconds must be greater than zero.');
  if (!Array.isArray(segments) || segments.length === 0) throw new StoryDirectorError('Transcript must contain timed transcription.segments.');
  const ids = new Set();
  let previousEnd = 0;
  for (const [index, segment] of segments.entries()) {
    if (!segment || typeof segment.id !== 'string' || !segment.id.trim()) throw new StoryDirectorError('Transcript segment ' + index + ' has no id.');
    if (ids.has(segment.id)) throw new StoryDirectorError('Duplicate transcript segment id: ' + segment.id);
    ids.add(segment.id);
    if (typeof segment.text !== 'string' || !segment.text.trim()) throw new StoryDirectorError('Transcript segment ' + segment.id + ' has no text.');
    if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < 0 || segment.end <= segment.start) {
      throw new StoryDirectorError('Transcript segment ' + segment.id + ' has invalid timestamps.');
    }
    if (segment.start < previousEnd - 0.05) throw new StoryDirectorError('Transcript segments are not chronological at ' + segment.id + '.');
    if (segment.end > duration + 0.1) throw new StoryDirectorError('Transcript segment ' + segment.id + ' exceeds audio duration.');
    previousEnd = segment.end;
  }
  return { duration, segments };
}

function validateCoverage(plan, transcript) {
  const { duration, segments } = validateTranscript(transcript);
  const segmentById = new Map(segments.map((segment) => [segment.id, segment]));
  const beatIds = new Set();
  const assigned = [];
  let previousBeatEnd = 0;

  for (const beat of plan.beats) {
    if (beatIds.has(beat.id)) throw new StoryDirectorError('Duplicate beat id: ' + beat.id);
    beatIds.add(beat.id);
    if (beat.end_seconds <= beat.start_seconds || beat.end_seconds > duration + 0.1) {
      throw new StoryDirectorError(beat.id + ' has invalid or out-of-range timing.');
    }
    if (beat.start_seconds < previousBeatEnd - 0.05) throw new StoryDirectorError('Story beats overlap or are out of order at ' + beat.id + '.');
    previousBeatEnd = beat.end_seconds;
    for (const id of beat.narration_segment_ids) {
      if (!segmentById.has(id)) throw new StoryDirectorError(beat.id + ' references unknown narration segment ' + id + '.');
      assigned.push(id);
    }
    const beatSegments = beat.narration_segment_ids.map((id) => segmentById.get(id));
    if (beat.start_seconds > Math.min(...beatSegments.map((s) => s.start)) + 0.05 ||
        beat.end_seconds < Math.max(...beatSegments.map((s) => s.end)) - 0.05) {
      throw new StoryDirectorError(beat.id + ' does not cover the timestamps of its narration segments.');
    }
  }

  if (assigned.length !== segments.length || new Set(assigned).size !== segments.length ||
      segments.some((segment) => !assigned.includes(segment.id))) {
    throw new StoryDirectorError('Every narration segment must be assigned to exactly one story beat.');
  }

  const shotIds = new Set();
  const shotsByBeat = new Map([...beatIds].map((id) => [id, []]));
  const shotSegmentIds = new Set();
  let previousShotEnd = 0;
  for (const shot of plan.shots) {
    if (shotIds.has(shot.id)) throw new StoryDirectorError('Duplicate shot id: ' + shot.id);
    shotIds.add(shot.id);
    if (!beatIds.has(shot.beat_id)) throw new StoryDirectorError(shot.id + ' references unknown beat ' + shot.beat_id + '.');
    if (shot.end_seconds <= shot.start_seconds || shot.end_seconds > duration + 0.1) {
      throw new StoryDirectorError(shot.id + ' has invalid or out-of-range timing.');
    }
    if (shot.start_seconds < previousShotEnd - 0.05) throw new StoryDirectorError('Shots overlap or are out of order at ' + shot.id + '.');
    previousShotEnd = shot.end_seconds;
    const beat = plan.beats.find((item) => item.id === shot.beat_id);
    if (shot.start_seconds < beat.start_seconds - 0.05 || shot.end_seconds > beat.end_seconds + 0.05) {
      throw new StoryDirectorError(shot.id + ' extends outside its parent beat.');
    }
    for (const id of shot.narration_segment_ids) {
      if (!segmentById.has(id)) throw new StoryDirectorError(shot.id + ' references unknown narration segment ' + id + '.');
      if (!beat.narration_segment_ids.includes(id)) throw new StoryDirectorError(shot.id + ' references narration outside its parent beat.');
      const segment = segmentById.get(id);
      if (shot.end_seconds <= segment.start || shot.start_seconds >= segment.end) {
        throw new StoryDirectorError(shot.id + ' timing does not overlap narration segment ' + id + '.');
      }
      shotSegmentIds.add(id);
    }
    shotsByBeat.get(shot.beat_id).push(shot);
  }
  for (const [beatId, shots] of shotsByBeat) {
    if (!shots.length) throw new StoryDirectorError(beatId + ' has no visual shots.');
    const beat = plan.beats.find((item) => item.id === beatId);
    if (shots[0].start_seconds > beat.start_seconds + 0.05 || shots.at(-1).end_seconds < beat.end_seconds - 0.05) {
      throw new StoryDirectorError(beatId + ' shot sequence does not cover its complete beat interval.');
    }
    for (let index = 1; index < shots.length; index++) {
      if (shots[index].start_seconds - shots[index - 1].end_seconds > 0.1) {
        throw new StoryDirectorError(beatId + ' contains an unexplained gap between shots.');
      }
    }
  }
  if (segments.some((segment) => !shotSegmentIds.has(segment.id))) {
    throw new StoryDirectorError('Every narration segment must be represented by at least one shot.');
  }
  if (Math.abs(plan.duration_seconds - duration) > 0.1) throw new StoryDirectorError('Plan duration_seconds does not match analyzed audio duration.');
  return { beat_count: plan.beats.length, shot_count: plan.shots.length, segment_count: segments.length };
}

function validateAssetReferences(plan, assets) {
  const registry = new Map(assets.map((asset) => [asset.id, asset]));
  for (const shot of plan.shots) {
    const environment = registry.get(shot.environment);
    if (!environment || environment.type !== 'environment') {
      throw new StoryDirectorError(shot.id + ' references unavailable environment asset ' + shot.environment + '.');
    }
    for (const character of shot.characters) {
      const asset = registry.get(character.asset);
      if (!asset || asset.type !== 'character') {
        throw new StoryDirectorError(shot.id + ' references unavailable character asset ' + character.asset + '.');
      }
      if (character.animation && !(asset.animations ?? []).includes(character.animation)) {
        throw new StoryDirectorError(shot.id + ' requests unsupported animation ' + character.animation + ' on ' + character.asset + '.');
      }
      if (character.expression && !(asset.expressions ?? []).includes(character.expression)) {
        throw new StoryDirectorError(shot.id + ' requests unsupported expression ' + character.expression + ' on ' + character.asset + '.');
      }
    }
    for (const propId of shot.props) {
      const prop = registry.get(propId);
      if (!prop || prop.type !== 'prop') throw new StoryDirectorError(shot.id + ' references unavailable prop asset ' + propId + '.');
    }
  }
}

export function validateStoryPlan(root, plan, transcript, assets = null) {
  const schema = readJson(path.join(root, 'schemas', 'story-plan.schema.json'));
  const validate = new Ajv({ allErrors: true }).compile(schema);
  if (!validate(plan)) {
    const details = validate.errors.map((error) => (error.instancePath || '/') + ' ' + error.message).join('; ');
    throw new StoryDirectorError('Story plan schema validation failed: ' + details);
  }
  const coverage = validateCoverage(plan, transcript);
  if (assets) validateAssetReferences(plan, assets);
  return coverage;
}

function loadAssets(root) {
  const assets = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'metadata.json') assets.push(readJson(full));
    }
  };
  walk(path.join(root, 'assets'));
  const ids = new Set();
  for (const asset of assets) {
    if (!asset.id || ids.has(asset.id)) throw new StoryDirectorError('Asset registry contains a missing or duplicate asset id: ' + (asset.id || '(empty)'));
    ids.add(asset.id);
  }
  return assets;
}

export function validateStoryFile({ root, project, transcriptPath, planPath }) {
  const projectDir = path.resolve(root, 'projects', project);
  if (!project || !projectDir.startsWith(path.resolve(root, 'projects') + path.sep)) {
    throw new StoryDirectorError('Project must be a directory name inside projects/.');
  }
  const transcriptFile = path.resolve(transcriptPath || path.join(projectDir, 'analysis', 'transcript.json'));
  const planFile = path.resolve(planPath || path.join(projectDir, 'story', 'shot-plan.json'));
  if (!fs.existsSync(transcriptFile)) throw new StoryDirectorError('Transcript not found: ' + transcriptFile);
  if (!fs.existsSync(planFile)) throw new StoryDirectorError('Story plan not found: ' + planFile);
  const transcript = readJson(transcriptFile);
  const plan = readJson(planFile);
  const validation = validateStoryPlan(root, plan, transcript, loadAssets(root));
  return { ...validation, duration_seconds: plan.duration_seconds, planFile };
}
