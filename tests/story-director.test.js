import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateStoryPlan,
  validateTranscript
} from '../packages/story/src/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const transcript = {
  duration_seconds: 6,
  transcription: { segments: [
    { id: 'segment_001', text: 'You wake up.', start: 0, end: 2 },
    { id: 'segment_002', text: 'The room is different.', start: 2.2, end: 4 },
    { id: 'segment_003', text: 'Everything has changed.', start: 4.2, end: 5.8 }
  ] }
};
const plan = {
  schema_version: 1,
  project: 'test',
  duration_seconds: 6,
  premise: 'A familiar morning becomes strange.',
  audience_promise: 'A clear visual escalation.',
  visual_motifs: ['repeating clock'],
  emotional_arc: ['curiosity', 'unease', 'wonder'],
  continuity_rules: ['Keep the protagonist screen-left.'],
  ending_image: 'The protagonist faces the changed room.',
  beats: [
    { id: 'beat_001', title: 'The wake-up', purpose: 'Establish normality.', start_seconds: 0, end_seconds: 2, narration_segment_ids: ['segment_001'], visual_concept: 'A calm bedroom.', character_direction: 'Slow, sleepy movement.' },
    { id: 'beat_002', title: 'The shift', purpose: 'Reveal the change.', start_seconds: 2.2, end_seconds: 5.8, narration_segment_ids: ['segment_002', 'segment_003'], visual_concept: 'The room subtly transforms.', character_direction: 'Confusion turns to wonder.' }
  ],
  shots: [
    { id: 'shot_001', beat_id: 'beat_001', start_seconds: 0, end_seconds: 2, narration_segment_ids: ['segment_001'], story_beat: 'Wake in a familiar bedroom.', environment: 'living_room', characters: [], props: [], camera: { type: 'wide', movement: 'static', focal_length_mm: null, angle: null }, lighting: 'soft_morning', composition: { foreground: 'bed edge', midground: 'empty room', background: 'window' }, transition_in: 'cut', transition_out: 'cut', continuity_notes: [] },
    { id: 'shot_002', beat_id: 'beat_002', start_seconds: 2.2, end_seconds: 5.8, narration_segment_ids: ['segment_002', 'segment_003'], story_beat: 'Reveal the changed room.', environment: 'living_room', characters: [], props: [], camera: { type: 'close_up', movement: 'dolly_in', focal_length_mm: null, angle: null }, lighting: 'cool_shift', composition: { foreground: 'clock', midground: 'protagonist', background: 'warped room' }, transition_in: 'cut', transition_out: 'fade', continuity_notes: ['Keep clock position consistent.'] }
  ]
};

test('validates transcript timing and rejects duplicate or invalid segments', () => {
  assert.equal(validateTranscript(transcript).segments.length, 3);
  assert.throws(() => validateTranscript({ ...transcript, transcription: { segments: [transcript.transcription.segments[0], transcript.transcription.segments[0]] } }), /Duplicate/);
  assert.throws(() => validateTranscript({ duration_seconds: 2, transcription: { segments: [] } }), /timed/);
});

test('validates schema, complete narration coverage, and shot-to-beat references', () => {
  assert.deepEqual(validateStoryPlan(ROOT, plan, transcript), { beat_count: 2, shot_count: 2, segment_count: 3 });
  const missing = structuredClone(plan);
  missing.beats[1].narration_segment_ids = ['segment_003'];
  assert.throws(() => validateStoryPlan(ROOT, missing, transcript), /exactly one story beat/);
  const badShot = structuredClone(plan);
  badShot.shots[1].beat_id = 'beat_999';
  assert.throws(() => validateStoryPlan(ROOT, badShot, transcript), /unknown beat/);
});

test('rejects shots outside their parent beat and overlapping shots', () => {
  const outside = structuredClone(plan);
  outside.shots[0].end_seconds = 2.5;
  assert.throws(() => validateStoryPlan(ROOT, outside, transcript), /outside its parent beat/);
  const overlap = structuredClone(plan);
  overlap.shots[1].start_seconds = 1.9;
  assert.throws(() => validateStoryPlan(ROOT, overlap, transcript), /overlap/);
});

test('rejects generated plans that reference missing or unsupported assets', () => {
  const assets = [
    { id: 'living_room', type: 'environment' },
    { id: 'protagonist', type: 'character', animations: ['idle'], expressions: ['curious'] }
  ];
  const valid = structuredClone(plan);
  valid.shots[0].characters = [{ asset: 'protagonist', action: 'look around', expression: 'curious', animation: 'idle', position: null, rotation_z: null }];
  assert.equal(validateStoryPlan(ROOT, valid, transcript, assets).shot_count, 2);
  const invalid = structuredClone(valid);
  invalid.shots[0].characters[0].animation = 'flying';
  assert.throws(() => validateStoryPlan(ROOT, invalid, transcript, assets), /unsupported animation/);
  const missing = structuredClone(plan);
  missing.shots[0].environment = 'unknown_room';
  assert.throws(() => validateStoryPlan(ROOT, missing, transcript, assets), /unavailable environment/);
});
