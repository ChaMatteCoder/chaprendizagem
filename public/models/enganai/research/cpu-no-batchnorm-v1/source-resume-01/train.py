"""Recorded CPU training; PyTorch research artifacts, not a browser model manifest."""
import argparse
import math
import platform
import random
import re
import signal
import shutil
import time
from datetime import datetime, timezone

import numpy as np
import torch
from PIL import Image

from common import CACHE, HERE, ROOT, asset, read_json, record, verify_asset, write_json
from data import CLASS_NAMES, load_prepared
from model import build_models, discriminator_step, generator_step, image_bytes, normalize

RNG_ID = "pytorch-cpu-normal-v1"


def now():
    return datetime.now(timezone.utc).isoformat()


def validate_config(config):
    if config["family"] != "dcgan-compact" or config["loss"] != "bce-with-logits":
        raise ValueError("Unsupported model/loss family")
    if config.get("discriminatorNormalization", "batch") not in ("batch", "none"):
        raise ValueError("Unsupported discriminator normalization")
    for key in ("latentDimension", "generatorWidth", "discriminatorWidth", "epochs", "batchSize", "threads", "fixedLatentCount", "developmentSampleCount"):
        if type(config[key]) is not int or config[key] < 1:
            raise ValueError(f"Invalid {key}")
    if config["fixedLatentCount"] > 64 or config["developmentSampleCount"] > 5000 or config["batchSize"] < 2:
        raise ValueError("Invalid sample/batch count")
    if config["checkpointEpochs"] != sorted(set(config["checkpointEpochs"])) or any(type(e) is not int or not 0 <= e <= config["epochs"] for e in config["checkpointEpochs"]):
        raise ValueError("Invalid checkpoint epochs")
    if not {0, config["epochs"]} <= set(config["checkpointEpochs"]):
        raise ValueError("Initialization and final checkpoints are required")
    for key in ("seed", "partitionSeed", "fixedLatentSeed", "evaluationSeed"):
        if type(config[key]) is not int or not 0 <= config[key] < 2**32:
            raise ValueError("Invalid seed")
    for key in ("learningRateGenerator", "learningRateDiscriminator"):
        if not math.isfinite(config[key]) or not 0 < config[key] < 1:
            raise ValueError("Invalid learning rate")
    if len(config["betas"]) != 2 or any(not math.isfinite(v) or not 0 <= v < 1 for v in config["betas"]):
        raise ValueError("Invalid Adam betas")
    if config["trainingLimit"] is not None and (type(config["trainingLimit"]) is not int or not 2 <= config["trainingLimit"] <= 50000):
        raise ValueError("Invalid training limit")
    if config["augmentations"] or config["labelSmoothing"] or config["dataset"] != "fashion-mnist" or config["discriminatorLossReduction"] != "sum-of-real-and-synthetic-means" or config["generatorObjective"] != "non-saturating-real-target":
        raise ValueError("Unsupported training configuration")


def configure(seed, threads):
    torch.set_num_threads(threads)
    torch.set_num_interop_threads(1)
    torch.use_deterministic_algorithms(True)
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def sample_latents(count, dimension, seed):
    generator = torch.Generator(device="cpu").manual_seed(seed)
    return torch.randn(count, dimension, 1, 1, generator=generator)


