"""Validate records produced by a real mission against the stage-01 contracts.

Reads JSON `{"records": [...]}` (samples, questions, reveals, session, progress)
and adds the published manifest, checkpoints, previews, fixed latents, arena latent
set and dataset split, so cross-record rules (partition, generator hash, latent RNG,
answer key, score, progress) are all checked with `require_recorded=True`.
"""
import importlib.util
import json
import sys
from pathlib import Path

from common import ROOT, read_json

RUN = ROOT / "public/models/enganai/research/cpu-no-batchnorm-v1"


def stage01_validator():
    spec = importlib.util.spec_from_file_location("stage01_validate", ROOT / "docs/enganai/etapa-01/validate.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.validate_bundle


def published_records():
    records = [read_json(RUN / "model-manifest.json"), read_json(RUN / "split.json"), read_json(RUN / "fixed-latents.json")]
    for checkpoint in read_json(RUN / "checkpoints.json"):
        records.append(checkpoint)
        records.extend(read_json(RUN / checkpoint["generator"]["path"].rsplit("/", 1)[0] / "samples.json"))
    records.append(read_json(ROOT / "public/data/enganai/arena/latent-pool.json"))
    return records


def onnx_weight_links():
    """ONNX -> .pt links, accepted only after the stage-04 export record verifies."""
    from export_onnx import validate_export
    export = read_json(RUN / "onnx-export.json")
    validate_export(export, RUN)
    return {item[key]["asset"]["sha256"]: item[key]["sourceWeightsSha256"] for item in export["checkpoints"] for key in ("generator", "discriminator")}


def validate(produced):
    errors = stage01_validator()({"records": published_records() + produced}, require_recorded=True, weight_links=onnx_weight_links())
    kinds = sorted({item["kind"] for item in produced})
    return {"status": "passed" if not errors else "failed", "producedRecords": len(produced), "kinds": kinds, "errors": errors}


if __name__ == "__main__":
    source = json.loads(Path(sys.argv[1]).read_text()) if len(sys.argv) > 1 else json.load(sys.stdin)
    result = validate(source["records"])
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result["status"] == "passed" else 1)
