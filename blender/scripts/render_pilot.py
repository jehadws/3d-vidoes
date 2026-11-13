"""Render a project's shot specs with Blender and mux the original voiceover.

Run from the repository root:
  python blender/scripts/render_pilot.py --project pilot-video --audio path/to/voiceover.wav
  python blender/scripts/render_pilot.py --project pilot-video --audio path/to/voiceover.wav --quality final

Requires local Blender, FFmpeg, and FFprobe. No network services are used.
"""
import argparse
import json
import math
import re
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BLENDER_SCRIPT = ROOT / "blender" / "scripts" / "vertical_slice.py"


class PipelineError(RuntimeError):
    pass


def executable(value, fallback):
    found = shutil.which(value or fallback)
    if not found:
        raise PipelineError(f"Required local executable not found: {value or fallback}")
    return found


def run(command):
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        detail = (result.stderr or result.stdout).strip()
        raise PipelineError(f"Command failed ({result.returncode}): {' '.join(map(str, command))}\n{detail[-5000:]}")
    return result.stdout


def probe_media(ffprobe, file_path):
    output = run([
        ffprobe, "-v", "error", "-show_entries",
        "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate",
        "-of", "json", str(file_path)
    ])
    try:
        return json.loads(output)
    except json.JSONDecodeError as error:
        raise PipelineError(f"FFprobe returned invalid JSON for {file_path}: {error}") from error