def save_checkpoint(run_dir, run_id, epoch, step, generator, discriminator, fixed, config):
    checkpoint_id = f"{run_id}-epoch-{epoch:03d}"
    directory = run_dir / f"checkpoints/epoch-{epoch:03d}"
    directory.mkdir(parents=True)
    for name, network in (("generator", generator), ("discriminator", discriminator)):
        torch.save(network.state_dict(), directory / f"{name}.pt")
    generator_asset, discriminator_asset = (asset(directory / f"{name}.pt", run_dir) for name in ("generator", "discriminator"))
    generator.eval()
    with torch.inference_mode():
        pixels = image_bytes(generator(fixed))
    samples = []
    for index, values in enumerate(fixed.flatten(1).tolist()):
        path = directory / f"sample-{index:02d}.png"
        Image.fromarray(pixels[index]).save(path)
        samples.append(record("sample", id=f"{checkpoint_id}-z-{index:02d}", image={"asset": asset(path, run_dir), "width": 28, "height": 28, "channels": 1, "encoding": "png"}, provenance={"origin": "synthetic", "runId": run_id, "checkpointId": checkpoint_id, "generatorSha256": generator_asset["sha256"], "latent": {"dimension": config["latentDimension"], "distribution": "normal-0-1", "rngId": RNG_ID, "seed": config["fixedLatentSeed"], "values": values}}))
    checkpoint = record("checkpoint", id=checkpoint_id, runId=run_id, epoch=epoch, globalStep=step, generator=generator_asset, discriminator=discriminator_asset, fixedLatentSetId=f"{run_id}-fixed-z", previewSampleIds=[s["id"] for s in samples])
    write_json(directory / "samples.json", samples)
    write_json(directory / "checkpoint.json", checkpoint)
    return checkpoint


def evaluate(generator, discriminator, real, latent, epoch, step):
    generator.eval()
    discriminator.eval()
    logits_real, logits_synthetic, fake_pixels = [], [], []
    with torch.inference_mode():
        for start in range(0, len(real), 64):
            fake = generator(latent[start:start + 64])
            logits_real.append(discriminator(real[start:start + 64]))
            logits_synthetic.append(discriminator(fake))
            fake_pixels.append(image_bytes(fake))
    real_logits, synthetic_logits = torch.cat(logits_real), torch.cat(logits_synthetic)
    real_correct = int((real_logits >= 0).sum())
    synthetic_correct = int((synthetic_logits < 0).sum())
    count = len(real)
    criterion = torch.nn.BCEWithLogitsLoss()
    pixels = np.concatenate(fake_pixels)
    return {
        "epoch": epoch, "globalStep": step, "realCount": count, "syntheticCount": count,
        "realCorrect": real_correct, "syntheticCorrect": synthetic_correct,
        "balancedOriginAccuracy": (real_correct + synthetic_correct) / (2 * count),
        "realMeanSigmoid": float(real_logits.sigmoid().mean()), "syntheticMeanSigmoid": float(synthetic_logits.sigmoid().mean()),
        "discriminatorLoss": float(criterion(real_logits, torch.ones_like(real_logits)) + criterion(synthetic_logits, torch.zeros_like(synthetic_logits))),
        "generatorLoss": float(criterion(synthetic_logits, torch.ones_like(synthetic_logits))),
        "uniqueQuantizedImages": len({image.tobytes() for image in pixels}),
        "meanPixelStandardDeviation": float(pixels.astype(np.float32).std(axis=0).mean() / 255),
    }


def restore_training(generator, discriminator, opt_g, opt_d, noise_rng, rng, state, weights):
    for network, value in zip((generator, discriminator), weights):
        network.load_state_dict(value, strict=True)
    opt_g.load_state_dict(state["generatorOptimizer"])
    opt_d.load_state_dict(state["discriminatorOptimizer"])
    noise_rng.set_state(state["noiseRng"])
    rng.bit_generator.state = state["numpyRng"]
    torch.set_rng_state(state["torchRng"])


