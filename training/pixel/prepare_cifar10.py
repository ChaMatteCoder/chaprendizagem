#!/usr/bin/env python3
"""Aquisição, verificação de integridade, divisão estratificada 45k/5k/10k e pacote de demonstração CIFAR-10."""

import argparse
import base64
import glob
import hashlib
import json
import math
import pickle
import sys
import tarfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

for _cached_pkg in glob.glob(str(Path.home() / ".cache/uv/archive-v0/*")):
    if _cached_pkg not in sys.path:
        sys.path.append(_cached_pkg)

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE_DIR = HERE / "cache"
PUBLIC_DATA_DIR = ROOT / "public/data/pixel"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def file_hashes(path: Path):
    sha = hashlib.sha256()
    md5 = hashlib.md5()
    size = 0
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            size += len(chunk)
            sha.update(chunk)
            md5.update(chunk)
    return {"byteLength": size, "sha256": sha.hexdigest(), "md5": md5.hexdigest()}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def imul32(a: int, b: int) -> int:
    return ((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF)) & 0xFFFFFFFF


def mulberry32(seed: int):
    state = seed & 0xFFFFFFFF

    def next_float() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = imul32(state ^ (state >> 15), 1 | state)
        t = ((t + imul32(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return next_float


def create_stratified_split(labels: np.ndarray, val_per_class: int = 500, num_classes: int = 10, seed: int = 42):
    train_indices = []
    val_indices = []
    class_counts = []

    for c in range(num_classes):
        indices = sorted(int(i) for i in np.flatnonzero(labels == c))
        if len(indices) <= val_per_class:
            raise ValueError(f"Classe {c} possui apenas {len(indices)} amostras.")
        rng = mulberry32(seed + c)
        for i in range(len(indices) - 1, 0, -1):
            j = int(math.floor(rng() * (i + 1)))
            indices[i], indices[j] = indices[j], indices[i]
        class_val = sorted(indices[:val_per_class])
        class_train = sorted(indices[val_per_class:])
        val_indices.extend(class_val)
        train_indices.extend(class_train)
        class_counts.append({
            "classIndex": c,
            "total": len(indices),
            "train": len(class_train),
            "validation": len(class_val),
        })

    return {
        "seed": seed,
        "valPerClass": val_per_class,
        "trainIndices": train_indices,
        "valIndices": val_indices,
        "classCounts": class_counts,
    }


def clamp_and_round_uint8(val: float) -> int:
    clamped = min(255.0, max(0.0, float(val)))
    return min(255, int(math.floor(clamped + 0.5)))


def apply_interference_py(pixels_uint8: np.ndarray, contrast: float, brightness: float, noise_std: float, seed: int) -> np.ndarray:
    flat = pixels_uint8.reshape(-1).astype(np.float64)
    rng = mulberry32(seed)
    out = np.empty(flat.shape[0], dtype=np.uint8)
    for i in range(flat.shape[0]):
        noise = (2.0 * rng() - 1.0) if noise_std > 0 else 0.0
        v1 = 127.5 + contrast * (flat[i] - 127.5)
        v2 = v1 + brightness
        v3 = v2 + noise_std * noise if noise_std > 0 else v2
        out[i] = clamp_and_round_uint8(v3)
    return out.reshape(32, 32, 3)


def apply_restoration_py(corrupted_uint8: np.ndarray, smoothing: float, contrast: float, brightness: float) -> np.ndarray:
    src = corrupted_uint8.astype(np.float64)
    mean3x3 = np.empty_like(src)
    if smoothing > 0:
        for y in range(32):
            rows = [max(0, y - 1), y, min(31, y + 1)]
            for x in range(32):
                cols = [max(0, x - 1), x, min(31, x + 1)]
                for c in range(3):
                    s = 0.0
                    for ry in rows:
                        for rx in cols:
                            s += src[ry, rx, c]
                    mean3x3[y, x, c] = s / 9.0
    flat_src = src.reshape(-1)
    flat_mean = mean3x3.reshape(-1)
    out = np.empty(flat_src.shape[0], dtype=np.uint8)
    for i in range(flat_src.shape[0]):
        u1 = (1.0 - smoothing) * flat_src[i] + smoothing * flat_mean[i] if smoothing > 0 else flat_src[i]
        u2 = 127.5 + contrast * (u1 - 127.5)
        u3 = u2 + brightness
        out[i] = clamp_and_round_uint8(u3)
    return out.reshape(32, 32, 3)


def ensure_archive(lock: dict, download: bool) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    archive_path = CACHE_DIR / lock["filename"]
    expected_size = int(lock["byteLength"])

    if archive_path.exists() and archive_path.stat().st_size == expected_size:
        observed = file_hashes(archive_path)
        if observed["sha256"] == lock["sha256"] and observed["md5"] == lock["md5"]:
            return archive_path
        archive_path.unlink()

    if not download:
        raise FileNotFoundError(
            f"Arquivo {archive_path} ausente ou incompleto. Execute com --download para baixar da fonte oficial."
        )

    url = lock["downloadUrl"]
    current_size = archive_path.stat().st_size if archive_path.exists() else 0
    if current_size > expected_size:
        archive_path.unlink()
        current_size = 0

    if current_size < expected_size:
        import concurrent.futures

        chunk_size = 4 * 1024 * 1024
        ranges = []
        pos = current_size
        while pos < expected_size:
            end = min(pos + chunk_size - 1, expected_size - 1)
            ranges.append((pos, end))
            pos = end + 1

        print(
            f"Baixando {expected_size - current_size:,} bytes restantes de {url} em {len(ranges)} blocos paralelos...",
            flush=True,
        )

        def fetch_range(byte_range):
            start_b, end_b = byte_range
            expected_len = end_b - start_b + 1
            for attempt in range(4):
                try:
                    req = urllib.request.Request(
                        url,
                        headers={
                            "User-Agent": "ChAprendizagem-CIFAR10/1.0",
                            "Range": f"bytes={start_b}-{end_b}",
                        },
                    )
                    with urllib.request.urlopen(req, timeout=45) as resp:
                        data = resp.read()
                        if len(data) == expected_len:
                            return start_b, data
                except Exception as exc:
                    if attempt == 3:
                        raise exc
            raise RuntimeError(f"Falha ao baixar bloco {start_b}-{end_b}")

        mode = "r+b" if archive_path.exists() else "wb"
        with archive_path.open(mode) as out_file:
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                futures = [pool.submit(fetch_range, r) for r in ranges]
                for fut in concurrent.futures.as_completed(futures):
                    start_b, data = fut.result()
                    out_file.seek(start_b)
                    out_file.write(data)
                    out_file.flush()

    observed = file_hashes(archive_path)
    if (
        observed["byteLength"] != lock["byteLength"]
        or observed["sha256"] != lock["sha256"]
        or observed["md5"] != lock["md5"]
    ):
        raise ValueError(
            f"Integridade do arquivo {archive_path} falhou: esperado SHA-256 {lock['sha256']}, obtido {observed['sha256']}"
        )
    return archive_path


def load_batches_from_tar(archive_path: Path, lock: dict):
    expected_en = [item["en"] for item in lock["classOrder"]]
    train_images = []
    train_labels = []
    train_filenames = []
    batch_Hashes = {}

    with tarfile.open(archive_path, "r:gz") as tar:
        meta_bytes = tar.extractfile(lock["expectedBatches"]["meta"]).read()
        batch_Hashes[lock["expectedBatches"]["meta"]] = sha256_bytes(meta_bytes)
        meta = pickle.loads(meta_bytes, encoding="latin1")
        label_names = list(meta.get("label_names", []))
        if label_names != expected_en:
            raise ValueError(f"Ordem das classes inesperada em batches.meta: {label_names} != {expected_en}")

        for batch_idx, member_name in enumerate(lock["expectedBatches"]["train"], start=1):
            raw_bytes = tar.extractfile(member_name).read()
            batch_Hashes[member_name] = sha256_bytes(raw_bytes)
            batch = pickle.loads(raw_bytes, encoding="latin1")
            data = np.asarray(batch["data"], dtype=np.uint8)
            labels = np.asarray(batch["labels"], dtype=np.int32)
            filenames = [str(f) for f in batch.get("filenames", [f"batch_{batch_idx}_{i}.png" for i in range(len(labels))])]
            if data.shape != (10000, 3072) or labels.shape != (10000,):
                raise ValueError(f"Formato inválido em {member_name}: {data.shape}, {labels.shape}")
            # CIFAR-10 armazena 1024 R, 1024 G, 1024 B (CHW planar) -> converte para NHWC (32, 32, 3)
            images_nhwc = data.reshape(10000, 3, 32, 32).transpose(0, 2, 3, 1).copy()
            train_images.append(images_nhwc)
            train_labels.append(labels)
            train_filenames.extend(filenames)

        test_bytes = tar.extractfile(lock["expectedBatches"]["test"]).read()
        batch_Hashes[lock["expectedBatches"]["test"]] = sha256_bytes(test_bytes)
        test_batch = pickle.loads(test_bytes, encoding="latin1")
        test_data = np.asarray(test_batch["data"], dtype=np.uint8)
        test_labels = np.asarray(test_batch["labels"], dtype=np.int32)
        test_filenames = [str(f) for f in test_batch.get("filenames", [f"test_{i}.png" for i in range(len(test_labels))])]
        if test_data.shape != (10000, 3072) or test_labels.shape != (10000,):
            raise ValueError(f"Formato inválido em test_batch: {test_data.shape}, {test_labels.shape}")
        x_test_all = test_data.reshape(10000, 3, 32, 32).transpose(0, 2, 3, 1).copy()

    x_train_all = np.concatenate(train_images, axis=0)
    y_train_all = np.concatenate(train_labels, axis=0)
    return {
        "labelNames": label_names,
        "xTrainAll": x_train_all,
        "yTrainAll": y_train_all,
        "trainFilenames": train_filenames,
        "xTest": x_test_all,
        "yTest": test_labels,
        "testFilenames": test_filenames,
        "batchSha256": batch_Hashes,
    }


def prepare(download: bool = False, check_only: bool = False):
    lock = read_json(HERE / "sources.lock.json")
    config = read_json(HERE / "config.json")
    archive_path = ensure_archive(lock, download=download)
    loaded = load_batches_from_tar(archive_path, lock)

    split = create_stratified_split(
        loaded["yTrainAll"],
        val_per_class=config["splits"]["validationPerClass"],
        num_classes=10,
        seed=config["seed"],
    )

    train_idx = np.asarray(split["trainIndices"], dtype=np.int32)
    val_idx = np.asarray(split["valIndices"], dtype=np.int32)
    if len(set(split["trainIndices"]).intersection(split["valIndices"])) != 0:
        raise ValueError("Vazamento detectado entre treino e validação.")

    x_train = loaded["xTrainAll"][train_idx]
    y_train = loaded["yTrainAll"][train_idx]
    x_val = loaded["xTrainAll"][val_idx]
    y_val = loaded["yTrainAll"][val_idx]
    x_test = loaded["xTest"]
    y_test = loaded["yTest"]

    if not check_only:
        npz_path = CACHE_DIR / "cifar10_split.npz"
        np.savez_compressed(
            npz_path,
            x_train=x_train,
            y_train=y_train,
            train_indices=train_idx,
            x_val=x_val,
            y_val=y_val,
            val_indices=val_idx,
            x_test=x_test,
            y_test=y_test,
        )

    # Seleciona pacote de demonstração fixo da validação: 10 primeiras amostras de validação de cada classe
    demo_per_class = config["splits"]["demoPerClass"]
    demo_samples = []
    demo_ids_by_class = {}

    for class_info in lock["classOrder"]:
        c = class_info["index"]
        class_val_positions = [pos for pos, idx in enumerate(split["valIndices"]) if int(loaded["yTrainAll"][idx]) == c]
        selected_positions = class_val_positions[:demo_per_class]
        demo_ids_by_class[str(c)] = []
        for pos in selected_positions:
            orig_train_index = int(split["valIndices"][pos])
            sample_id = f"cifar10-val-{orig_train_index:05d}"
            demo_ids_by_class[str(c)].append(sample_id)
            img = loaded["xTrainAll"][orig_train_index]
            raw_bytes = img.tobytes(order="C")
            demo_samples.append({
                "id": sample_id,
                "originalTrainIndex": orig_train_index,
                "sourceBatch": f"data_batch_{(orig_train_index // 10000) + 1}",
                "sourceFilename": loaded["trainFilenames"][orig_train_index],
                "partition": "validation",
                "demonstrationOnly": True,
                "label": c,
                "classId": class_info["en"],
                "classNamePt": class_info["pt"],
                "sha256": sha256_bytes(raw_bytes),
                "pixelsBase64": base64.b64encode(raw_bytes).decode("ascii"),
            })

    # Casos de referência para validar equivalência pixel a pixel entre Python e JavaScript
    reference_fixtures = []
    for i, preset in enumerate([
        {"contrast": 0.75, "brightness": -36, "noiseStd": 14, "seed": 1001, "smoothing": 0.35, "restContrast": 1.3, "restBrightness": 28},
        {"contrast": 0.65, "brightness": 28, "noiseStd": 20, "seed": 2002, "smoothing": 0.55, "restContrast": 1.45, "restBrightness": -20},
        {"contrast": 1.4, "brightness": -22, "noiseStd": 16, "seed": 3003, "smoothing": 0.2, "restContrast": 0.8, "restBrightness": 18},
    ]):
        sample = demo_samples[i * 10]
        orig = np.frombuffer(base64.b64decode(sample["pixelsBase64"]), dtype=np.uint8).reshape(32, 32, 3)
        corrupted = apply_interference_py(orig, preset["contrast"], preset["brightness"], preset["noiseStd"], preset["seed"])
        restored = apply_restoration_py(corrupted, preset["smoothing"], preset["restContrast"], preset["restBrightness"])
        reference_fixtures.append({
            "sampleId": sample["id"],
            "interference": {
                "contrast": preset["contrast"],
                "brightness": preset["brightness"],
                "noiseStd": preset["noiseStd"],
                "seed": preset["seed"],
            },
            "restoration": {
                "smoothing": preset["smoothing"],
                "contrast": preset["restContrast"],
                "brightness": preset["restBrightness"],
            },
            "corruptedSha256": sha256_bytes(corrupted.tobytes()),
            "corruptedBase64": base64.b64encode(corrupted.tobytes()).decode("ascii"),
            "restoredSha256": sha256_bytes(restored.tobytes()),
            "restoredBase64": base64.b64encode(restored.tobytes()).decode("ascii"),
        })

    provenance_payload = {
        "schemaVersion": 1,
        "dataset": lock["dataset"],
        "catalogUrl": lock["catalogUrl"],
        "downloadUrl": lock["downloadUrl"],
        "citation": lock["citation"],
        "archive": {
            "filename": lock["filename"],
            "byteLength": lock["byteLength"],
            "md5": lock["md5"],
            "sha256": lock["sha256"],
        },
        "batchSha256": loaded["batchSha256"],
        "imageSpec": config["preprocessing"],
        "classOrder": lock["classOrder"],
        "counts": {
            "total": 60000,
            "officialTrain": 50000,
            "officialTest": 10000,
            "trainSplit": int(x_train.shape[0]),
            "validationSplit": int(x_val.shape[0]),
            "demoValidationPack": len(demo_samples),
        },
    }

    partitions_payload = {
        "schemaVersion": 1,
        "protocolId": config["protocolId"],
        "seed": config["seed"],
        "algorithm": "Mulberry32(seed + classIndex) + Fisher-Yates stratified split over 50,000 official training images",
        "archiveSha256": lock["sha256"],
        "counts": {
            "train": int(x_train.shape[0]),
            "validation": int(x_val.shape[0]),
            "officialTest": int(x_test.shape[0]),
            "demoPack": len(demo_samples),
        },
        "perClass": [
            {
                "classIndex": c["classIndex"],
                "classId": lock["classOrder"][c["classIndex"]]["en"],
                "classNamePt": lock["classOrder"][c["classIndex"]]["pt"],
                "officialTrain": c["total"],
                "train": c["train"],
                "validation": c["validation"],
                "officialTest": int(np.sum(y_test == c["classIndex"])),
                "demoCount": demo_per_class,
            }
            for c in split["classCounts"]
        ],
        "trainIndicesSha256": sha256_bytes(json.dumps(split["trainIndices"]).encode("utf-8")),
        "validationIndicesSha256": sha256_bytes(json.dumps(split["valIndices"]).encode("utf-8")),
        "demoSampleIds": [s["id"] for s in demo_samples],
        "demoIdsByClass": demo_ids_by_class,
    }

    demo_payload = {
        "schemaVersion": 1,
        "protocolId": config["protocolId"],
        "sourcePartition": "validation",
        "demonstrationNotice": "Pacote fixo de 100 imagens reais da partição de validação (10 por classe). Usado pelo jogo Pixel em Pânico! e pelo PixelLab para demonstração local sem exigir o download das 60.000 imagens.",
        "imageSpec": config["preprocessing"],
        "classOrder": lock["classOrder"],
        "samples": demo_samples,
        "pixelOpsReferenceFixtures": reference_fixtures,
    }

    if check_only:
        for name, expected_obj in [
            ("provenance.json", provenance_payload),
            ("partitions.json", partitions_payload),
            ("demo-samples.json", demo_payload),
        ]:
            target = PUBLIC_DATA_DIR / name
            if not target.exists():
                raise FileNotFoundError(f"Arquivo esperado ausente: {target}")
            current = read_json(target)
            if current != expected_obj:
                raise ValueError(f"Manifesto {name} diverge da reprodução determinística.")
        print("Verificação do CIFAR-10 e manifestos aprovada com sucesso.", flush=True)
        return

    write_json(PUBLIC_DATA_DIR / "provenance.json", provenance_payload)
    write_json(PUBLIC_DATA_DIR / "partitions.json", partitions_payload)
    write_json(PUBLIC_DATA_DIR / "demo-samples.json", demo_payload)
    print(
        f"CIFAR-10 preparado: treino={x_train.shape[0]}, validação={x_val.shape[0]}, "
        f"teste={x_test.shape[0]}, demo={len(demo_samples)} amostras.",
        flush=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Baixar cifar-10-python.tar.gz se não estiver em cache.")
    parser.add_argument("--check", action="store_true", help="Apenas verificar integridade e manifestos sem sobrescrever.")
    args = parser.parse_args()
    prepare(download=args.download, check_only=args.check)
