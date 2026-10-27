#!/usr/bin/env python3
"""Treinamento real da CNN CIFAR-10, seleção de checkpoint na validação, avaliação única no teste oficial e exportação TF.js."""

import argparse
import glob
import hashlib
import json
import math
import platform
import random
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

for _cached_pkg in glob.glob(str(Path.home() / ".cache/uv/archive-v0/*")):
    if _cached_pkg not in sys.path:
        sys.path.append(_cached_pkg)

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE_DIR = HERE / "cache"
PUBLIC_MODEL_DIR = ROOT / "public/models/pixel/official"
PUBLIC_DATA_DIR = ROOT / "public/data/pixel"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def mulberry32_batch_noise(seeds: np.ndarray, length: int = 3072) -> np.ndarray:
    state = np.asarray(seeds, dtype=np.uint64) & 0xFFFFFFFF
    noise = np.empty((state.shape[0], length), dtype=np.float64)
    for i in range(length):
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((state ^ (state >> 15)) * (1 | state)) & 0xFFFFFFFF
        t = (((t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) & 0xFFFFFFFF) ^ t) & 0xFFFFFFFF
        u = ((t ^ (t >> 14)) & 0xFFFFFFFF).astype(np.float64) / 4294967296.0
        noise[:, i] = 2.0 * u - 1.0
    return noise


def apply_interference_batch(images_uint8: np.ndarray, contrast: float, brightness: float, noise_std: float, seeds: np.ndarray) -> np.ndarray:
    n = images_uint8.shape[0]
    flat = images_uint8.reshape(n, -1).astype(np.float64)
    v = 127.5 + float(contrast) * (flat - 127.5) + float(brightness)
    if noise_std > 0:
        v = v + float(noise_std) * mulberry32_batch_noise(seeds, flat.shape[1])
    clamped = np.clip(v, 0.0, 255.0)
    rounded = np.minimum(255, np.floor(clamped + 0.5).astype(np.int32)).astype(np.uint8)
    return rounded.reshape(n, 32, 32, 3)


def compute_classification_metrics(y_true: np.ndarray, probs: np.ndarray, class_order: list):
    num_classes = len(class_order)
    y_true = np.asarray(y_true, dtype=np.int32)
    probs = np.asarray(probs, dtype=np.float64)
    y_pred = np.argmax(probs, axis=1).astype(np.int32)
    total = int(y_true.shape[0])
    correct = int(np.sum(y_pred == y_true))
    accuracy = float(correct / total) if total > 0 else 0.0

    # Cross-entropy categórica com clipping float32 padrão (1e-7)
    clipped_probs = np.clip(probs[np.arange(total), y_true], 1e-7, 1.0)
    cross_entropy = float(-np.mean(np.log(clipped_probs)))

    confusion = np.zeros((num_classes, num_classes), dtype=np.int32)
    for t, p in zip(y_true, y_pred):
        confusion[int(t), int(p)] += 1

    per_class = []
    f1_scores = []
    precisions = []
    recalls = []

    for c in range(num_classes):
        tp = int(confusion[c, c])
        fp = int(np.sum(confusion[:, c]) - tp)
        fn = int(np.sum(confusion[c, :]) - tp)
        support = int(np.sum(confusion[c, :]))
        zero_denoms = []

        if tp + fp == 0:
            precision = 0.0
            zero_denoms.append("precision")
        else:
            precision = float(tp / (tp + fp))

        if tp + fn == 0:
            recall = 0.0
            zero_denoms.append("recall")
        else:
            recall = float(tp / (tp + fn))

        if precision + recall == 0.0:
            f1 = 0.0
            zero_denoms.append("f1")
        else:
            f1 = float(2.0 * precision * recall / (precision + recall))

        f1_scores.append(f1)
        precisions.append(precision)
        recalls.append(recall)
        per_class.append({
            "classIndex": c,
            "classId": class_order[c]["en"],
            "classNamePt": class_order[c]["pt"],
            "support": support,
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "zeroDenominators": zero_denoms,
        })

    return {
        "total": total,
        "correct": correct,
        "accuracy": accuracy,
        "crossEntropy": cross_entropy,
        "macroPrecision": float(np.mean(precisions)),
        "macroRecall": float(np.mean(recalls)),
        "macroF1": float(np.mean(f1_scores)),
        "confusionMatrix": confusion.tolist(),
        "perClass": per_class,
    }


