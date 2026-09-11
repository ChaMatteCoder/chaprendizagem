"""Contract tests with synthetic data; no network and no claimed model metrics."""
import hashlib
import tempfile
import unittest
from pathlib import Path

import numpy as np

from common import check_dataset, classes, sha256, write_json
from evaluate_models import choose_model, metrics
from export_tfjs import export
from prepare_dataset import normalize, prepare, sample_unique


class PipelineTests(unittest.TestCase):
    def create_raw(self, root):
        raw = root / "raw"
        raw.mkdir()
        sources = {}
        rng = np.random.default_rng(7)
        for item in classes():
            path = raw / f'{item["id"]}.npy'
            np.save(path, rng.integers(0, 256, (40, 784), dtype=np.uint8))
            sources[item["id"]] = {"sha256": sha256(path)}
        write_json(raw / "sources.json", sources)
        return raw

    def test_split_reproducible_stratified_and_disjoint(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            raw = self.create_raw(root)
            first = prepare(root / "first", 20, 42, raw)
            second = prepare(root / "second", 20, 42, raw)
            self.assertEqual(first["selection"], second["selection"])
            self.assertEqual(first["npz_sha256"], second["npz_sha256"])
            self.assertEqual(first["split_counts"], {"train": [16] * len(classes()), "val": [2] * len(classes()), "test": [2] * len(classes())})
            with np.load(root / "first/dataset.npz") as data:
                fingerprints = [{hashlib.sha256(x.tobytes()).digest() for x in data[f"x_{split}"]}
                                for split in ("train", "val", "test")]
                self.assertEqual(len(set.union(*fingerprints)), 20 * len(classes()))
                self.assertTrue(fingerprints[0].isdisjoint(fingerprints[1]))
                self.assertTrue(fingerprints[0].isdisjoint(fingerprints[2]))
                self.assertTrue(fingerprints[1].isdisjoint(fingerprints[2]))
            self.assertEqual(check_dataset(root / "first")["seed"], 42)

    def test_blank_duplicate_and_insufficient_sources(self):
        data = np.array([[0] * 784, [1] * 784, [1] * 784, [2] * 784], dtype=np.uint8)
        seen = {hashlib.sha256(data[3].tobytes()).digest()}
        rows, _ = sample_unique(data, 1, np.random.default_rng(1), seen)
        self.assertTrue(np.all(data[rows[0]] == 1))
        with self.assertRaises(ValueError):
            sample_unique(data, 3, np.random.default_rng(1), set())

    def test_normalization_orientation_and_range(self):
        data = np.zeros((1, 784), dtype=np.uint8)
        data[0, 0], data[0, 29] = 255, 128
        result = normalize(data)
        self.assertEqual(result.shape, (1, 28, 28, 1))
        self.assertEqual(result.dtype, np.float32)
        self.assertEqual(result[0, 0, 0, 0], 1)
        self.assertAlmostEqual(float(result[0, 1, 1, 0]), 128 / 255)
        self.assertEqual(result[0, 27, 27, 0], 0)
        with self.assertRaises(ValueError):
            normalize(data.astype(np.float32))

    def test_checksum_and_run_preservation(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            raw = self.create_raw(root)
            run = root / "run"
            prepare(run, 10, 42, raw)
            with (run / "dataset.npz").open("ab") as out:
                out.write(b"changed")
            with self.assertRaises(ValueError):
                check_dataset(run)
            write_json(run / "training.json", {})
            with self.assertRaises(FileExistsError):
                prepare(run, 10, 42, raw)
            with (raw / "cat.npy").open("ab") as out:
                out.write(b"changed")
            with self.assertRaises(ValueError):
                prepare(root / "other", 10, 42, raw)

    def test_invalid_sample_size(self):
        for size in (0, -10, 9, 11):
            with self.assertRaises(ValueError):
                prepare(Path("unused"), size)

    def test_selection_never_uses_test_metrics(self):
        records = {"mlp": {"validation": {"macro_f1": 0.8, "accuracy": 0.8}, "parameters": 100,
                           "test": {"accuracy": 1}},
                   "cnn": {"validation": {"macro_f1": 0.9, "accuracy": 0.9}, "parameters": 200,
                           "test": {"accuracy": 0}}}
        self.assertEqual(choose_model(records), "cnn")
        records["cnn"]["validation"] = records["mlp"]["validation"].copy()
        self.assertEqual(choose_model(records), "mlp")

    def test_metrics_manifest_order_and_missing_prediction(self):
        result = metrics(np.array([0, 1, 2]), np.array([[1., 0, 0], [0, 1., 0], [0, 1., 0]]), classes()[:3])
        self.assertAlmostEqual(result["accuracy"], 2 / 3)
        self.assertEqual(result["confusion_matrix"], [[1, 0, 0], [0, 1, 0], [0, 1, 0]])
        self.assertEqual(result["classification_report"]["shoe"]["recall"], 0)
        self.assertEqual(result["classification_report"]["cat"]["support"], 1)

    def test_invalid_predictions_rejected(self):
        for values in (np.array([[np.nan, 0, 1]]), np.array([[1, 1, 1]]),
                       np.array([[-1, 1, 1]]), np.zeros((1, 2))):
            with self.assertRaises(ValueError):
                metrics(np.array([0]), values, classes())

    def test_smoke_cannot_publish(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            metadata = prepare(root / "run", 10, 42, self.create_raw(root))
            write_json(root / "run/metrics.json", {
                "dataset": {"npz_sha256": metadata["npz_sha256"]}, "classes": classes()})
            with self.assertRaisesRegex(ValueError, "smoke model"):
                export(root / "run", publish=True)


if __name__ == "__main__":
    unittest.main()
