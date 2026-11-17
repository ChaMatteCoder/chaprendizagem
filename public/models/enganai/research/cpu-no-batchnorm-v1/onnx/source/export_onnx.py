"""Export every registered checkpoint to ONNX and measure PyTorch/ONNX Runtime parity.

The export is published next to the research run so that every ONNX file keeps a
hash link to the exact PyTorch weights it came from. Nothing is published unless
the research run verifies first and every parity check stays inside TOLERANCE.
"""
import argparse
import json
import math
import shutil
import tempfile
import time
import warnings
from pathlib import Path

import numpy as np
import torch

from common import ROOT, asset, digest, read_json, record, validate_record, verify_asset, write_json
from model import build_models, image_bytes, normalize

EXPORT_VERSION = 1
OPSET = 18
MAX_BATCH = 1024
ALLOWED_OPS = {"Conv", "ConvTranspose", "Flatten", "LeakyRelu", "Relu", "Reshape", "Tanh"}
REFERENCE_REAL_COUNT = 16
# Declared before publication and shared with the browser check. Float32 kernels
# from different runtimes reorder sums, so equality is checked to a tolerance.
# Measured errors are recorded next to the limits (see onnx-export.json).
TOLERANCE = {
    "generatorAbs": 1e-4,
    "pixelMaxDifference": 1,
    "pixelMismatchFraction": 0.002,
    "logitAbs": 1e-4,
    "logitRel": 1e-4,
}
NETWORKS = {
    "generator": {"input": "latent", "output": "image"},
    "discriminator": {"input": "image", "output": "logit"},
}


def onnx_modules():
    import onnx
    import onnxruntime
    return onnx, onnxruntime


def load_checkpoint(root, config, checkpoint):
    generator, discriminator = build_models(config)
    for network, key in ((generator, "generator"), (discriminator, "discriminator")):
        state = torch.load(verify_asset(checkpoint[key], root), map_location="cpu", weights_only=True)
        network.load_state_dict(state, strict=True)
        network.eval()
    return generator, discriminator


def export_network(network, example, path, input_name, output_name):
    batch = torch.export.Dim("batch", min=1, max=MAX_BATCH)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        torch.onnx.export(
            network, (example,), path, input_names=[input_name], output_names=[output_name],
            dynamo=True, opset_version=OPSET, dynamic_shapes=({0: batch},),
            external_data=False, optimize=True, verbose=False,
        )


def inspect_graph(path, input_name, input_shape, output_name, output_shape):
    onnx, _ = onnx_modules()
    model = onnx.load(path)
    onnx.checker.check_model(model, full_check=True)
    ops = sorted({node.op_type for node in model.graph.node})
    if not set(ops) <= ALLOWED_OPS:
        raise ValueError(f"Unsupported ONNX operations: {sorted(set(ops) - ALLOWED_OPS)}")
    if [item.domain or "ai.onnx" for item in model.opset_import] != ["ai.onnx"] or model.opset_import[0].version != OPSET:
        raise ValueError("Unexpected ONNX opset")
    if any(tensor.data_location == onnx.TensorProto.EXTERNAL for tensor in model.graph.initializer):
        raise ValueError("Weights must be embedded in the ONNX file")

    def describe(values):
        return [(item.name, item.type.tensor_type.elem_type, [d.dim_param or d.dim_value for d in item.type.tensor_type.shape.dim]) for item in values]

    float32 = onnx.TensorProto.FLOAT
    if describe(model.graph.input) != [(input_name, float32, input_shape)] or describe(model.graph.output) != [(output_name, float32, output_shape)]:
        raise ValueError(f"ONNX interface differs from the contract: {describe(model.graph.input)} -> {describe(model.graph.output)}")
    return ops


def session(path):
    _, onnxruntime = onnx_modules()
    options = onnxruntime.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    return onnxruntime.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])


def run(sess, name, values):
    return sess.run(None, {name: np.ascontiguousarray(values, dtype=np.float32)})[0]


def logit_limit(reference):
    return TOLERANCE["logitAbs"] + TOLERANCE["logitRel"] * np.abs(reference)


