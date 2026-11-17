import copy
import shutil
import tempfile
import unittest
from pathlib import Path

from arena_pool import OUTPUT, RUN, validate
from common import read_json, write_json


@unittest.skipUnless((OUTPUT / "arena-pool.json").exists(), "Arena pool not published")
class ArenaPool(unittest.TestCase):
    def test_published_pool_is_an_arena_subset(self):
        pool = validate(OUTPUT)
        split = read_json(RUN / "split.json")["partitions"]
        ids = set(pool["real"]["recordIds"])
        self.assertTrue(ids <= set(split["arena"]))
        for partition in ("train", "development", "test"):
            self.assertFalse(ids & set(split[partition]), partition)
        self.assertEqual(pool["real"]["classCounts"], [50] * 10)
        self.assertFalse(pool["labelsPublished"])

    def test_arena_latents_follow_the_manifest_rng(self):
        manifest = read_json(RUN / "model-manifest.json")
        latents = read_json(OUTPUT / "latent-pool.json")
        self.assertEqual((latents["rngId"], latents["dimension"], latents["distribution"]), (manifest["latent"]["rngId"], manifest["latent"]["dimension"], manifest["latent"]["distribution"]))
        fixed = read_json(RUN / "fixed-latents.json")["vectors"]
        self.assertFalse({tuple(v) for v in latents["vectors"]} & {tuple(v) for v in fixed})

    def test_rejects_leaks_and_tampering(self):
        with tempfile.TemporaryDirectory() as temporary:
            copy_root = Path(temporary)
            for name in ("arena-pool.json", "real-pool.u8", "latent-pool.json", "FASHION-MNIST-LICENSE.txt"):
                shutil.copy2(OUTPUT / name, copy_root / name)
            original = read_json(copy_root / "arena-pool.json")
            leaked = copy.deepcopy(original)
            leaked["real"]["recordIds"][0] = read_json(RUN / "split.json")["partitions"]["train"][0]
            write_json(copy_root / "arena-pool.json", leaked)
            with self.assertRaises(ValueError):
                validate(copy_root)
            write_json(copy_root / "arena-pool.json", original)
            data = bytearray((copy_root / "real-pool.u8").read_bytes())
            data[100] ^= 0xFF
            (copy_root / "real-pool.u8").write_bytes(bytes(data))
            with self.assertRaises(ValueError):
                validate(copy_root)


if __name__ == "__main__":
    unittest.main()
