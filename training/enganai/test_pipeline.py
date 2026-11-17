import gzip
from copy import deepcopy
import math
import struct
import tempfile
import unittest
from pathlib import Path

import numpy as np
import torch

from common import asset, verify_asset, record
from data import decode_idx, make_partitions, validate_partitions
from model import build_models, discriminator_step, generator_step, image_bytes, normalize
from train import restore_training, sample_latents


class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        torch.set_num_threads(2)
        torch.use_deterministic_algorithms(True)

    def models(self):
        torch.manual_seed(42)
        return build_models({"latentDimension": 4, "generatorWidth": 4, "discriminatorWidth": 4})

    def test_idx_rejects_wrong_shape_count_and_trailing_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "images.gz"
            payload = struct.pack(">IIII", 2051, 2, 28, 28) + bytes(2 * 784)
            path.write_bytes(gzip.compress(payload))
            self.assertEqual(decode_idx(path, 2051, 2).shape, (2, 28, 28))
            for bad in [payload[:-1], payload + b"x", struct.pack(">IIII", 2051, 2, 32, 32) + bytes(2 * 784)]:
                path.write_bytes(gzip.compress(bad))
                with self.assertRaises(ValueError):
                    decode_idx(path, 2051, 2)

    def test_stratified_split_is_repeatable_complete_and_test_isolated(self):
        labels = np.repeat(np.arange(10), 10)
        split = make_partitions(labels, 17, held_out_per_class=2, test_count=20)
        self.assertEqual(split, make_partitions(labels, 17, held_out_per_class=2, test_count=20))
        self.assertEqual([len(split[key]) for key in ("train", "development", "arena", "test")], [60, 20, 20, 20])
        for key in ("train", "development", "arena"):
            counts = np.bincount([labels[int(item.split("-")[1])] for item in split[key]], minlength=10)
            self.assertTrue(np.all(counts == counts[0]))
        split["arena"][0] = split["train"][0]
        with self.assertRaisesRegex(ValueError, "Overlapping"):
            validate_partitions(split, 100, 20)

    def test_interfaces_normalization_and_logit_loss_are_finite(self):
        generator, discriminator = self.models()
        latent = sample_latents(3, 4, 9)
        fake = generator(latent)
        self.assertEqual(tuple(fake.shape), (3, 1, 28, 28))
        self.assertEqual(tuple(discriminator(fake).shape), (3, 1))
        pixels = np.array([np.full((28, 28), 0), np.full((28, 28), 255)], dtype=np.uint8)
        self.assertTrue(torch.equal(normalize(pixels)[:, 0, 0, 0], torch.tensor([-1., 1.])))
        np.testing.assert_array_equal(image_bytes(normalize(pixels)), pixels)
        logits = torch.tensor([[-1000.], [1000.]], requires_grad=True)
        loss = torch.nn.functional.binary_cross_entropy_with_logits(logits, torch.tensor([[1.], [0.]]))
        loss.backward()
        self.assertTrue(torch.isfinite(loss) and torch.isfinite(logits.grad).all())

    def test_updates_keep_the_gradient_path_and_do_not_modify_frozen_network(self):
        generator, discriminator = self.models()
        opt_g = torch.optim.Adam(generator.parameters(), lr=.0002)
        opt_d = torch.optim.Adam(discriminator.parameters(), lr=.0002)
        before_g = {key: value.clone() for key, value in generator.named_parameters()}
        before_d = {key: value.clone() for key, value in discriminator.named_parameters()}
        real = normalize(np.zeros((3, 28, 28), dtype=np.uint8))
        fake, loss_d = discriminator_step(generator, discriminator, real, sample_latents(3, 4, 21), opt_d)
        self.assertTrue(all(torch.equal(value, before_g[key]) and value.grad is None for key, value in generator.named_parameters()))
        self.assertTrue(any(not torch.equal(value, before_d[key]) for key, value in discriminator.named_parameters()))
        frozen_d = {key: value.clone() for key, value in discriminator.state_dict().items()}
        loss_g = generator_step(discriminator, fake, opt_g)
        self.assertTrue(all(torch.equal(value, frozen_d[key]) for key, value in discriminator.state_dict().items()))
        self.assertTrue(any(not torch.equal(value, before_g[key]) for key, value in generator.named_parameters()))
        self.assertTrue(any(value.grad is not None and value.grad.abs().sum() > 0 for value in generator.parameters()))
        self.assertTrue(math.isfinite(loss_g) and math.isfinite(loss_d))

    def test_variant_without_batchnorm_keeps_the_same_logits_in_training_and_inference(self):
        torch.manual_seed(43)
        generator, discriminator = build_models({"latentDimension": 4, "generatorWidth": 4, "discriminatorWidth": 4, "discriminatorNormalization": "none"})
        self.assertFalse(any(isinstance(layer, torch.nn.BatchNorm2d) for layer in discriminator.modules()))
        images = generator(sample_latents(3, 4, 24)).detach()
        training = discriminator(images)
        discriminator.eval()
        inference = discriminator(images)
        torch.testing.assert_close(training, inference, rtol=0, atol=0)
        with torch.inference_mode():
            single = torch.cat([discriminator(image.unsqueeze(0)) for image in images])
        torch.testing.assert_close(inference, single, rtol=1e-5, atol=1e-6)

    def test_short_training_is_reproducible_and_saved_weights_replay_same_pixels(self):
        outcomes = []
        for _ in range(2):
            generator, discriminator = self.models()
            opt_g = torch.optim.Adam(generator.parameters(), lr=.0002)
            opt_d = torch.optim.Adam(discriminator.parameters(), lr=.0002)
            history = []
            for step in range(3):
                real = normalize(np.full((2, 28, 28), step * 50, dtype=np.uint8))
                fake, loss_d = discriminator_step(generator, discriminator, real, sample_latents(2, 4, step), opt_d)
                history.append((loss_d, generator_step(discriminator, fake, opt_g)))
            generator.eval()
            with torch.inference_mode():
                pixels = image_bytes(generator(sample_latents(2, 4, 99)))
            outcomes.append((history, pixels))
        self.assertEqual(outcomes[0][0], outcomes[1][0])
        np.testing.assert_array_equal(outcomes[0][1], outcomes[1][1])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "generator.pt"
            torch.save(generator.state_dict(), path)
            loaded, _ = self.models()
            loaded.load_state_dict(torch.load(path, weights_only=True))
            loaded.eval()
            with torch.inference_mode():
                np.testing.assert_array_equal(image_bytes(loaded(sample_latents(2, 4, 99))), outcomes[-1][1])

    def test_artifact_mutation_and_fixture_mislabel_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "weights.pt"
            path.write_bytes(b"original")
            identity = asset(path, directory)
            self.assertEqual(verify_asset(identity, directory), path)
            path.write_bytes(b"modified")
            with self.assertRaises(ValueError):
                verify_asset(identity, directory)
            with self.assertRaises(ValueError):
                verify_asset({**identity, "path": "../weights.pt"}, directory)
        with self.assertRaises(ValueError):
            record("latent-set", id="test", dimension=4, distribution="normal-0-1", rngId="test", vectors=[[0, 1, 2, 3]], dataMode="fixture")

    def test_resume_restores_adam_and_both_rng_streams_exactly(self):
        generator, discriminator = self.models()
        opt_g = torch.optim.Adam(generator.parameters(), lr=.0002, betas=(.5, .999))
        opt_d = torch.optim.Adam(discriminator.parameters(), lr=.0002, betas=(.5, .999))
        noise_rng = torch.Generator().manual_seed(31)
        rng = np.random.Generator(np.random.PCG64(32))

        def update(g, d, og, od, noise, order):
            ids = order.permutation(6)[:2]
            real = normalize(np.stack([np.full((28, 28), int(i) * 40, dtype=np.uint8) for i in ids]))
            latent = torch.randn(2, 4, 1, 1, generator=noise)
            fake, loss_d = discriminator_step(g, d, real, latent, od)
            return loss_d, generator_step(d, fake, og)

        update(generator, discriminator, opt_g, opt_d, noise_rng, rng)
        state = deepcopy({"generatorOptimizer": opt_g.state_dict(), "discriminatorOptimizer": opt_d.state_dict(), "noiseRng": noise_rng.get_state(), "numpyRng": rng.bit_generator.state, "torchRng": torch.get_rng_state()})
        weights = deepcopy([generator.state_dict(), discriminator.state_dict()])
        expected = update(generator, discriminator, opt_g, opt_d, noise_rng, rng)
        restored_g, restored_d = self.models()
        restored_og = torch.optim.Adam(restored_g.parameters(), lr=.0002, betas=(.5, .999))
        restored_od = torch.optim.Adam(restored_d.parameters(), lr=.0002, betas=(.5, .999))
        restored_noise = torch.Generator()
        restored_rng = np.random.Generator(np.random.PCG64())
        restore_training(restored_g, restored_d, restored_og, restored_od, restored_noise, restored_rng, state, weights)
        actual = update(restored_g, restored_d, restored_og, restored_od, restored_noise, restored_rng)
        self.assertEqual(expected, actual)
        for original, resumed in ((generator, restored_g), (discriminator, restored_d)):
            for key, value in original.state_dict().items():
                self.assertTrue(torch.equal(value, resumed.state_dict()[key]), key)


if __name__ == "__main__":
    unittest.main()