def generator_parity(expected, actual):
    if actual.shape != expected.shape or not np.isfinite(actual).all():
        return {"count": int(len(expected)), "passed": False, "reason": "shape-or-non-finite"}
    expected_pixels = image_bytes(torch.from_numpy(expected))
    actual_pixels = image_bytes(torch.from_numpy(np.clip(actual, -1, 1)))
    pixel_difference = np.abs(expected_pixels.astype(int) - actual_pixels.astype(int))
    result = {
        "count": int(len(expected)),
        "maxAbsError": float(np.abs(expected - actual).max()),
        "pixelMaxDifference": int(pixel_difference.max()),
        "pixelMismatches": int((pixel_difference > 0).sum()),
        "pixelsCompared": int(pixel_difference.size),
    }
    result["passed"] = bool(
        actual.shape == expected.shape and np.isfinite(actual).all()
        and result["maxAbsError"] <= TOLERANCE["generatorAbs"]
        and result["pixelMaxDifference"] <= TOLERANCE["pixelMaxDifference"]
        and result["pixelMismatches"] <= TOLERANCE["pixelMismatchFraction"] * result["pixelsCompared"]
    )
    return result


def discriminator_parity(expected, actual):
    error = np.abs(expected - actual)
    flips = (expected >= 0) != (actual >= 0)
    result = {
        "count": int(len(expected)),
        "maxAbsError": float(error.max()),
        "maxAllowedRatio": float((error / logit_limit(expected)).max()),
        "predictionChanges": int(flips.sum()),
    }
    # A changed prediction is only acceptable when the reference logit itself is inside the tolerance band.
    result["passed"] = bool(
        actual.shape == expected.shape and np.isfinite(actual).all()
        and (error <= logit_limit(expected)).all()
        and not (flips & (np.abs(expected) > logit_limit(expected))).any()
    )
    return result


def real_images(root, count):
    from data import load_prepared
    images, _, split = load_prepared()
    if digest(ROOT / "training/enganai/cache/sources.json") != read_json(root / "split.json")["sourceSha256"]:
        raise ValueError("Local Fashion-MNIST cache differs from the recorded run")
    inputs = read_json(root / "evaluation-inputs.json")
    identifiers = inputs["realRecordIds"]
    development = set(split["partitions"]["development"])
    if not set(identifiers) <= development:
        raise ValueError("Diagnostic real images must come from the development partition")
    pixels = np.asarray(images[[int(item.split("-")[1]) for item in identifiers]], dtype=np.uint8)
    latents = np.load(verify_asset(inputs["latent"], root), allow_pickle=False).astype(np.float32)
    return identifiers, pixels, latents