def build_tfjs_model_json(weight_specs: list) -> dict:
    return {
        "format": "layers-model",
        "generatedBy": "keras v2.15.0 / PixelLab CIFAR-10 CNN exporter",
        "convertedBy": "training/pixel/train_cnn.py schema v1",
        "modelTopology": {
            "keras_version": "2.15.0",
            "backend": "tensorflow",
            "model_config": {
                "class_name": "Sequential",
                "config": {
                    "name": "pixel_cifar10_cnn",
                    "layers": [
                        {
                            "class_name": "InputLayer",
                            "config": {
                                "batch_input_shape": [None, 32, 32, 3],
                                "dtype": "float32",
                                "sparse": False,
                                "name": "input_rgb",
                            },
                        },
                        {
                            "class_name": "Conv2D",
                            "config": {
                                "name": "conv2d_1",
                                "trainable": True,
                                "dtype": "float32",
                                "filters": 32,
                                "kernel_size": [3, 3],
                                "strides": [1, 1],
                                "padding": "same",
                                "data_format": "channels_last",
                                "dilation_rate": [1, 1],
                                "activation": "relu",
                                "use_bias": True,
                            },
                        },
                        {
                            "class_name": "MaxPooling2D",
                            "config": {
                                "name": "max_pooling2d_1",
                                "trainable": True,
                                "dtype": "float32",
                                "pool_size": [2, 2],
                                "padding": "valid",
                                "strides": [2, 2],
                                "data_format": "channels_last",
                            },
                        },
                        {
                            "class_name": "Conv2D",
                            "config": {
                                "name": "conv2d_2",
                                "trainable": True,
                                "dtype": "float32",
                                "filters": 64,
                                "kernel_size": [3, 3],
                                "strides": [1, 1],
                                "padding": "same",
                                "data_format": "channels_last",
                                "dilation_rate": [1, 1],
                                "activation": "relu",
                                "use_bias": True,
                            },
                        },
                        {
                            "class_name": "MaxPooling2D",
                            "config": {
                                "name": "max_pooling2d_2",
                                "trainable": True,
                                "dtype": "float32",
                                "pool_size": [2, 2],
                                "padding": "valid",
                                "strides": [2, 2],
                                "data_format": "channels_last",
                            },
                        },
                        {
                            "class_name": "Conv2D",
                            "config": {
                                "name": "conv2d_3",
                                "trainable": True,
                                "dtype": "float32",
                                "filters": 64,
                                "kernel_size": [3, 3],
                                "strides": [1, 1],
                                "padding": "same",
                                "data_format": "channels_last",
                                "dilation_rate": [1, 1],
                                "activation": "relu",
                                "use_bias": True,
                            },
                        },
                        {
                            "class_name": "GlobalAveragePooling2D",
                            "config": {
                                "name": "global_average_pooling2d_1",
                                "trainable": True,
                                "dtype": "float32",
                                "data_format": "channels_last",
                            },
                        },
                        {
                            "class_name": "Dense",
                            "config": {
                                "name": "dense_1",
                                "trainable": True,
                                "dtype": "float32",
                                "units": 64,
                                "activation": "relu",
                                "use_bias": True,
                            },
                        },
                        {
                            "class_name": "Dense",
                            "config": {
                                "name": "dense_2",
                                "trainable": True,
                                "dtype": "float32",
                                "units": 10,
                                "activation": "softmax",
                                "use_bias": True,
                            },
                        },
                    ],
                },
            },
        },
        "weightsManifest": [
            {
                "paths": ["weights.bin"],
                "weights": weight_specs,
            }
        ],
    }