def read_shots(project_dir):
    shots_dir = project_dir / "shots"
    files = sorted(shots_dir.glob("*.json")) if shots_dir.exists() else []
    if not files:
        raise PipelineError(f"No renderer shot specs found in {shots_dir}. Convert the approved story shot plan into projects/<project>/shots/*.json first.")
    shots = []
    for file_path in files:
        try:
            shot = json.loads(file_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise PipelineError(f"Cannot read shot spec {file_path}: {error}") from error
        if not isinstance(shot, dict):
            raise PipelineError(f"{file_path}: shot must be a JSON object.")
        if not isinstance(shot.get("id"), str) or not re.fullmatch(r"shot_\d{3,}", shot["id"]):
            raise PipelineError(f"{file_path}: id must match shot_ followed by at least three digits.")
        duration = shot.get("duration")
        if not isinstance(duration, (int, float)) or not math.isfinite(duration) or duration <= 0:
            raise PipelineError(f"{file_path}: duration must be a finite number greater than zero.")
        if shot.get("environment") not in {"city_street", "interior_room", "living_room"}:
            raise PipelineError(f"{file_path}: vertical-slice environment must be city_street, interior_room, or living_room.")
        camera = shot.get("camera")
        if not isinstance(camera, dict) or camera.get("type") not in {
            "wide", "medium", "close_up", "extreme_close_up", "over_shoulder", "top_down"
        }:
            raise PipelineError(f"{file_path}: camera.type is missing or unsupported.")
        if camera.get("movement", "static") not in {"static", "pan", "tilt", "tracking", "dolly_in", "dolly_out", "orbit"}:
            raise PipelineError(f"{file_path}: camera.movement is unsupported.")
        characters = shot.get("characters")
        if not isinstance(characters, list) or len(characters) != 1 or not isinstance(characters[0], dict) or characters[0].get("asset") != "protagonist":
            raise PipelineError(f"{file_path}: this vertical slice currently requires exactly one protagonist character.")
        character = characters[0]
        if character.get("animation", "idle") not in {"idle", "walking", "running", "talking", "reacting", "pointing"}:
            raise PipelineError(f"{file_path}: unsupported protagonist animation.")
        if character.get("expression", "neutral") not in {"neutral", "curious", "happy", "surprised"}:
            raise PipelineError(f"{file_path}: unsupported protagonist expression.")
        props = shot.get("props", [])
        if not isinstance(props, list) or any(prop != "mystery_orb" for prop in props):
            raise PipelineError(f"{file_path}: this vertical slice currently supports only the mystery_orb prop.")
        shots.append((file_path, shot))
    ids = [shot["id"] for _, shot in shots]
    if len(ids) != len(set(ids)):
        raise PipelineError("Shot IDs must be unique.")
    return shots


def parse_args():
    parser = argparse.ArgumentParser(description="Render a short 3D pilot from shot specs and the original voiceover.")
    parser.add_argument("--project", required=True, help="Project directory name under projects/")
    parser.add_argument("--audio", required=True, help="Original voiceover audio file")
    parser.add_argument("--quality", choices=("preview", "final"), default="preview")
    parser.add_argument("--blender", default=os.environ.get("BLENDER", "blender"))
    parser.add_argument("--ffmpeg", default=os.environ.get("FFMPEG", "ffmpeg"))
    parser.add_argument("--ffprobe", default=os.environ.get("FFPROBE", "ffprobe"))
    parser.add_argument("--output", help="Output MP4 path (defaults to projects/<project>/output/pilot.mp4)")
    parser.add_argument("--duration-tolerance", type=float, default=0.25)
    args = parser.parse_args()
    if args.duration_tolerance < 0:
        parser.error("--duration-tolerance must be non-negative")
    return args


def main():
    args = parse_args()
    project_dir = (ROOT / "projects" / args.project).resolve()
    if not project_dir.is_relative_to((ROOT / "projects").resolve()):
        raise PipelineError("--project must name a directory inside projects/.")
    config_file = project_dir / "project.json"
    audio_file = Path(args.audio).expanduser().resolve()
    if not config_file.is_file():
        raise PipelineError(f"Project config not found: {config_file}")
    if not audio_file.is_file():
        raise PipelineError(f"Voiceover audio not found: {audio_file}")
    if not BLENDER_SCRIPT.is_file():
        raise PipelineError(f"Blender shot renderer not found: {BLENDER_SCRIPT}")

    blender = executable(args.blender, "blender")
    ffmpeg = executable(args.ffmpeg, "ffmpeg")
    ffprobe = executable(args.ffprobe, "ffprobe")
    config = json.loads(config_file.read_text(encoding="utf-8"))
    fps = int(config.get("fps", 30))
    shots = read_shots(project_dir)
    audio_probe = probe_media(ffprobe, audio_file)
    audio_duration = float(audio_probe.get("format", {}).get("duration", 0))
    if audio_duration <= 0:
        raise PipelineError("FFprobe could not determine a positive voiceover duration.")
    planned_duration = sum(float(shot["duration"]) for _, shot in shots)
    if abs(planned_duration - audio_duration) > args.duration_tolerance:
        raise PipelineError(
            f"Shot plan totals {planned_duration:.3f}s but voiceover is {audio_duration:.3f}s. "
            "Adjust shot durations to cover the voiceover; the renderer will not stretch or cut narration."
        )

    render_dir = project_dir / "renders" / "shots"
    render_dir.mkdir(parents=True, exist_ok=True)
    rendered = []
    for shot_file, shot in shots:
        shot_output = render_dir / f"{shot['id']}.mp4"
        shot_output.unlink(missing_ok=True)
        command = [
            blender, "-b", "-P", str(BLENDER_SCRIPT), "--",
            "--shot", str(shot_file), "--project", str(config_file),
            "--out", str(shot_output), "--quality", args.quality
        ]
        print(f"[render] {shot['id']} ({shot['duration']:.2f}s)")
        run(command)
        if not shot_output.is_file() or shot_output.stat().st_size == 0:
            raise PipelineError(f"Blender reported success but did not produce {shot_output}")
        rendered.append(shot_output)

    concat_file = render_dir / "concat.txt"
    concat_file.write_text(
        "".join("file '" + str(path.resolve()).replace("'", "'\\''") + "'\n" for path in rendered),
        encoding="utf-8"
    )
    output = Path(args.output).expanduser().resolve() if args.output else project_dir / "output" / "pilot.mp4"
    output.parent.mkdir(parents=True, exist_ok=True)
    run([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-i", str(audio_file), "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "libx264", "-preset", "medium" if args.quality == "final" else "veryfast",
        "-crf", "18" if args.quality == "final" else "25", "-pix_fmt", "yuv420p",
        "-r", str(fps), "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-movflags", "+faststart", str(output)
    ])

    final_probe = probe_media(ffprobe, output)
    streams = final_probe.get("streams", [])
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    audio = next((stream for stream in streams if stream.get("codec_type") == "audio"), None)
    final_duration = float(final_probe.get("format", {}).get("duration", 0))
    if not video or not audio:
        raise PipelineError("Final MP4 is missing a video or audio stream.")
    expected_resolution = config.get("resolution", {"width": 1920, "height": 1080})
    if video.get("width") != int(expected_resolution["width"]) or video.get("height") != int(expected_resolution["height"]):
        raise PipelineError(f"Final resolution {video.get('width')}x{video.get('height')} does not match project settings.")
    if abs(final_duration - audio_duration) > max(args.duration_tolerance, 1.0 / fps):
        raise PipelineError(
            f"Final duration {final_duration:.3f}s differs from voiceover {audio_duration:.3f}s."
        )

    qa_dir = project_dir / "qa"
    qa_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "status": "technical_pass",
        "quality": args.quality,
        "output": str(output),
        "duration_seconds": final_duration,
        "voiceover_duration_seconds": audio_duration,
        "fps": fps,
        "resolution": {"width": video.get("width"), "height": video.get("height")},
        "video_codec": video.get("codec_name"),
        "audio_codec": audio.get("codec_name"),
        "shots": [{"id": shot["id"], "duration_seconds": shot["duration"], "render": str(path)} for (_, shot), path in zip(shots, rendered)],
        "visual_review": "not_performed",
        "note": "Technical validation only. Review shot motion and the complete video before approval."
    }
    (qa_dir / "vertical-slice-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    try:
        main()
    except PipelineError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