def export_run(root, output_root=None, publish=False):
    from verify import verify_run
    onnx, onnxruntime = onnx_modules()
    root = Path(root).resolve()
    research = verify_run(root)
    run_record = read_json(root / "run.json")
    config = read_json(root / "config.json")
    checkpoints = read_json(root / "checkpoints.json")
    fixed = read_json(root / "fixed-latents.json")
    split = read_json(root / "split.json")
    package = read_json(ROOT / "package.json")
    web_runtime = package["dependencies"].get("onnxruntime-web")
    if not web_runtime:
        raise ValueError("onnxruntime-web must be a declared application dependency")

    target = Path(output_root or tempfile.mkdtemp(prefix="enganai-onnx-")).resolve()
    work = target / "onnx"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)

    dimension = config["latentDimension"]
    fixed_latent = np.asarray(fixed["vectors"], dtype=np.float32).reshape(-1, dimension, 1, 1)
    real_ids, real_pixels, evaluation_latent = real_images(root, REFERENCE_REAL_COUNT)
    evaluation_latent = evaluation_latent.reshape(-1, dimension, 1, 1)
    real = normalize(real_pixels).numpy()
    reference_real = work / "reference-real.u8"
    reference_real.write_bytes(real_pixels[:REFERENCE_REAL_COUNT].tobytes())

    exported, parity_passed = [], True
    for checkpoint in checkpoints:
        directory = work / f"epoch-{checkpoint['epoch']:03d}"
        directory.mkdir()
        generator, discriminator = load_checkpoint(root, config, checkpoint)
        files = {"generator": directory / "generator.onnx", "discriminator": directory / "discriminator.onnx"}
        export_network(generator, torch.zeros(2, dimension, 1, 1), files["generator"], "latent", "image")
        export_network(discriminator, torch.zeros(2, 1, 28, 28), files["discriminator"], "image", "logit")
        ops = {
            "generator": inspect_graph(files["generator"], "latent", ["batch", dimension, 1, 1], "image", ["batch", 1, 28, 28]),
            "discriminator": inspect_graph(files["discriminator"], "image", ["batch", 1, 28, 28], "logit", ["batch", 1]),
        }
        g_session, d_session = session(files["generator"]), session(files["discriminator"])
        with torch.inference_mode():
            torch_fixed = generator(torch.from_numpy(fixed_latent)).numpy()
            torch_evaluation = generator(torch.from_numpy(evaluation_latent)).numpy()
            torch_fixed_logits = discriminator(torch.from_numpy(torch_fixed)).numpy()
            torch_evaluation_logits = discriminator(torch.from_numpy(torch_evaluation)).numpy()
            torch_real_logits = discriminator(torch.from_numpy(real)).numpy()

        started = time.perf_counter()
        ort_fixed = run(g_session, "latent", fixed_latent)
        generator_seconds = time.perf_counter() - started
        ort_single = np.concatenate([run(g_session, "latent", item[None]) for item in fixed_latent])
        ort_evaluation = np.concatenate([run(g_session, "latent", evaluation_latent[i:i + 64]) for i in range(0, len(evaluation_latent), 64)])
        parity = {
            "generatorFixedBatch": generator_parity(torch_fixed, ort_fixed),
            "generatorFixedSingle": generator_parity(torch_fixed, ort_single),
            "generatorDevelopmentLatents": generator_parity(torch_evaluation, ort_evaluation),
            "discriminatorFixedSynthetic": discriminator_parity(torch_fixed_logits, run(d_session, "image", torch_fixed)),
            "discriminatorDevelopmentSynthetic": discriminator_parity(torch_evaluation_logits, run(d_session, "image", torch_evaluation)),
            "discriminatorDevelopmentReal": discriminator_parity(torch_real_logits, run(d_session, "image", real)),
            "discriminatorRealSingle": discriminator_parity(torch_real_logits[:REFERENCE_REAL_COUNT], np.concatenate([run(d_session, "image", item[None]) for item in real[:REFERENCE_REAL_COUNT]])),
        }
        # Registered previews were produced by PyTorch; ORT pixels must reproduce them too.
        samples = read_json(root / checkpoint["generator"]["path"].rsplit("/", 1)[0] / "samples.json")
        from PIL import Image
        registered = []
        for sample in samples:
            with Image.open(verify_asset(sample["image"]["asset"], root)) as image:
                registered.append(np.asarray(image, dtype=np.uint8))
        preview_difference = np.abs(np.stack(registered).astype(int) - image_bytes(torch.from_numpy(np.clip(ort_fixed, -1, 1))).astype(int))
        parity["registeredPreviews"] = {
            "count": len(registered), "pixelMaxDifference": int(preview_difference.max()),
            "pixelMismatches": int((preview_difference > 0).sum()), "pixelsCompared": int(preview_difference.size),
        }
        parity["registeredPreviews"]["passed"] = bool(
            parity["registeredPreviews"]["pixelMaxDifference"] <= TOLERANCE["pixelMaxDifference"]
            and parity["registeredPreviews"]["pixelMismatches"] <= TOLERANCE["pixelMismatchFraction"] * preview_difference.size
        )
        parity_passed &= all(item["passed"] for item in parity.values())

        reference_generator = directory / "reference-generator.f32"
        reference_generator.write_bytes(torch_fixed.astype("<f4").tobytes())
        exported.append({
            "checkpointId": checkpoint["id"],
            "epoch": checkpoint["epoch"],
            "generator": {"asset": asset(files["generator"], target), "sourceWeightsSha256": checkpoint["generator"]["sha256"], "operations": ops["generator"]},
            "discriminator": {"asset": asset(files["discriminator"], target), "sourceWeightsSha256": checkpoint["discriminator"]["sha256"], "operations": ops["discriminator"]},
            "reference": {
                "fixedLatentIndices": list(range(len(fixed_latent))),
                "generatorOutput": asset(reference_generator, target),
                "discriminatorSyntheticLogits": [float(v) for v in torch_fixed_logits[:, 0]],
                "discriminatorRealLogits": [float(v) for v in torch_real_logits[:REFERENCE_REAL_COUNT, 0]],
            },
            "pythonParity": parity,
            "pythonTiming": {"generatorBatch": len(fixed_latent), "generatorSeconds": generator_seconds},
        })

    active = next(item for item in exported if item["checkpointId"] == run_record["activeCheckpointId"])
    environment = run_record["environment"]
    manifest = record(
        "model-manifest",
        id=f"{run_record['id']}-onnx-v{EXPORT_VERSION}",
        runId=run_record["id"],
        family=config["family"],
        runtime="onnx",
        generator={"asset": active["generator"]["asset"], "input": {"name": "latent", "dtype": "float32", "shape": ["N", dimension, 1, 1]}, "output": {"name": "image", "dtype": "float32", "shape": ["N", 1, 28, 28]}},
        discriminator={"asset": active["discriminator"]["asset"], "input": {"name": "image", "dtype": "float32", "shape": ["N", 1, 28, 28]}, "output": {"name": "logit", "dtype": "float32", "shape": ["N", 1]}},
        image={"width": 28, "height": 28, "channels": 1, "layout": "NCHW", "range": [-1, 1]},
        latent={"dimension": dimension, "distribution": fixed["distribution"], "rngId": fixed["rngId"]},
        datasetId=split["datasetId"],
        splitManifest=run_record["split"],
        trainingConfig=run_record["config"],
        checkpointsPath="checkpoints.json",
        historyPath="history.json",
        fixedLatentSetId=fixed["id"],
        environment={"python": environment["python"], "pytorch": environment["pytorch"], "device": environment["device"]},
        activeCheckpointId=run_record["activeCheckpointId"],
    )
    for key in ("splitManifest", "trainingConfig"):
        verify_asset(manifest[key], root)
    if not parity_passed:
        raise ValueError("ONNX parity failed:\n" + json.dumps([item["pythonParity"] for item in exported], indent=2))

    source = work / "source"
    source.mkdir()
    code = []
    for name in ("export_onnx.py", "model.py", "common.py", "requirements.lock.txt"):
        shutil.copy2(ROOT / "training/enganai" / name, source / name)
        code.append(asset(source / name, target))
    write_json(target / "model-manifest.json", manifest)
    export = {
        "schemaVersion": 1,
        "kind": "onnx-export",
        "dataMode": "recorded",
        "id": manifest["id"],
        "version": EXPORT_VERSION,
        "runId": run_record["id"],
        "manifest": asset(target / "model-manifest.json", target),
        "fixedLatents": asset(root / "fixed-latents.json", root),
        "activeCheckpointId": run_record["activeCheckpointId"],
        "exporter": {
            "tool": "torch.onnx.export", "dynamo": True, "optimize": True, "opset": OPSET, "maxBatch": MAX_BATCH,
            "torch": torch.__version__, "onnx": onnx.__version__, "onnxruntime": onnxruntime.__version__,
        },
        "browserRuntime": {"package": "onnxruntime-web", "version": web_runtime, "executionProvider": "wasm"},
        "tolerance": TOLERANCE,
        "decision": "Threshold for D readings is sigmoid(logit) >= 0.5, equivalent to logit >= 0; scores are uncalibrated.",
        "realReference": {
            "asset": asset(reference_real, target), "datasetId": split["datasetId"], "partition": "development",
            "recordIds": real_ids[:REFERENCE_REAL_COUNT], "encoding": "uint8-row-major-28x28",
            "rule": "first-entries-of-evaluation-inputs",
        },
        "research": {"verification": research["status"], "previewsRecomputed": research["previewsRecomputed"]},
        "checkpoints": exported,
        "sourceCode": code,
        "officialTestEvaluated": False,
        "arenaUsedForParity": False,
    }
    validate_export(export, target, root)
    write_json(target / "onnx-export.json", export)
    if publish:
        if (root / "onnx").exists():
            shutil.rmtree(root / "onnx")
        shutil.copytree(work, root / "onnx")
        shutil.copy2(target / "model-manifest.json", root / "model-manifest.json")
        shutil.copy2(target / "onnx-export.json", root / "onnx-export.json")
        validate_export(read_json(root / "onnx-export.json"), root)
    return export


