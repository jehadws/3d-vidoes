# Audio analysis

The package probes source media with FFprobe and transcribes it with Whisper.cpp. It writes a normalized, phrase-timed transcript JSON document without modifying source audio or script files.

## Requirements

- Node.js 20+
- FFprobe available on PATH (or set `FFPROBE`)
- Whisper.cpp's `whisper-cli` available on PATH (or set `WHISPER_CLI`)
- A downloaded Whisper.cpp model (set `WHISPER_MODEL` or pass `--model`)

## CLI

```bash
npm run analyze-audio -- --project pilot-video --audio projects/pilot-video/audio/voiceover.wav --script projects/pilot-video/script/script.md --model models/ggml-base.en.bin
```

The output defaults to `projects/<project>/analysis/transcript.json`. Use `--language auto` for detection or pass a Whisper language code such as `en`. Paths are resolved from the current working directory. The original input files are never modified.

The result includes media metadata, timed phrase segments, detected gaps between transcript segments, and a token-level comparison against the supplied script. Timing is phrase-level, not word-level; confidence is null when the backend does not expose it. The comparison is a review aid, not a claim of semantic equivalence.
