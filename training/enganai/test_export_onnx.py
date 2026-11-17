import copy
import shutil
import tempfile
import unittest
from pathlib import Path

import numpy as np

from common import ROOT, read_json, write_json
from export_onnx import TOLERANCE, discriminator_parity, generator_parity, validate_export

PUBLISHED = ROOT / "public/models/enganai/research/cpu-no-batchnorm-v1"


class ParityRules(unittest.TestCase):
    def test_generator_tolerance(self):
        expected = np.full((2, 1, 28, 28), 0.25, dtype=np.float32)
        self.assertTrue(generator_parity(expected, expected + TOLERANCE["generatorAbs"] / 2)["passed"])
        self.assertFalse(generator_parity(expected, expected + TOLERANCE["generatorAbs"] * 2)["passed"])
        broken = expected.copy()
        broken[0, 0, 0, 0] = np.nan
        self.assertFalse(generator_parity(expected, broken)["passed"])

    def test_discriminator_decision_changes_only_inside_band(self):
        self.assertTrue(discriminator_parity(np.array([[5e-5]]), np.array([[-4e-5]]))["passed"])
        self.assertFalse(discriminator_parity(np.array([[0.5]]), np.array([[-0.5]]))["passed"])
        self.assertFalse(discriminator_parity(np.array([[3.0]]), np.array([[3.01]]))["passed"])


@unittest.skipUnless((PUBLISHED / "onnx-export.json").exists(), "ONNX export not published")
class PublishedExport(unittest.TestCase):
    def test_published_export_is_consistent(self):
        validate_export(read_json(PUBLISHED / "onnx-export.json"), PUBLISHED)

    def test_rejects_tampering(self):
        record = read_json(PUBLISHED / "onnx-export.json")
        with self.subTest("failed parity"):
            changed = copy.deepcopy(record)
            changed["checkpoints"][0]["pythonParity"]["generatorFixedBatch"]["passed"] = False
            with self.assertRaises(ValueError):
                validate_export(changed, PUBLISHED)
        with self.subTest("weights not linked"):
            changed = copy.deepcopy(record)
            changed["checkpoints"][1]["generator"]["sourceWeightsSha256"] = "0" * 64
            with self.assertRaises(ValueError):
                validate_export(changed, PUBLISHED)
        with self.subTest("missing checkpoint"):
            changed = copy.deepcopy(record)
            changed["checkpoints"].pop(1)
            with self.assertRaises(ValueError):
                validate_export(changed, PUBLISHED)
        with self.subTest("ONNX bytes"), tempfile.TemporaryDirectory() as temporary:
            copy_root = Path(temporary) / "run"
            shutil.copytree(PUBLISHED, copy_root, ignore=shutil.ignore_patterns("*.pt", "split.json", "training-record-ids.json", "history.json"))
            target = copy_root / record["checkpoints"][2]["discriminator"]["asset"]["path"]
            data = bytearray(target.read_bytes())
            data[len(data) // 2] ^= 0xFF
            target.write_bytes(bytes(data))
            write_json(copy_root / "onnx-export.json", record)
            with self.assertRaises(ValueError):
                validate_export(record, copy_root)


if __name__ == "__main__":
    unittest.main()
