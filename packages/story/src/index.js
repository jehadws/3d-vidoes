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
      shotSegmentIds.add(id);
    }
    shotsByBeat.get(shot.beat_id).push(shot);
  }
  for (const [beatId, shots] of shotsByBeat) {
    if (!shots.length) throw new StoryDirectorError(beatId + ' has no visual shots.');
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

export function buildDirectorPrompt({ project, script, transcript, assets }) {
  const { duration, segments } = validateTranscript(transcript);
  const assetSummary = assets.map((asset) => ({
    id: asset.id,
    type: asset.type,
    name: asset.name,
    status: asset.status,
    expressions: asset.expressions ?? [],
    animations: asset.animations ?? []
  }));
  return [
    'You are the story director for an original stylized 3D animated narrated video.',
    'Create a coherent cinematic story plan, not a sentence-by-sentence illustration.',
    'Treat the timed transcript as the authoritative spoken timeline. Do not rewrite narration or invent spoken words.',
    'Group all transcript segments into meaningful dramatic beats. Every segment must appear in exactly one beat.',
    'Create a varied shot sequence. Every shot belongs to one beat, uses only available environment/character/prop asset IDs, and stays inside its beat time range.',
    'Use registered character expressions and animations when supplied. If an action is not supported by an animation, describe it in story_beat or character action without inventing an asset clip.',
    'Use camera choices with motivated variety; avoid repetitive medium shots and unmotivated movement.',
    'Preserve spatial direction, character identity, prop state, scale, and lighting continuity.',
    'Do not copy any existing creator, franchise, character, or scene. Keep concepts original and producible with the listed assets.',
    'Return only JSON matching the supplied schema. No markdown fences or commentary.',
    'Project: ' + project,
    'Audio duration seconds: ' + duration,
    'SCRIPT:\n' + script,
    'TIMED TRANSCRIPT:\n' + JSON.stringify(segments),
    'SCRIPT ALIGNMENT REPORT:\n' + JSON.stringify(transcript.script_comparison ?? null),
    'AVAILABLE ASSETS:\n' + JSON.stringify(assetSummary),
    'Planning rules: use shot boundaries that follow phrase meaning and pauses; cover the complete spoken timeline from first segment to last; short intentional visual holds are allowed inside beats; no unexplained timeline gaps or overlaps.'
  ].join('\n\n');
}

function toStructuredOutputSchema(schema) {
  const unsupported = new Set(['$schema', '$id', 'title', 'description', 'minLength', 'maxLength', 'minItems', 'maxItems', 'exclusiveMinimum', 'exclusiveMaximum', 'pattern']);
  const clean = (value) => {
    if (Array.isArray(value)) return value.map(clean);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (unsupported.has(key)) continue;
      if (key === 'const') out.enum = [child];
      else out[key] = clean(child);
    }
    return out;
  };
  return clean(schema);
}

export async function requestStoryPlan({ prompt, schema, apiUrl, apiKey, model, fetchImpl = fetch, timeoutMs = 120000 }) {
  if (!apiKey) throw new StoryDirectorError('Missing STORY_DIRECTOR_API_KEY. Configure an API key before running AI story direction.');
  if (!model) throw new StoryDirectorError('Missing STORY_DIRECTOR_MODEL. Configure the model name before running AI story direction.');
  const endpoint = (apiUrl || 'https://api.openai.com/v1/chat/completions').replace(/\/+$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'd3_video_story_plan', strict: true, schema: toStructuredOutputSchema(schema) }
        },
        messages: [
          { role: 'system', content: 'You are a precise, production-minded animation story director. Follow the requested JSON schema exactly.' },
          { role: 'user', content: prompt }
        ]
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error?.message || response.statusText || 'Unknown provider error';
      throw new StoryDirectorError('Story director provider returned HTTP ' + response.status + ': ' + String(message).slice(0, 1000));
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new StoryDirectorError('Story director provider returned no JSON message content.');
    try { return JSON.parse(content); }
    catch (error) { throw new StoryDirectorError('Story director returned invalid JSON.', { cause: error }); }
  } catch (error) {
    if (error instanceof StoryDirectorError) throw error;
    if (error.name === 'AbortError') throw new StoryDirectorError('Story director request timed out after ' + timeoutMs + ' ms.', { cause: error });
    throw new StoryDirectorError('Story director request failed: ' + error.message, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

export async function directStory({ root, project, transcriptPath, scriptPath, outputPath, apiUrl, apiKey, model, fetchImpl }) {
  const projectDir = path.resolve(root, 'projects', project);
  if (!project || !projectDir.startsWith(path.resolve(root, 'projects') + path.sep)) {
    throw new StoryDirectorError('Project must be a directory name inside projects/.');
  }
  const transcriptFile = path.resolve(transcriptPath || path.join(projectDir, 'analysis', 'transcript.json'));
  const scriptFile = path.resolve(scriptPath || path.join(projectDir, 'script', 'script.md'));
  const outputFile = path.resolve(outputPath || path.join(projectDir, 'story', 'shot-plan.json'));
  if (!fs.existsSync(transcriptFile)) throw new StoryDirectorError('Transcript not found: ' + transcriptFile);
  if (!fs.existsSync(scriptFile)) throw new StoryDirectorError('Script not found: ' + scriptFile);
  const transcript = readJson(transcriptFile);
  const script = fs.readFileSync(scriptFile, 'utf8');
  if (!script.trim()) throw new StoryDirectorError('Script file is empty.');
  const assetsRoot = path.join(root, 'assets');
  const assets = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'metadata.json') {
        const metadata = readJson(full);
        assets.push(metadata);
      }
    }
  };
  walk(assetsRoot);
  const schema = readJson(path.join(root, 'schemas', 'story-plan.schema.json'));
  const prompt = buildDirectorPrompt({ project, script, transcript, assets });
  const plan = await requestStoryPlan({
    prompt, schema, apiUrl, apiKey, model, fetchImpl
  });
  plan.schema_version = 1;
  plan.project = project;
  plan.duration_seconds = round(transcript.duration_seconds);
  const validation = validateStoryPlan(root, plan, transcript, assets);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  const tempFile = outputFile + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(plan, null, 2) + '\n', 'utf8');
  fs.renameSync(tempFile, outputFile);
  return { outputFile, ...validation, duration_seconds: plan.duration_seconds };
}
