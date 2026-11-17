"""Publish the mission pool: real images from the held-out arena partition and recorded z vectors.

Real images are chosen per class with a fixed NumPy seed (never by appearance).
Latent vectors come from the same PyTorch RNG declared in the model manifest, so a
synthetic round can record the exact z it used. The official test set is not read.
"""
import argparse
import json
import shutil
import tempfile
from pathlib import Path

import numpy as np

from common import ROOT, asset, digest, read_json, record, verify_asset, write_json

POOL_ID = "fashion-mnist-arena-pool-v1"
LATENT_SET_ID = "arena-latents-v1"
REAL_PER_CLASS = 50
REAL_SEED = 20261118
LATENT_COUNT = 64  # latent-set v1 allows at most 64 vectors
LATENT_SEED = 6011
RUN = ROOT / "public/models/enganai/research/cpu-no-batchnorm-v1"
OUTPUT = ROOT / "public/data/enganai/arena"


def build(target, run=RUN):
    import torch
    from data import load_prepared
    from train import RNG_ID, sample_latents

    target = Path(target)
    target.mkdir(parents=True, exist_ok=True)
    images, labels, cache_split = load_prepared()
    split = read_json(run / "split.json")
    if digest(ROOT / "training/enganai/cache/sources.json") != split["sourceSha256"] or cache_split["partitions"] != split["partitions"]:
        raise ValueError("Local dataset differs from the split recorded by the run")
    arena = split["partitions"]["arena"]
    indices = np.array([int(identifier.split("-")[1]) for identifier in arena])
    if not all(identifier.startswith("train-") for identifier in arena):
        raise ValueError("The arena partition must come from the official training file")
    rng = np.random.default_rng(REAL_SEED)
    chosen = []
    for label in range(10):
        candidates = np.sort(indices[labels[indices] == label])
        chosen.extend(rng.choice(candidates, REAL_PER_CLASS, replace=False).tolist())
    chosen = rng.permutation(np.array(chosen)).tolist()
    record_ids = [f"train-{index:05d}" for index in chosen]
    if len(set(record_ids)) != len(record_ids) or not set(record_ids) <= set(arena):
        raise ValueError("Pool must contain unique arena records")
    pixels = np.asarray(images[chosen], dtype=np.uint8)
    (target / "real-pool.u8").write_bytes(pixels.tobytes())
    shutil.copy2(run / "FASHION-MNIST-LICENSE.txt", target / "FASHION-MNIST-LICENSE.txt")

    config = read_json(run / "config.json")
    latents = sample_latents(LATENT_COUNT, config["latentDimension"], LATENT_SEED).reshape(LATENT_COUNT, -1)
    if not torch.isfinite(latents).all():
        raise ValueError("Non-finite latent vector")
    used = {LATENT_SEED} & {config["seed"], config["fixedLatentSeed"], config["evaluationSeed"]}
    if used:
        raise ValueError("Arena latents must not reuse training, fixed or evaluation seeds")
    latent_set = record("latent-set", id=LATENT_SET_ID, dimension=config["latentDimension"], distribution="normal-0-1", rngId=RNG_ID, vectors=latents.tolist())
    write_json(target / "latent-pool.json", latent_set)

    pool = {
        "schemaVersion": 1,
        "kind": "arena-pool",
        "dataMode": "recorded",
        "id": POOL_ID,
        "datasetId": split["datasetId"],
        "partition": "arena",
        "splitId": split["id"],
        "splitSha256": digest(run / "split.json"),
        "real": {
            "asset": asset(target / "real-pool.u8", target),
            "encoding": "uint8-row-major-28x28",
            "recordIds": record_ids,
            "classCounts": np.bincount(labels[chosen], minlength=10).tolist(),
            "selection": {"rule": "per-class-without-replacement-then-permutation", "perClass": REAL_PER_CLASS, "rng": "numpy-pcg64", "seed": REAL_SEED},
        },
        "latents": {
            "asset": asset(target / "latent-pool.json", target),
            "latentSetId": LATENT_SET_ID,
            "count": LATENT_COUNT,
            "rngId": RNG_ID,
            "seed": LATENT_SEED,
        },
        "license": asset(target / "FASHION-MNIST-LICENSE.txt", target),
        "labelsPublished": False,
        "officialTestUsed": False,
    }
    write_json(target / "arena-pool.json", pool)
    return pool


def validate(target, run=RUN):
    target = Path(target)
    pool = read_json(target / "arena-pool.json")
    split = read_json(run / "split.json")
    if pool["kind"] != "arena-pool" or pool["partition"] != "arena" or pool["officialTestUsed"] or pool["splitSha256"] != digest(run / "split.json"):
        raise ValueError("Invalid arena pool record")
    for key in ("real", "latents"):
        verify_asset(pool[key]["asset"], target)
    verify_asset(pool["license"], target)
    ids = pool["real"]["recordIds"]
    if len(ids) != len(set(ids)) or not set(ids) <= set(split["partitions"]["arena"]) or pool["real"]["asset"]["bytes"] != len(ids) * 784:
        raise ValueError("Real pool is not a unique subset of the arena partition")
    latents = read_json(target / "latent-pool.json")
    if latents["id"] != pool["latents"]["latentSetId"] or len(latents["vectors"]) != pool["latents"]["count"]:
        raise ValueError("Latent pool mismatch")
    return pool


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Rebuild in a temporary folder and require identical bytes")
    args = parser.parse_args()
    if args.check:
        validate(OUTPUT)
        with tempfile.TemporaryDirectory() as temporary:
            build(temporary)
            for name in ("arena-pool.json", "real-pool.u8", "latent-pool.json"):
                if digest(Path(temporary) / name) != digest(OUTPUT / name):
                    raise ValueError(f"Rebuilt pool differs: {name}")
        print(json.dumps({"status": "passed", "pool": POOL_ID, "rebuildIdentical": True}))
    else:
        result = build(OUTPUT)
        validate(OUTPUT)
        print(json.dumps({"status": "published", "real": len(result["real"]["recordIds"]), "classCounts": result["real"]["classCounts"], "latents": result["latents"]["count"]}))