def run_training_torch(x_train_u8, y_train, x_val_u8, y_val, x_test_u8, y_test, config: dict, smoke: bool):
    import torch
    import torch.nn as nn

    seed = int(config["seed"])
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    class Cifar10CompactCnn(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1, bias=True)
            self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1, bias=True)
            self.conv3 = nn.Conv2d(64, 64, kernel_size=3, padding=1, bias=True)
            self.dense1 = nn.Linear(64, 64, bias=True)
            self.dense2 = nn.Linear(64, 10, bias=True)
            self._init_weights()

        def _init_weights(self):
            for layer in [self.conv1, self.conv2, self.conv3, self.dense1, self.dense2]:
                nn.init.xavier_uniform_(layer.weight)
                nn.init.zeros_(layer.bias)

        def forward_logits(self, x):
            x = torch.relu(self.conv1(x))
            x = torch.max_pool2d(x, kernel_size=2, stride=2)
            x = torch.relu(self.conv2(x))
            x = torch.max_pool2d(x, kernel_size=2, stride=2)
            x = torch.relu(self.conv3(x))
            x = x.mean(dim=(2, 3))
            x = torch.relu(self.dense1(x))
            return self.dense2(x)

        def forward(self, x):
            return torch.softmax(self.forward_logits(x), dim=-1)

    model = Cifar10CompactCnn().to(device)
    train_cfg = config["training"]
    batch_size = int(config["smoke"]["batchSize"] if smoke else train_cfg["batchSize"])
    max_epochs = int(config["smoke"]["epochs"] if smoke else train_cfg["maxEpochs"])
    patience = int(train_cfg["earlyStopping"]["patience"])
    lr = float(train_cfg["learningRate"])

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=lr,
        betas=(float(train_cfg["beta1"]), float(train_cfg["beta2"])),
        eps=float(train_cfg["epsilon"]),
    )

    def predict_probs(images_u8: np.ndarray) -> np.ndarray:
        model.eval()
        n = images_u8.shape[0]
        probs_list = []
        with torch.no_grad():
            for start in range(0, n, 256):
                batch_u8 = images_u8[start : start + 256]
                batch_nchw = torch.from_numpy(batch_u8.transpose(0, 3, 1, 2)).to(device=device, dtype=torch.float32) / 255.0
                probs = model(batch_nchw).cpu().numpy()
                probs_list.append(probs)
        return np.concatenate(probs_list, axis=0)

    history = []
    best_val_loss = float("inf")
    best_epoch = 1
    best_state = None
    epochs_without_improvement = 0
    started_at = time.time()

    n_train = x_train_u8.shape[0]
    y_train_tensor = torch.from_numpy(y_train.astype(np.int64)).to(device)

    for epoch in range(1, max_epochs + 1):
        epoch_start = time.time()
        model.train()
        rng = np.random.RandomState(seed + epoch)
        perm = rng.permutation(n_train)

        running_loss = 0.0
        running_correct = 0
        seen = 0

        for start in range(0, n_train, batch_size):
            idx = perm[start : start + batch_size]
            bx_u8 = x_train_u8[idx]
            bx = torch.from_numpy(bx_u8.transpose(0, 3, 1, 2)).to(device=device, dtype=torch.float32) / 255.0
            by = y_train_tensor[idx]

            optimizer.zero_grad()
            probs = model(bx)
            # Cross-entropy sobre probabilidades Softmax (sem aplicar Softmax duas vezes)
            true_probs = torch.clamp(probs[torch.arange(by.shape[0], device=device), by], min=1e-7, max=1.0)
            loss = -torch.mean(torch.log(true_probs))
            loss.backward()
            optimizer.step()

            bs = int(by.shape[0])
            running_loss += float(loss.item()) * bs
            preds = torch.argmax(probs, dim=1)
            running_correct += int(torch.sum(preds == by).item())
            seen += bs

        train_loss = running_loss / seen
        train_acc = running_correct / seen

        val_probs = predict_probs(x_val_u8)
        val_clipped = np.clip(val_probs[np.arange(y_val.shape[0]), y_val], 1e-7, 1.0)
        val_loss = float(-np.mean(np.log(val_clipped)))
        val_acc = float(np.mean(np.argmax(val_probs, axis=1) == y_val))
        epoch_seconds = time.time() - epoch_start

        history.append({
            "epoch": epoch,
            "trainLoss": float(train_loss),
            "trainAccuracy": float(train_acc),
            "valLoss": float(val_loss),
            "valAccuracy": float(val_acc),
            "elapsedSeconds": float(round(epoch_seconds, 3)),
        })
        print(
            f"Época {epoch:02d}/{max_epochs:02d} — "
            f"train_loss={train_loss:.4f}, train_acc={train_acc*100:.2f}%, "
            f"val_loss={val_loss:.4f}, val_acc={val_acc*100:.2f}% ({epoch_seconds:.1f}s)",
            flush=True,
        )

        if val_loss < best_val_loss - 1e-5:
            best_val_loss = val_loss
            best_epoch = epoch
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            epochs_without_improvement = 0
        else:
            epochs_without_improvement += 1
            if not smoke and epochs_without_improvement >= patience:
                print(f"Early stopping acionado na época {epoch} (melhor época: {best_epoch}).", flush=True)
                break

    total_seconds = time.time() - started_at
    if best_state is not None:
        model.load_state_dict(best_state)
    model.eval()

    named_weights = [
        ("conv2d_1/kernel", model.conv1.weight.detach().cpu().permute(2, 3, 1, 0).contiguous().numpy()),
        ("conv2d_1/bias", model.conv1.bias.detach().cpu().contiguous().numpy()),
        ("conv2d_2/kernel", model.conv2.weight.detach().cpu().permute(2, 3, 1, 0).contiguous().numpy()),
        ("conv2d_2/bias", model.conv2.bias.detach().cpu().contiguous().numpy()),
        ("conv2d_3/kernel", model.conv3.weight.detach().cpu().permute(2, 3, 1, 0).contiguous().numpy()),
        ("conv2d_3/bias", model.conv3.bias.detach().cpu().contiguous().numpy()),
        ("dense_1/kernel", model.dense1.weight.detach().cpu().transpose(0, 1).contiguous().numpy()),
        ("dense_1/bias", model.dense1.bias.detach().cpu().contiguous().numpy()),
        ("dense_2/kernel", model.dense2.weight.detach().cpu().transpose(0, 1).contiguous().numpy()),
        ("dense_2/bias", model.dense2.bias.detach().cpu().contiguous().numpy()),
    ]

    return {
        "engine": f"Python {platform.python_version()} / PyTorch {torch.__version__} ({device.type.upper()}) -> Keras/TF.js Layers",
        "device": str(device),
        "threads": int(torch.get_num_threads()),
        "history": history,
        "bestEpoch": int(best_epoch),
        "bestValLoss": float(best_val_loss),
        "trainingSeconds": float(round(total_seconds, 3)),
        "namedWeights": named_weights,
        "predictProbs": predict_probs,
    }