def resume_run(run_dir, config, generator, discriminator, opt_g, opt_d, noise_rng, rng):
    run = read_json(run_dir / "run.json")
    if run["status"] == "completed" or read_json(verify_asset(run["config"], run_dir)) != config:
        raise ValueError("Resume requires an unfinished run with the same configuration")
    if run["environment"]["pytorch"] != torch.__version__ or run["environment"]["numpy"] != np.__version__:
        raise ValueError("Resume requires the recorded PyTorch/NumPy environment")
    state = torch.load(run_dir / "optimizer-state.pt", map_location="cpu", weights_only=True)
    checkpoints = [item for item in read_json(run_dir / "checkpoints.json") if item["epoch"] <= state["epoch"]]
    checkpoint = checkpoints[-1]
    if checkpoint["epoch"] != state["epoch"] or checkpoint["globalStep"] != state["globalStep"]:
        raise ValueError("Optimizer and model checkpoint are not aligned")
    weights = [torch.load(verify_asset(checkpoint[name], run_dir), map_location="cpu", weights_only=True) for name in ("generator", "discriminator")]
    restore_training(generator, discriminator, opt_g, opt_d, noise_rng, rng, state, weights)
    epochs = [item for item in read_json(run_dir / "epochs.json") if item["epoch"] <= state["epoch"]]
    points = [item for item in read_json(run_dir / "history.json")["points"] if item["globalStep"] <= state["globalStep"]]
    diagnostics = [item for item in read_json(run_dir / "diagnostics.json") if item["epoch"] <= state["epoch"]]
    directory = run_dir / f"source-resume-{len(run.get('resumptions', [])) + 1:02d}"
    directory.mkdir()
    sources = []
    for name in ("train.py", "model.py", "verify.py", "requirements.lock.txt"):
        shutil.copyfile(HERE / name, directory / name)
        sources.append(asset(directory / name, run_dir))
    run.setdefault("resumptions", []).append({"startedAt": now(), "fromEpoch": state["epoch"], "fromStep": state["globalStep"], "sourceCode": sources})
    run.update(status="running", timingNote="Elapsed time includes completed epochs before resumption and the resumed process; discarded partial work and offline time are excluded.")
    run.pop("error", None)
    run.pop("finishedAt", None)
    print(f"Resuming epoch {state['epoch'] + 1}, step {state['globalStep']}; optimizer and RNG state restored", flush=True)
    return run, checkpoints, diagnostics, points, epochs, state["globalStep"]


