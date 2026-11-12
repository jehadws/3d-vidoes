import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class AudioAnalysisError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'AudioAnalysisError';
  }
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: options.env ?? process.env
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', (error) => reject(new AudioAnalysisError(
      `Could not start "${command}": ${error.message}`, { cause: error }
    )));
    child.once('close', (code) => {
      if (code !== 0) {
        reject(new AudioAnalysisError(
          `"${command}" exited with code ${code}. ${stderr.trim() || stdout.trim()}`
        ));
        return;
      }
      resolve({ stdout, stderr, code });
    });
  });
}

function parseTimestamp(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  const normalized = value.replace(',', '.');
  const parts = normalized.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(normalized);
}

function normalizeWhisperSegment(segment, index) {
  const start = Number.isFinite(segment.start)
    ? segment.start
    : Number.isFinite(segment.offsets?.from)
      ? segment.offsets.from / 1000
      : parseTimestamp(segment.timestamps?.from);
  const end = Number.isFinite(segment.end)
    ? segment.end
    : Number.isFinite(segment.offsets?.to)
      ? segment.offsets.to / 1000
      : parseTimestamp(segment.timestamps?.to);
  const text = String(segment.text ?? '').trim();
  if (!text || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return {
    id: `segment_${String(index + 1).padStart(3, '0')}`,
    text,
    start: roundTime(start),
    end: roundTime(end),
    confidence: Number.isFinite(segment.confidence) ? segment.confidence : null,
    alignment: 'phrase'
  };
}

export function roundTime(value) {
  return Math.round(value * 1000) / 1000;
}

export function parseWhisperJson(payload) {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const source = Array.isArray(data) ? data : data.transcription ?? data.segments ?? data.results;
  if (!Array.isArray(source)) {
    throw new AudioAnalysisError('Whisper JSON did not contain a transcription/segments array.');
  }
  const segments = source
    .map(normalizeWhisperSegment)
    .filter(Boolean)
    .sort((a, b) => a.start - b.start)
    .map((segment, index) => ({ ...segment, id: `segment_${String(index + 1).padStart(3, '0')}` }));
  if (!segments.length) throw new AudioAnalysisError('Transcription completed but returned no timed speech segments.');
  return segments;
}

export function detectPauses(segments, minimumDuration = 0.25) {
  const pauses = [];
  for (let i = 1; i < segments.length; i++) {
    const start = segments[i - 1].end;
    const end = segments[i].start;
    const duration = roundTime(end - start);
    if (duration >= minimumDuration) {
      pauses.push({ start: roundTime(start), end: roundTime(end), duration });
    }
  }
  return pauses;
}

export function tokenize(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}']+/gu) ?? [];
}

function lcsPairs(left, right) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const dp = Array.from({ length: rows }, () => new Uint32Array(cols));
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      dp[i][j] = left[i] === right[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

export function compareScriptToTranscript(script, segments) {
  const scriptTokens = tokenize(script);
  const transcriptTokens = tokenize(segments.map((segment) => segment.text).join(' '));
  if (!scriptTokens.length) {
    return {
      status: 'no_script',
      similarity: null,
      script_token_count: 0,
      transcript_token_count: transcriptTokens.length,
      missing_script_tokens: [],
      added_transcript_tokens: []
    };
  }
  const pairs = lcsPairs(scriptTokens, transcriptTokens);
  const matchedScript = new Set(pairs.map(([i]) => i));
  const matchedTranscript = new Set(pairs.map(([, j]) => j));
  const similarity = roundTime((2 * pairs.length) / (scriptTokens.length + transcriptTokens.length || 1));
  const missing = scriptTokens.filter((_, i) => !matchedScript.has(i));
  const added = transcriptTokens.filter((_, i) => !matchedTranscript.has(i));
  let status = 'differs';
  if (missing.length === 0 && added.length === 0) status = 'exact';
  else if (similarity >= 0.92) status = 'near_match';
  else if (similarity < 0.45) status = 'review_required';
  return {
    status,
    similarity,
    script_token_count: scriptTokens.length,
    transcript_token_count: transcriptTokens.length,
    missing_script_tokens: missing,
    added_transcript_tokens: added
  };
}

function parseProbe(stdout) {
  let data;
  try { data = JSON.parse(stdout); }
  catch (error) { throw new AudioAnalysisError('ffprobe returned invalid JSON.', { cause: error }); }
  const audio = (data.streams ?? []).find((stream) => stream.codec_type === 'audio');
  const duration = Number(data.format?.duration);
  if (!audio || !Number.isFinite(duration) || duration <= 0) {
    throw new AudioAnalysisError('The input has no readable audio stream or a valid duration.');
  }
  return {
    duration_seconds: roundTime(duration),
    format: data.format?.format_name ?? null,
    codec: audio.codec_name ?? null,
    sample_rate: audio.sample_rate ? Number(audio.sample_rate) : null,
    channels: audio.channels ?? null,
    channel_layout: audio.channel_layout ?? null,
    bits_per_sample: audio.bits_per_sample || audio.bits_per_raw_sample
      ? Number(audio.bits_per_sample || audio.bits_per_raw_sample)
      : null
  };
}

async function assertReadableFile(filePath, label) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size === 0) throw new Error('not a non-empty file');
  } catch (error) {
    throw new AudioAnalysisError(`${label} not found or unreadable: ${filePath}`, { cause: error });
  }
}