def validate_export(export, bundle, root=None):
    """`bundle` holds onnx/ and the manifest; `root` holds the research run (the same once published)."""
    bundle, root = Path(bundle), Path(root or bundle)

    def resolve(value):
        inside_bundle = value["path"].startswith("onnx/") or value["path"] == "model-manifest.json"
        return verify_asset(value, bundle if inside_bundle else root)

    if export["kind"] != "onnx-export" or export["dataMode"] != "recorded" or export["officialTestEvaluated"] or export["arenaUsedForParity"]:
        raise ValueError("Invalid ONNX export record")
    manifest = read_json(resolve(export["manifest"]))
    validate_record(manifest)
    if manifest["id"] != export["id"] or manifest["runId"] != export["runId"] or manifest["activeCheckpointId"] != export["activeCheckpointId"]:
        raise ValueError("Manifest/export mismatch")
    checkpoints = {item["id"]: item for item in read_json(root / manifest["checkpointsPath"])}
    if [item["checkpointId"] for item in export["checkpoints"]] != list(checkpoints):
        raise ValueError("Export must cover every registered checkpoint, in order")
    for item in export["checkpoints"]:
        registered = checkpoints[item["checkpointId"]]
        for key in ("generator", "discriminator"):
            resolve(item[key]["asset"])
            if item[key]["sourceWeightsSha256"] != registered[key]["sha256"]:
                raise ValueError("ONNX file is not linked to the registered weights")
        resolve(item["reference"]["generatorOutput"])
        if not all(result["passed"] for result in item["pythonParity"].values()):
            raise ValueError("Export contains failed parity")
        if not all(math.isfinite(v) for v in item["reference"]["discriminatorSyntheticLogits"] + item["reference"]["discriminatorRealLogits"]):
            raise ValueError("Non-finite reference logits")
    active = next(item for item in export["checkpoints"] if item["checkpointId"] == manifest["activeCheckpointId"])
    if manifest["generator"]["asset"] != active["generator"]["asset"] or manifest["discriminator"]["asset"] != active["discriminator"]["asset"]:
        raise ValueError("Manifest weights differ from the active checkpoint")
    resolve(export["realReference"]["asset"])
    resolve(export["fixedLatents"])
    for item in export["sourceCode"]:
        resolve(item)