def train(config, run_id, smoke=False, publish=False, resume=False):
    validate_config(config)
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,63}", run_id):
        raise ValueError("Invalid run id")
    if publish and (smoke or config["trainingLimit"] is not None):
        raise ValueError("Smoke/subset runs cannot be published")
    run_dir = HERE / "runs" / run_id
    if run_dir.exists() and not resume:
        raise FileExistsError("Run already exists; use another run id to preserve its evidence")
    if resume and not run_dir.exists():
        raise FileNotFoundError("Cannot resume a missing run")
    images, labels, split = load_prepared()
    if split["partitionSeed"] != config["partitionSeed"]:
        raise ValueError("Partition seed differs from training configuration")
    configure(config["seed"], config["threads"])
    generator, discriminator = build_models(config)
    opt_g = torch.optim.Adam(generator.parameters(), lr=config["learningRateGenerator"], betas=config["betas"])
    opt_d = torch.optim.Adam(discriminator.parameters(), lr=config["learningRateDiscriminator"], betas=config["betas"])
    rng = np.random.Generator(np.random.PCG64(config["seed"]))
    all_train_ids = np.array([int(identifier.split("-")[1]) for identifier in split["partitions"]["train"]])
    train_ids = all_train_ids if config["trainingLimit"] is None else rng.permutation(all_train_ids)[:config["trainingLimit"]]
    dev_ids = np.array([int(identifier.split("-")[1]) for identifier in split["partitions"]["development"]])
    dev_ids = np.random.Generator(np.random.PCG64(config["evaluationSeed"])).permutation(dev_ids)[:config["developmentSampleCount"]]
    real_dev = normalize(images[dev_ids])
    fixed = sample_latents(config["fixedLatentCount"], config["latentDimension"], config["fixedLatentSeed"])
    evaluation_latent = sample_latents(len(dev_ids), config["latentDimension"], config["evaluationSeed"])
    noise_rng = torch.Generator(device="cpu").manual_seed(config["seed"] + 1)
    if resume:
        run, checkpoints, diagnostics, points, epochs, step = resume_run(run_dir, config, generator, discriminator, opt_g, opt_d, noise_rng, rng)
    else:
        run_dir.mkdir(parents=True)
        run, checkpoints, diagnostics, points, epochs, step = create_run(run_dir, run_id, config, smoke, generator, discriminator, train_ids, labels, split, evaluation_latent, dev_ids, fixed)
    write_json(run_dir / "run.json", run)
    elapsed_before = sum(item["seconds"] for item in epochs) if resume else 0
    elapsed_start = time.monotonic()
    try:
        if not resume:
            checkpoints.append(save_checkpoint(run_dir, run_id, 0, step, generator, discriminator, fixed, config))
            diagnostics.append(evaluate(generator, discriminator, real_dev, evaluation_latent, 0, step))
        for epoch in range((epochs[-1]["epoch"] if epochs else 0) + 1, config["epochs"] + 1):
            epoch_start = time.monotonic()
            order = rng.permutation(train_ids)
            loss_g_sum = loss_d_sum = seen = 0
            for start in range(0, len(order), config["batchSize"]):
                batch = order[start:start + config["batchSize"]]
                real = normalize(images[batch])
                noise = torch.randn(len(batch), config["latentDimension"], 1, 1, generator=noise_rng)
                fake, loss_d = discriminator_step(generator, discriminator, real, noise, opt_d)
                loss_g = generator_step(discriminator, fake, opt_g)
                step += 1
                points.append({"globalStep": step, "epoch": epoch, "generatorLoss": loss_g, "discriminatorLoss": loss_d})
                loss_g_sum += loss_g * len(batch)
                loss_d_sum += loss_d * len(batch)
                seen += len(batch)
                if step % 100 == 0:
                    print(f"epoch {epoch}/{config['epochs']} step {step} G={loss_g:.4f} D={loss_d:.4f}", flush=True)
            epochs.append({"epoch": epoch, "globalStep": step, "examplesSeen": seen, "generatorLoss": loss_g_sum / seen, "discriminatorLoss": loss_d_sum / seen, "seconds": time.monotonic() - epoch_start})
            diagnostics.append(evaluate(generator, discriminator, real_dev, evaluation_latent, epoch, step))
            if epoch in config["checkpointEpochs"]:
                checkpoints.append(save_checkpoint(run_dir, run_id, epoch, step, generator, discriminator, fixed, config))
                temporary = run_dir / "optimizer-state.pt.tmp"
                torch.save({"epoch": epoch, "globalStep": step, "generatorOptimizer": opt_g.state_dict(), "discriminatorOptimizer": opt_d.state_dict(), "noiseRng": noise_rng.get_state(), "numpyRng": rng.bit_generator.state, "torchRng": torch.get_rng_state()}, temporary)
                temporary.replace(run_dir / "optimizer-state.pt")
            write_json(run_dir / "history.json", record("history", id=f"{run_id}-history", runId=run_id, unit="optimizer-step", lossFamily="bce-with-logits", points=points))
            write_json(run_dir / "epochs.json", epochs)
            write_json(run_dir / "diagnostics.json", diagnostics)
            write_json(run_dir / "checkpoints.json", checkpoints)
            print(f"EPOCH {epoch}: {seen} images, {epochs[-1]['seconds']:.1f}s; G={epochs[-1]['generatorLoss']:.4f} D={epochs[-1]['discriminatorLoss']:.4f}", flush=True)
        run.update(status="completed", finishedAt=now(), elapsedSeconds=elapsed_before + time.monotonic() - elapsed_start, globalStep=step, activeCheckpointId=checkpoints[-1]["id"], completedEpochs=config["epochs"])
        write_json(run_dir / "run.json", run)
        from verify import verify_run
        verification = verify_run(run_dir)
        write_json(run_dir / "verification.json", verification)
        if publish:
            publish_dir = ROOT / "public/models/enganai/research" / run_id
            if publish_dir.exists():
                raise FileExistsError("Publication exists; refusing to overwrite")
            publish_dir.parent.mkdir(parents=True, exist_ok=True)
            staging = publish_dir.with_name(publish_dir.name + ".staging")
            shutil.copytree(run_dir, staging)
            (staging / "optimizer-state.pt").unlink(missing_ok=True)
            staging.rename(publish_dir)
            print(f"Published research artifacts: {publish_dir}", flush=True)
        print(f"Completed {run_id}: {step} updates in {run['elapsedSeconds']:.1f}s", flush=True)
        return run_dir
    except BaseException as error:
        run.update(status="interrupted" if isinstance(error, KeyboardInterrupt) else "failed", finishedAt=now(), globalStep=step, error=str(error))
        write_json(run_dir / "run.json", run)
        raise


