import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  analyzeAudio,
  compareScriptToTranscript,
  detectPauses,
  parseWhisperJson,
  tokenize
} from '../packages/audio-analysis/src/index.js';

test('parses Whisper.cpp JSON timestamp offsets into normalized phrase segments', () => {
  const segments = parseWhisperJson({
    transcription: [
      { offsets: { from: 420, to: 2150 }, text: ' You wake up. ' },
      { offsets: { from: 2700, to: 3900 }, text: 'A new day.' }
    ]
  });
  assert.deepEqual(segments.map(({ start, end, text, alignment }) => ({ start, end, text, alignment })), [
    { start: 0.42, end: 2.15, text: 'You wake up.', alignment: 'phrase' },
    { start: 2.7, end: 3.9, text: 'A new day.', alignment: 'phrase' }
  ]);
});

test('supports Whisper timestamp strings and rejects invalid empty transcripts', () => {
  const segments = parseWhisperJson({
    segments: [{ timestamps: { from: '00:00:01,200', to: '00:00:02,000' }, text: 'Hello there.' }]
  });
  assert.equal(segments[0].start, 1.2);
  assert.throws(() => parseWhisperJson({ transcription: [] }), /no timed speech segments/);
});

test('detects pauses from gaps between timed phrases', () => {
  const segments = [
    { start: 0, end: 1.1 },
    { start: 1.4, end: 2.0 },
    { start: 3.2, end: 4.0 }
  ];
  assert.deepEqual(detectPauses(segments, 0.25), [
    { start: 1.1, end: 1.4, duration: 0.3 },
    { start: 2, end: 3.2, duration: 1.2 }
  ]);
});

test('compares script and transcript while tolerating punctuation and casing', () => {
  const result = compareScriptToTranscript('You wake up, one morning!', [
    { text: 'you wake up one morning' }
  ]);
  assert.equal(result.status, 'exact');
  assert.equal(result.similarity, 1);
  assert.deepEqual(tokenize('Hello, WORLD!'), ['hello', 'world']);
});

test('reports omitted and added transcript words instead of silently treating them as aligned', () => {
  const result = compareScriptToTranscript('You wake up in the morning', [
    { text: 'You wake up early this morning' }
  ]);
  assert.equal(result.status, 'differs');
  assert.deepEqual(result.missing_script_tokens, ['in', 'the']);
  assert.deepEqual(result.added_transcript_tokens, ['early', 'this']);
});

test('analyzeAudio writes metadata, timed transcript, pauses, and script comparison', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'd3-audio-test-'));
  const audioPath = path.join(temp, 'voice.wav');
  const scriptPath = path.join(temp, 'script.md');
  const modelPath = path.join(temp, 'model.bin');
  const outputPath = path.join(temp, 'analysis', 'transcript.json');
  await Promise.all([
    fs.writeFile(audioPath, 'fake audio'),
    fs.writeFile(scriptPath, 'Hello there. How are you?'),
    fs.writeFile(modelPath, 'fake model')
  ]);
  const run = async (command, args) => {
    if (command === 'ffprobe') {
      return { stdout: JSON.stringify({
        format: { duration: '3.5', format_name: 'wav' },
        streams: [{ codec_type: 'audio', codec_name: 'pcm_s16le', sample_rate: '48000', channels: 1 }]
      }) };
    }
    assert.equal(command, 'whisper-cli');
    const outputPrefix = args[args.indexOf('-of') + 1];
    await fs.writeFile(`${outputPrefix}.json`, JSON.stringify({
      transcription: [
        { offsets: { from: 100, to: 900 }, text: 'Hello there.' },
        { offsets: { from: 1500, to: 2500 }, text: 'How are you?' }
      ]
    }));
    return { stdout: '', stderr: '' };
  };
  const result = await analyzeAudio({
    audioPath, scriptPath, outputPath, modelPath, whisperCli: 'whisper-cli', ffprobe: 'ffprobe', run
  });
  const persisted = JSON.parse(await fs.readFile(outputPath, 'utf8'));
  assert.equal(result.duration_seconds, 3.5);
  assert.equal(result.sample_rate, 48000);
  assert.equal(result.transcription.segments.length, 2);
  assert.equal(result.pauses[0].duration, 0.6);
  assert.equal(result.script_comparison.status, 'exact');
  assert.equal(persisted.transcription.text, 'Hello there. How are you?');
  await fs.rm(temp, { recursive: true, force: true });
});