def export_tfjs_artifacts(named_weights: list, export_dir: Path):
    export_dir.mkdir(parents=True, exist_ok=True)
    specs = []
    weights_bin_path = export_dir / "weights.bin"
    with weights_bin_path.open("wb") as out:
        for name, arr in named_weights:
            arr_f32 = np.asarray(arr, dtype=np.float32)
            if not np.all(np.isfinite(arr_f32)):
                raise ValueError(f"Pesos não finitos em {name}")
            specs.append({"name": name, "shape": list(arr_f32.shape), "dtype": "float32"})
            out.write(arr_f32.astype("<f4").tobytes(order="C"))
    model_json = build_tfjs_model_json(specs)
    write_json(export_dir / "model.json", model_json)


def evaluate_robustness(predict_probs, x_val_u8: np.ndarray, y_val: np.ndarray, config: dict, class_order: list):
    protocol = config["robustnessProtocol"]
    seed_base = int(protocol["seedBase"])
    n = x_val_u8.shape[0]

    clean_probs = predict_probs(x_val_u8)
    clean_preds = np.argmax(clean_probs, axis=1)
    clean_correct = clean_preds == y_val

    conditions_out = []
    for cond_idx, cond in enumerate(protocol["conditions"]):
        if cond["kind"] == "baseline":
            probs = clean_probs
            clipped_ratio = 0.0
        else:
            seeds = np.arange(n, dtype=np.uint32) + np.uint32(seed_base + cond_idx * 10000)
            corrupted = apply_interference_batch(
                x_val_u8,
                contrast=cond["contrast"],
                brightness=cond["brightness"],
                noise_std=cond["noiseStd"],
                seeds=seeds,
            )
            probs = predict_probs(corrupted)
            clipped_ratio = float(np.mean((corrupted == 0) | (corrupted == 255)))

        metrics = compute_classification_metrics(y_val, probs, class_order)
        preds = np.argmax(probs, axis=1)
        cond_correct = preds == y_val

        kept_correct = int(np.sum(clean_correct & cond_correct))
        degraded_to_error = int(np.sum(clean_correct & (~cond_correct)))
        recovered_to_correct = int(np.sum((~clean_correct) & cond_correct))
        kept_error = int(np.sum((~clean_correct) & (~cond_correct)))

        conditions_out.append({
            "id": cond["id"],
            "label": cond["label"],
            "kind": cond["kind"],
            "params": {
                "contrast": cond["contrast"],
                "brightness": cond["brightness"],
                "noiseStd": cond["noiseStd"],
            },
            "sampleCount": int(n),
            "accuracy": metrics["accuracy"],
            "macroF1": metrics["macroF1"],
            "crossEntropy": metrics["crossEntropy"],
            "accuracyDeltaVsClean": float(metrics["accuracy"] - float(np.mean(clean_correct))),
            "extremePixelFraction": clipped_ratio,
            "transitionsVsClean": {
                "keptCorrect": kept_correct,
                "degradedToError": degraded_to_error,
                "recoveredToCorrect": recovered_to_correct,
                "keptError": kept_error,
            },
        })

    return {
        "protocolId": config["protocolId"],
        "evaluationPartition": "validation",
        "sampleCount": int(n),
        "seedBase": seed_base,
        "note": "Avaliação agregada executada sobre o conjunto de validação com o modelo congelado, separando desempenho original e sob perturbações pré-definidas.",
        "conditions": conditions_out,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, default=HERE / "runs/official-v1")
    parser.add_argument("--smoke", action="store_true", help="Executar smoke test rápido em subconjunto.")
    parser.add_argument("--publish", action="store_true", help="Publicar artefatos verificados em public/models/pixel/official.")
    parser.add_argument("--epochs", type=int, default=None, help="Sobrescrever número máximo de épocas.")
    args = parser.parse_args()

    if args.publish and args.smoke:
        raise ValueError("Proibido publicar um modelo de smoke test como artefato oficial.")

    lock = read_json(HERE / "sources.lock.json")
    config = read_json(HERE / "config.json")
    if args.epochs is not None:
        config["training"]["maxEpochs"] = int(args.epochs)

    npz_path = CACHE_DIR / "cifar10_split.npz"
    if not npz_path.exists():
        raise FileNotFoundError(f"Cache {npz_path} ausente. Execute prepare_cifar10.py primeiro.")

    data = np.load(npz_path, allow_pickle=False)
    x_train = data["x_train"]
    y_train = data["y_train"]
    x_val = data["x_val"]
    y_val = data["y_val"]
    x_test = data["x_test"]
    y_test = data["y_test"]

    if args.smoke:
        train_sub, val_sub = [], []
        n_tr = int(config["smoke"]["trainPerClass"])
        n_va = int(config["smoke"]["valPerClass"])
        for c in range(10):
            train_sub.extend(np.flatnonzero(y_train == c)[:n_tr])
            val_sub.extend(np.flatnonzero(y_val == c)[:n_va])
        x_train = x_train[train_sub]
        y_train = y_train[train_sub]
        x_val = x_val[val_sub]
        y_val = y_val[val_sub]

    run_dir: Path = args.run_dir
    run_dir.mkdir(parents=True, exist_ok=True)

    trained = run_training_torch(x_train, y_train, x_val, y_val, x_test, y_test, config, smoke=args.smoke)

    export_dir = run_dir / "tfjs"
    export_tfjs_artifacts(trained["namedWeights"], export_dir)

    weights_sha256 = sha256_file(export_dir / "weights.bin")
    model_id = f"pixel-cifar10-cnn-{weights_sha256[:12]}"

    val_probs = trained["predictProbs"](x_val)
    val_metrics = compute_classification_metrics(y_val, val_probs, lock["classOrder"])

    if args.smoke:
        test_metrics = None
        robustness = evaluate_robustness(trained["predictProbs"], x_val, y_val, config, lock["classOrder"])
    else:
        print("Avaliando checkpoint final congelado no teste oficial de 10.000 imagens...", flush=True)
        test_probs = trained["predictProbs"](x_test)
        test_metrics = compute_classification_metrics(y_test, test_probs, lock["classOrder"])
        print(
            f"Teste oficial concluído: acurácia={test_metrics['accuracy']*100:.2f}%, "
            f"macro-F1={test_metrics['macroF1']*100:.2f}%, CE={test_metrics['crossEntropy']:.4f}",
            flush=True,
        )
        print("Executando protocolo agregado de robustez nas 5.000 imagens de validação...", flush=True)
        robustness = evaluate_robustness(trained["predictProbs"], x_val, y_val, config, lock["classOrder"])

    # Gera fixtures de paridade Python <-> TensorFlow.js (2 amostras de validação por classe = 20 amostras)
    parity_indices = []
    for c in range(10):
        parity_indices.extend(int(i) for i in np.flatnonzero(y_val == c)[:2])
    parity_x_u8 = x_val[parity_indices]
    parity_y = y_val[parity_indices]
    parity_probs = trained["predictProbs"](parity_x_u8)

    parity_payload = {
        "schemaVersion": 1,
        "modelId": model_id,
        "sampleCount": len(parity_indices),
        "shape": [len(parity_indices), 32, 32, 3],
        "labels": [int(v) for v in parity_y],
        "imagesUint8Flat": parity_x_u8.flatten().tolist(),
        "pythonProbabilities": parity_probs.tolist(),
        "pythonPredictedIndices": [int(v) for v in np.argmax(parity_probs, axis=1)],
    }
    write_json(run_dir / "parity-fixtures.json", parity_payload)

    completed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    history_payload = {
        "schemaVersion": 1,
        "modelId": model_id,
        "smoke": bool(args.smoke),
        "bestEpoch": trained["bestEpoch"],
        "bestValLoss": trained["bestValLoss"],
        "epochsRun": len(trained["history"]),
        "trainingSeconds": trained["trainingSeconds"],
        "epochs": trained["history"],
    }
    write_json(run_dir / "history.json", history_payload)
    write_json(run_dir / "robustness.json", robustness)

    metrics_payload = {
        "schemaVersion": 1,
        "modelId": model_id,
        "smoke": bool(args.smoke),
        "completedAt": completed_at,
        "protocolId": config["protocolId"],
        "seed": config["seed"],
        "engine": trained["engine"],
        "device": trained["device"],
        "threads": trained["threads"],
        "trainingSeconds": trained["trainingSeconds"],
        "bestEpoch": trained["bestEpoch"],
        "epochsRun": len(trained["history"]),
        "architecture": config["architecture"],
        "preprocessing": config["preprocessing"],
        "trainingConfig": config["training"],
        "classOrder": lock["classOrder"],
        "validation": val_metrics,
        "officialTest": test_metrics,
        "limitations": [
            "Imagens 32×32 possuem baixa resolução espacial; detalhes finos de textura podem ser ambíguos mesmo para observadores humanos.",
            "A CNN compacta (61.130 parâmetros) foi treinada do zero sem aumento de dados no MVP, tornando-a sensível a mudanças severas de iluminação e ruído.",
            "As probabilidades Softmax representam confiança numérica do modelo, não garantia de acerto nem probabilidades calibradas.",
            "Mapas de ativação descrevem correlações espaciais calculadas pelas camadas, não explicações causais de compreensão semântica.",
        ],
    }
    write_json(run_dir / "metrics.json", metrics_payload)

    # Verifica paridade real no Node com TensorFlow.js antes de publicar
    subprocess.run(
        ["node", str(HERE / "verify_official.mjs"), "--run-dir", str(run_dir.resolve())],
        check=True,
        cwd=ROOT,
    )

    parity_report = read_json(run_dir / "export-validation.json")
    metrics_payload["exportValidation"] = parity_report
    write_json(run_dir / "metrics.json", metrics_payload)

    if args.publish:
        PUBLIC_MODEL_DIR.mkdir(parents=True, exist_ok=True)
        files_meta = {}
        for src_path, target_name in [
            (export_dir / "model.json", "model.json"),
            (export_dir / "weights.bin", "weights.bin"),
            (run_dir / "metrics.json", "metrics.json"),
            (run_dir / "history.json", "history.json"),
            (run_dir / "robustness.json", "robustness.json"),
            (run_dir / "parity-fixtures.json", "parity-fixtures.json"),
        ]:
            dst = PUBLIC_MODEL_DIR / target_name
            shutil.copy2(src_path, dst)
            files_meta[target_name] = {
                "byteLength": dst.stat().st_size,
                "sha256": sha256_file(dst),
            }

        manifest_payload = {
            "schemaVersion": 1,
            "kind": "official",
            "smoke": False,
            "modelId": model_id,
            "protocolId": config["protocolId"],
            "completedAt": completed_at,
            "architectureId": config["architecture"]["id"],
            "parameterCount": config["architecture"]["totalParameters"],
            "inputShape": [32, 32, 3],
            "outputClasses": 10,
            "classOrder": lock["classOrder"],
            "preprocessing": config["preprocessing"],
            "datasetSha256": lock["sha256"],
            "evaluation": {
                "status": "completed",
                "validationSamples": val_metrics["total"],
                "validationAccuracy": val_metrics["accuracy"],
                "validationMacroF1": val_metrics["macroF1"],
                "testSamples": test_metrics["total"],
                "testAccuracy": test_metrics["accuracy"],
                "testMacroF1": test_metrics["macroF1"],
                "testCrossEntropy": test_metrics["crossEntropy"],
            },
            "exportParity": parity_report,
            "files": files_meta,
        }
        write_json(PUBLIC_MODEL_DIR / "manifest.json", manifest_payload)
        print(f"Modelo oficial {model_id} publicado e verificado em {PUBLIC_MODEL_DIR}", flush=True)


if __name__ == "__main__":
    main()