def create_run(run_dir, run_id, config, smoke, generator, discriminator, train_ids, labels, split, evaluation_latent, dev_ids, fixed):
    shutil.copyfile(CACHE / "sources.json", run_dir / "sources.json")
    shutil.copyfile(CACHE / "FASHION-MNIST-LICENSE.txt", run_dir / "FASHION-MNIST-LICENSE.txt")
    write_json(run_dir / "split.json", split)
    write_json(run_dir / "config.json", config)
    write_json(run_dir / "training-record-ids.json", [f"train-{index:05d}" for index in train_ids])
    np.save(run_dir / "evaluation-latents.npy", evaluation_latent.numpy(), allow_pickle=False)
    write_json(run_dir / "evaluation-inputs.json", {"realRecordIds": [f"train-{index:05d}" for index in dev_ids], "latent": asset(run_dir / "evaluation-latents.npy", run_dir), "partition": "development", "purpose": "diagnostic-only-not-checkpoint-selection"})
    fixed_record = record("latent-set", id=f"{run_id}-fixed-z", dimension=config["latentDimension"], distribution="normal-0-1", rngId=RNG_ID, vectors=fixed.flatten(1).tolist())
    write_json(run_dir / "fixed-latents.json", fixed_record)
    source_dir = run_dir / "source"
    source_dir.mkdir()
    source_assets = []
    for filename in ("common.py", "data.py", "model.py", "train.py", "verify.py", "requirements.txt", "requirements.lock.txt"):
        source = HERE / filename
        if source.exists():
            shutil.copyfile(source, source_dir / filename)
            source_assets.append(asset(source_dir / filename, run_dir))
    run = {
        "schemaVersion": 1, "kind": "pytorch-training-run", "dataMode": "recorded", "id": run_id,
        "status": "running", "purpose": "pipeline-smoke" if smoke else "baseline-research",
        "runtime": "pytorch", "browserReady": False, "startedAt": now(),
        "environment": {"python": platform.python_version(), "pytorch": torch.__version__, "numpy": np.__version__, "device": "cpu", "threads": config["threads"], "platform": platform.platform(), "deterministicAlgorithms": True, "mkldnn": torch.backends.mkldnn.enabled},
        "architecture": {"generator": str(generator), "discriminator": str(discriminator), "generatorParameters": sum(p.numel() for p in generator.parameters()), "discriminatorParameters": sum(p.numel() for p in discriminator.parameters()), "generatorInput": ["N", config["latentDimension"], 1, 1], "generatorOutput": ["N", 1, 28, 28], "discriminatorInput": ["N", 1, 28, 28], "discriminatorOutput": ["N", 1]},
        "config": asset(run_dir / "config.json", run_dir), "split": asset(run_dir / "split.json", run_dir),
        "trainingSelection": asset(run_dir / "training-record-ids.json", run_dir),
        "sources": asset(run_dir / "sources.json", run_dir), "sourceCode": source_assets,
        "trainingRecords": len(train_ids), "classCounts": np.bincount(labels[train_ids], minlength=10).tolist(),
        "classNames": CLASS_NAMES, "officialTestEvaluated": False, "arenaUsedForTraining": False,
        "selection": {"rule": "last-predeclared-epoch", "qualityClaim": "preliminary-baseline-not-a-universal-ai-detector"},
    }
    return run, [], [], [], [], 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=str(HERE / "configs/cpu-v1.json"))
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--smoke", action="store_true")
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    config = read_json(args.config)
    if args.smoke:
        config.update(epochs=1, checkpointEpochs=[0, 1], trainingLimit=1024, developmentSampleCount=64, batchSize=64)
    def terminate(_signal, _frame):
        raise KeyboardInterrupt("Process interrupted; resume from the last completed checkpoint")
    signal.signal(signal.SIGTERM, terminate)
    train(config, args.run_id, smoke=args.smoke, publish=args.publish, resume=args.resume)


if __name__ == "__main__":
    main()
