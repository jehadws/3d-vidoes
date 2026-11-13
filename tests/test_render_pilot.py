import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "blender" / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import render_pilot


class RenderPilotTests(unittest.TestCase):
    def make_project(self, root, shots):
        project = root / "pilot"
        (project / "shots").mkdir(parents=True)
        for name, shot in shots:
            (project / "shots" / name).write_text(json.dumps(shot), encoding="utf-8")
        return project

    def test_reads_shots_in_deterministic_order(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(Path(temp), [
                ("shot_002.json", {"id": "shot_002", "duration": 3, "environment": "city_street", "characters": [{"asset": "protagonist", "animation": "walking", "expression": "curious"}], "camera": {"type": "close_up"}}),
                ("shot_001.json", {"id": "shot_001", "duration": 2, "environment": "interior_room", "characters": [{"asset": "protagonist"}], "camera": {"type": "wide"}}),
            ])
            shots = render_pilot.read_shots(project)
            self.assertEqual([shot["id"] for _, shot in shots], ["shot_001", "shot_002"])

    def test_rejects_missing_shots(self):
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / "pilot"
            project.mkdir()
            with self.assertRaisesRegex(render_pilot.PipelineError, "No renderer shot specs"):
                render_pilot.read_shots(project)

    def test_rejects_invalid_duration_and_camera(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(Path(temp), [
                ("shot_001.json", {"id": "shot_001", "duration": 0, "environment": "interior_room", "characters": [{"asset": "protagonist"}], "camera": {"type": "wide"}}),
            ])
            with self.assertRaisesRegex(render_pilot.PipelineError, "duration"):
                render_pilot.read_shots(project)
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(Path(temp), [
                ("shot_001.json", {"id": "shot_001", "duration": 2, "environment": "interior_room", "characters": [{"asset": "protagonist"}], "camera": {"type": "invalid"}}),
            ])
            with self.assertRaisesRegex(render_pilot.PipelineError, "camera.type"):
                render_pilot.read_shots(project)

    def test_rejects_duplicate_shot_ids(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(Path(temp), [
                ("a.json", {"id": "shot_001", "duration": 2, "environment": "interior_room", "characters": [{"asset": "protagonist"}], "camera": {"type": "wide"}}),
                ("b.json", {"id": "shot_001", "duration": 2, "environment": "interior_room", "characters": [{"asset": "protagonist"}], "camera": {"type": "wide"}}),
            ])
            with self.assertRaisesRegex(render_pilot.PipelineError, "unique"):
                render_pilot.read_shots(project)

    def test_probes_duration_and_stream_metadata(self):
        payload = {"format": {"duration": "12.5"}, "streams": [{"codec_type": "video", "width": 1920}]}
        with patch.object(render_pilot, "run", return_value=json.dumps(payload)):
            result = render_pilot.probe_media("ffprobe", "sample.mp4")
        self.assertEqual(float(result["format"]["duration"]), 12.5)
        self.assertEqual(result["streams"][0]["width"], 1920)


if __name__ == "__main__":
    unittest.main()
