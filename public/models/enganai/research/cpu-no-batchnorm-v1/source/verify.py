"""Recompute checkpoint previews and verify scientific artifact relationships."""
import argparse
import math
from pathlib import Path

import numpy as np
import torch
from PIL import Image

from common import CACHE, read_json, validate_record, verify_asset
from data import validate_partitions
from model import build_models, image_bytes


def verify_run(root):
    root = Path(root)
    run = read_json(root / "run.json")
    if run.get("status") != "completed" or run.get("kind") != "pytorch-training-run" or run.get("dataMode") != "recorded" or run.get("runtime") != "pytorch" or run.get("browserReady") is not False:
        raise ValueError("A completed recorded PyTorch research run is required")
    config = read_json(verify_asset(run["config"], root))
    from train import validate_config
    validate_config(config)
    split = read_json(verify_asset(run["split"], root))
    sources = verify_asset(run["sources"], root)
    for item in run["sourceCode"]:
        verify_asset(item, root)
    from common import digest
    if split["sourceSha256"] != digest(sources) or split["partitionSeed"] != config["partitionSeed"]:
        raise ValueError("Source/split/configuration mismatch")
    fixed = read_json(root / "fixed-latents.json")
    history = read_json(root / "history.json")
    checkpoints = read_json(root / "checkpoints.json")
    records = [split, fixed, history, *checkpoints]
    validate_partitions(split["partitions"])
    if len(split["partitions"]["train"]) != 50000 or len(split["partitions"]["development"]) != 5000 or len(split["partitions"]["arena"]) != 5000:
        raise ValueError("Unexpected partition sizes")
    latent = torch.tensor(fixed["vectors"], dtype=torch.float32).reshape(-1, config["latentDimension"], 1, 1)
    if fixed["dimension"] != config["latentDimension"] or len(latent) != config["fixedLatentCount"] or not torch.isfinite(latent).all():
        raise ValueError("Fixed latent shape mismatch")
    if run["officialTestEvaluated"] or run["arenaUsedForTraining"]:
        raise ValueError("This stage must preserve arena/test separation")
    expected_steps = math.ceil(run["trainingRecords"] / config["batchSize"])
    if run["trainingRecords"] != (config["trainingLimit"] or 50000) or run["completedEpochs"] != config["epochs"]:
        raise ValueError("Training coverage mismatch")
    selection = read_json(verify_asset(run["trainingSelection"], root))
    if len(selection) != run["trainingRecords"] or len(set(selection)) != len(selection) or not set(selection) <= set(split["partitions"]["train"]):
        raise ValueError("Training selection overlaps held-out data or is incomplete")
    if len(history["points"]) != expected_steps * config["epochs"] or run["globalStep"] != len(history["points"]):
        raise ValueError("Missing optimizer steps")
    for index, point in enumerate(history["points"], 1):
        if point["globalStep"] != index or point["epoch"] != math.ceil(index / expected_steps) or not all(math.isfinite(point[key]) for key in ("generatorLoss", "discriminatorLoss")):
            raise ValueError("Invalid loss chronology")
    if [item["epoch"] for item in checkpoints] != config["checkpointEpochs"] or run["activeCheckpointId"] != checkpoints[-1]["id"]:
        raise ValueError("Checkpoints differ from the predeclared schedule")
    first_states = None
    max_pixel_error = 0
    weight_changes = {}
    sample_ids = set()
    for checkpoint in checkpoints:
        if checkpoint["runId"] != run["id"] or checkpoint["fixedLatentSetId"] != fixed["id"] or checkpoint["globalStep"] != checkpoint["epoch"] * expected_steps:
            raise ValueError("Checkpoint/run/step mismatch")
        generator, discriminator = build_models(config)
        generator_path = verify_asset(checkpoint["generator"], root)
        discriminator_path = verify_asset(checkpoint["discriminator"], root)
        states = [torch.load(path, map_location="cpu", weights_only=True) for path in (generator_path, discriminator_path)]
        for network, state in zip((generator, discriminator), states):
            network.load_state_dict(state, strict=True)
            network.eval()
        if first_states is None:
            first_states = states
        elif checkpoint is checkpoints[-1]:
            for name, initial, final in zip(("generator", "discriminator"), first_states, states):
                change = sum(float((final[key] - initial[key]).abs().sum()) for key in initial if key.endswith("weight"))
                if not math.isfinite(change) or change == 0:
                    raise ValueError("Training did not modify network weights")
                weight_changes[name] = change
        with torch.inference_mode():
            generated = generator(latent)
            pixels = image_bytes(generated)
            logits = discriminator(generated)
        if tuple(logits.shape) != (len(latent), 1) or not torch.isfinite(logits).all():
            raise ValueError("Invalid discriminator output")
        samples = read_json(generator_path.parent / "samples.json")
        if checkpoint["previewSampleIds"] != [s["id"] for s in samples] or len(samples) != len(latent):
            raise ValueError("Checkpoint preview coverage/order mismatch")
        for index, sample in enumerate(samples):
            if sample["id"] in sample_ids:
                raise ValueError("Duplicate sample id")
            sample_ids.add(sample["id"])
            records.append(sample)
            source = sample["provenance"]
            expected = {"dimension": fixed["dimension"], "distribution": fixed["distribution"], "rngId": fixed["rngId"], "seed": config["fixedLatentSeed"], "values": fixed["vectors"][index]}
            if source["origin"] != "synthetic" or source["runId"] != run["id"] or source["checkpointId"] != checkpoint["id"] or source["generatorSha256"] != checkpoint["generator"]["sha256"] or source["latent"] != expected:
                raise ValueError("Synthetic provenance mismatch")
            with Image.open(verify_asset(sample["image"]["asset"], root)) as image:
                if image.size != (28, 28) or image.mode != "L":
                    raise ValueError("Wrong scientific image encoding")
                error = int(np.abs(np.asarray(image).astype(int) - pixels[index].astype(int)).max())
            max_pixel_error = max(max_pixel_error, error)
    if max_pixel_error:
        raise ValueError(f"Registered previews differ from G(z): {max_pixel_error}")
    for item in records:
        validate_record(item)
    # Check the saved diagnostics against the actual final networks and inputs when data is available.
    diagnostic_check = "not-recomputed-cache-unavailable"
    if (CACHE / "sources.json").exists():
        from data import load_prepared
        from model import normalize
        from train import evaluate
        images, _, _ = load_prepared()
        if digest(CACHE / "sources.json") != digest(sources):
            raise ValueError("Local source differs from recorded run")
        inputs = read_json(root / "evaluation-inputs.json")
        ids = inputs["realRecordIds"]
        if len(ids) != config["developmentSampleCount"] or not set(ids) <= set(split["partitions"]["development"]):
            raise ValueError("Diagnostic inputs must be from development")
        values = np.load(verify_asset(inputs["latent"], root), allow_pickle=False)
        real = normalize(images[[int(identifier.split("-")[1]) for identifier in ids]])
        actual = evaluate(generator, discriminator, real, torch.tensor(values), config["epochs"], run["globalStep"])
        recorded = read_json(root / "diagnostics.json")[-1]
        for key in actual:
            if not math.isclose(actual[key], recorded[key], abs_tol=1e-6, rel_tol=1e-6):
                raise ValueError(f"Diagnostic mismatch: {key}")
        diagnostic_check = "recomputed-final-development-diagnostics"
    return {"status": "passed", "runId": run["id"], "recordedSchemaRecords": len(records), "checkpoints": len(checkpoints), "previewsRecomputed": len(sample_ids), "maxPreviewPixelError": max_pixel_error, "weightL1Change": weight_changes, "diagnostics": diagnostic_check, "officialTestEvaluated": False, "browserReady": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("run_directory", type=Path)
    args = parser.parse_args()
    torch.set_num_threads(2)
    print(__import__("json").dumps(verify_run(args.run_directory), indent=2))