export async function analyzeAudio({
  audioPath,
  scriptPath,
  outputPath,
  modelPath = process.env.WHISPER_MODEL,
  whisperCli = process.env.WHISPER_CLI || 'whisper-cli',
  ffprobe = process.env.FFPROBE || 'ffprobe',
  language = 'auto',
  minimumPauseSeconds = 0.25,
  run = runCommand
}) {
  if (!audioPath || !outputPath) throw new AudioAnalysisError('audioPath and outputPath are required.');
  const audio = path.resolve(audioPath);
  const output = path.resolve(outputPath);
  await assertReadableFile(audio, 'Audio file');
  if (scriptPath) await assertReadableFile(path.resolve(scriptPath), 'Script file');
  if (!modelPath) {
    throw new AudioAnalysisError('A Whisper.cpp model is required. Set WHISPER_MODEL or pass --model.');
  }
  await assertReadableFile(path.resolve(modelPath), 'Whisper model');

  const probeResult = await run(ffprobe, [
    '-v', 'error',
    '-show_entries', 'format=duration,format_name:stream=codec_type,codec_name,sample_rate,channels,channel_layout,bits_per_sample,bits_per_raw_sample',
    '-of', 'json',
    audio
  ]);
  const metadata = parseProbe(probeResult.stdout);

  const analysisDir = path.dirname(output);
  await fs.mkdir(analysisDir, { recursive: true });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'd3-audio-'));
  const whisperPrefix = path.join(tempDir, 'transcription');
  const whisperJson = `${whisperPrefix}.json`;
  try {
    const args = ['-m', path.resolve(modelPath), '-f', audio, '-oj', '-of', whisperPrefix, '-l', language];
    await run(whisperCli, args);
    const whisperPayload = await fs.readFile(whisperJson, 'utf8');
    const segments = parseWhisperJson(whisperPayload);
    const script = scriptPath ? await fs.readFile(path.resolve(scriptPath), 'utf8') : '';
    const transcriptText = segments.map((segment) => segment.text).join(' ');
    const document = {
      schema_version: 1,
      source: path.relative(path.dirname(output), audio).replaceAll(path.sep, '/'),
      analyzed_at: new Date().toISOString(),
      ...metadata,
      transcription: {
        provider: 'whisper.cpp',
        model: path.basename(modelPath),
        language,
        alignment: 'phrase',
        segments,
        text: transcriptText
      },
      pauses: detectPauses(segments, minimumPauseSeconds),
      script_comparison: compareScriptToTranscript(script, segments)
    };
    await fs.writeFile(output, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    return document;
  } catch (error) {
    if (error instanceof AudioAnalysisError) throw error;
    throw new AudioAnalysisError(`Audio analysis failed: ${error.message}`, { cause: error });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
