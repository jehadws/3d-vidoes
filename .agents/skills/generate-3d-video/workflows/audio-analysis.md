# Audio Analysis and Script Alignment

## Objective

Use the supplied voiceover as the timing source. The script supplies intended wording and structure; the audio determines actual delivery, pauses, emphasis, and total runtime.

## Inspect the source

Record:
- File path and format.
- Duration, sample rate, channel count, and bit depth when available.
- Peak and integrated loudness when supported.
- Whether the file contains one continuous narration track or multiple takes.

Never modify the source file. Create derived analysis files separately.

## Transcription and alignment

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
