"""Strict JSON, artifact identity and the approved stage-01 record schemas."""
import hashlib
import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CACHE = HERE / "cache"
SCHEMA = json.loads((ROOT / "docs/enganai/etapa-01/contracts/schema.v1.json").read_text())


def read_json(path):
    def reject(value):
        raise ValueError(f"Non-finite JSON: {value}")
    return json.loads(Path(path).read_text(), parse_constant=reject)


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
    temporary.replace(path)


def digest(path, algorithm="sha256"):
    h = hashlib.new(algorithm)
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def asset(path, root):
    path, root = Path(path).resolve(), Path(root).resolve()
    return {"path": path.relative_to(root).as_posix(), "sha256": digest(path), "bytes": path.stat().st_size}


def verify_asset(value, root):
    relative = Path(value["path"])
    if relative.is_absolute() or any(part in (".", "..") for part in value["path"].split("/")):
        raise ValueError("Invalid artifact path")
    path = (Path(root) / relative).resolve()
    path.relative_to(Path(root).resolve())
    if asset(path, root) != value:
        raise ValueError(f"Artifact bytes/hash mismatch: {value['path']}")
    return path


def record(kind, **fields):
    result = {"schemaVersion": 1, "kind": kind, "dataMode": "recorded", **fields}
    validate_record(result)
    return result


def validate_record(value):
    kind = value["kind"]
    schema = {"$schema": SCHEMA["$schema"], "$ref": f"#/$defs/{kind}", "$defs": SCHEMA["$defs"]}
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(value)
    if value["dataMode"] != "recorded":
        raise ValueError("Fixtures cannot enter a training run")
