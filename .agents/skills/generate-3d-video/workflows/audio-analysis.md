# Audio Analysis and Script Alignment

## Objective

The user provides the script and voiceover. Analyze the actual audio locally; the voiceover determines timing, pauses, emphasis, and total runtime. The script supplies intended wording and story context.

## Local tools only

Use FFprobe and Whisper.cpp already installed in the environment or installed through the repository's documented local setup. No hosted transcription API or third-party audio service is needed.

Run:

```bash
npm run analyze-audio -- --project <slug> --audio projects/<slug>/input/voiceover.wav --script projects/<slug>/input/script.md --model <local-whisper-model>
```

The model path is an environment dependency, not another user input. Prefer a suitable installed model; do not ask the user to choose one. If none exists, install/download a documented local model when possible. If that cannot be done, report the blocker rather than switching to a remote service.

The analyzer writes `analysis/transcript.json` with audio metadata, phrase-level timestamps, pauses, and script comparison. It does not modify source files.

## Inspect and compare

Record duration, sample rate, channel count, format, and loudness metrics when supported. Compare actual transcription against the supplied script and classify exact/near-exact passages, omissions, additions, reordered wording, and uncertain recognition.

Do not assume the script was read word-for-word. Do not invent word-level alignment when only phrase timestamps are available. Preserve uncertainty and timing gaps.

## Beat timing

- Use the configured project FPS to convert seconds to frames.
- Preserve deliberate pauses and opening/closing holds.
- Group narration by story action, emotional intention, location/time, reveal, escalation, and payoff.
- Never create a mechanical one-shot-per-sentence timeline.
- Never rewrite, reorder, time-stretch, or omit the voiceover.
- Cover the entire narration in the final visual timeline.