def check_published(root):
    """Re-export into a temporary directory and require identical bytes and parity."""
    root = Path(root).resolve()
    published = read_json(root / "onnx-export.json")
    validate_export(published, root)
    with tempfile.TemporaryDirectory(prefix="enganai-onnx-check-") as temporary:
        fresh = export_run(root, temporary)
        for old, new in zip(published["checkpoints"], fresh["checkpoints"]):
            for key in ("generator", "discriminator"):
                if old[key]["asset"]["sha256"] != new[key]["asset"]["sha256"]:
                    raise ValueError(f"Re-export differs: {old['checkpointId']} {key}")
            if old["reference"]["generatorOutput"]["sha256"] != new["reference"]["generatorOutput"]["sha256"]:
                raise ValueError("Reference output differs")
    return {
        "status": "passed", "runId": published["runId"], "checkpoints": len(published["checkpoints"]),
        "reExportIdentical": True,
        "maxGeneratorError": max(r["maxAbsError"] for item in fresh["checkpoints"] for k, r in item["pythonParity"].items() if k.startswith("generator")),
        "maxLogitError": max(r["maxAbsError"] for item in fresh["checkpoints"] for k, r in item["pythonParity"].items() if k.startswith("discriminator")),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("run_directory", type=Path)
    parser.add_argument("--publish", action="store_true", help="Copy the verified export into the run directory")
    parser.add_argument("--check", action="store_true", help="Verify a published export by re-exporting it")
    args = parser.parse_args()
    torch.set_num_threads(2)
    if args.check:
        print(json.dumps(check_published(args.run_directory), indent=2))
    else:
        with tempfile.TemporaryDirectory(prefix="enganai-onnx-") as temporary:
            result = export_run(args.run_directory, temporary, publish=args.publish)
        summary = {item["checkpointId"]: {k: v["maxAbsError"] for k, v in item["pythonParity"].items() if "maxAbsError" in v} for item in result["checkpoints"]}
        print(json.dumps({"status": "passed", "published": args.publish, "maxAbsError": summary}, indent=2))
