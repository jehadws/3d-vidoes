# Audio Analysis and Script Alignment

## Objective

Use the supplied voiceover as the timing source. The script supplies intended wording and structure; the audio determines actual delivery, pauses, emphasis, and total runtime.

## Run the implemented analyzer

The repository now provides a Node.js CLI backed by FFprobe and Whisper.cpp:

```bash
npm run analyze-audio -- --project pilot-video \
  --audio projects/pilot-video/audio/voiceover.wav \
  --script projects/pilot-video/script/script.md \
  --model models/ggml-base.en.bin
```

Set `WHISPER_MODEL` to avoid passing `--model` each time. Set `WHISPER_CLI` or `FFPROBE` when the executables are not named `whisper-cli` and `ffprobe` on PATH. Use `--language auto` for language detection or a Whisper language code. The default output is `projects/<project>/analysis/transcript.json`; `--output` overrides it.

The analyzer currently emits phrase-level timestamps from Whisper.cpp JSON. It does not claim word-level alignment. Gaps between adjacent phrase segments are recorded as pauses; these are transcript timing gaps, not a separate waveform-based silence detector.

## Inspect the source

Record:
- File path and format.
- Duration, sample rate, channel count, and bit depth when available.
- Peak and integrated loudness when supported.
- Whether the file contains one continuous narration track or multiple takes.

Never modify the source file. Create derived analysis files separately.

## Transcription and alignment\n\nThe implemented provider is Whisper.cpp. It requires a model file supplied through `--model` or `WHISPER_MODEL`. The analyzer invokes FFprobe for source metadata, invokes `whisper-cli` for transcription, and writes the normalized JSON report. It never changes the original script or audio.\n

1. Prefer a local transcription/alignment tool already installed in the environment.
2. If unavailable, inspect available connected or agent-provided audio tools before selecting a fallback.
3. Transcribe the actual audio; do not assume the supplied script was read word-for-word.
4. Align transcript words or phrases to audio timestamps.
5. Compare the transcript with the supplied script and classify differences:
   - exact or near-exact
   - omitted text
   - added/improvised text
   - reordered text
   - uncertain recognition
6. Preserve uncertainty/confidence metadata. Do not fabricate word-level timing.
7. If only phrase-level timing is available, use phrase-level timing and say so.

Recommended normalized data shape:

```json
{
  "source": "audio/voiceover.wav",
  "duration_seconds": 42.8,
  "sample_rate": 48000,
  "channels": 2,
  "transcript": [
    {
      "text": "You wake up one morning.",
      "start": 0.42,
      "end": 2.15,
      "confidence": 0.96,
      "alignment": "phrase"
    }
  ],
  "pauses": [
    { "start": 2.15, "end": 2.62, "duration": 0.47 }
  ]
}
```

This is an example interchange format, not a replacement for an existing repository schema.

## Segment into beats

Group narration by changes in:
- Story action or new information.
- Emotional intention.
- Location or time.
- Character objective or reaction.
- Reveal, contrast, escalation, or payoff.
- Natural pause or emphasis.

Do not mechanically create one shot for every sentence or every transcript segment. A beat may span several sentences or split one long sentence into multiple visual moments.

## Timing rules

- Keep all timestamps in seconds until the render system converts them to frames.
- At 30 fps, frame index is derived from time multiplied by 30; use the configured project FPS if different.
- Use a consistent rounding policy to avoid accumulated timing drift.
- Preserve deliberate silent gaps.
- Do not time-stretch narration to fit a storyboard unless explicitly requested.
- Ensure the final visual timeline covers the full narration, including intentional opening/closing holds.
