"""Figures from recorded images/losses; no generated illustrations or synthetic curves."""
import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

from common import read_json, verify_asset, write_json


def report(run_dir, output):
    run_dir, output = Path(run_dir), Path(output)
    run = read_json(run_dir / "run.json")
    if run["status"] != "completed":
        raise ValueError("Only completed runs can be reported")
    checkpoints = read_json(run_dir / "checkpoints.json")
    output.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False, "axes.spines.right": False})
    columns = 8
    fig, axes = plt.subplots(len(checkpoints), columns, figsize=(12, len(checkpoints) * 1.7), squeeze=False)
    for row, checkpoint in enumerate(checkpoints):
        directory = (run_dir / checkpoint["generator"]["path"]).parent
        samples = read_json(directory / "samples.json")
        for column, sample in enumerate(samples[:columns]):
            image = Image.open(verify_asset(sample["image"]["asset"], run_dir))
            axes[row, column].imshow(image, cmap="gray", vmin=0, vmax=255, interpolation="nearest")
            axes[row, column].set_xticks([])
            axes[row, column].set_yticks([])
            for spine in axes[row, column].spines.values():
                spine.set_visible(False)
            if row == 0:
                axes[row, column].set_title(f"z{column + 1:02d}")
        epoch = checkpoint["epoch"]
        axes[row, 0].set_ylabel("Sem treino" if epoch == 0 else f"Época {epoch}", fontsize=11, labelpad=14)
    fig.suptitle("enGAN.AI · evolução registrada da DCGAN", x=.06, ha="left", fontsize=18, weight="bold")
    fig.text(.06, .925, "Cada coluna usa o mesmo vetor z. Pixels originais 28 × 28; escala fixa de 0 a 255.", fontsize=10)
    fig.text(.06, .025, f"Execução: {run['id']} · amostras sem seleção por aparência · nenhum dado do teste oficial no treino.", fontsize=9, color="#555555")
    fig.subplots_adjust(left=.09, right=.99, top=.87, bottom=.08, wspace=.15, hspace=.22)
    fig.savefig(output / "evolucao.png", dpi=180, facecolor="white")
    plt.close(fig)

    points = read_json(run_dir / "history.json")["points"]
    epochs = read_json(run_dir / "epochs.json")
    fig, ax = plt.subplots(figsize=(10, 4.8))
    for key, title, color in (("generatorLoss", "Gerador", "#775569"), ("discriminatorLoss", "Discriminador", "#375F63")):
        ax.plot([p["globalStep"] for p in points], [p[key] for p in points], color=color, alpha=.2, linewidth=.45)
        # Weighted epoch means are recorded by training, not an invented smoothed trajectory.
        ax.plot([p["globalStep"] for p in epochs], [p[key] for p in epochs], color=color, marker="o", label=f"{title}: média ponderada por época", linewidth=1.8)
    ax.set(xlabel="Passo de atualização (um passo de D + um de G)", ylabel="BCE com logits", ylim=(0, None))
    ax.grid(alpha=.15)
    ax.legend(frameon=False, fontsize=9)
    fig.suptitle("Perdas observadas · não medem sozinhas a qualidade das imagens", x=.075, ha="left", fontsize=13, weight="bold")
    fig.text(.075, .025, "D soma as médias dos lotes real e sintético; G usa alvo real (objetivo não saturante). Traços claros: cada passo.", fontsize=8)
    fig.tight_layout(rect=(0, .055, 1, .94))
    fig.savefig(output / "perdas.png", dpi=180, facecolor="white")
    plt.close(fig)
    final = read_json(run_dir / "diagnostics.json")[-1]
    write_json(output / "resultado.json", {
        "runId": run["id"], "epochs": run["completedEpochs"], "optimizerSteps": run["globalStep"],
        "trainingRecords": run["trainingRecords"], "elapsedSeconds": run["elapsedSeconds"],
        "generatorParameters": run["architecture"]["generatorParameters"], "discriminatorParameters": run["architecture"]["discriminatorParameters"],
        "finalEpochLosses": epochs[-1], "developmentDiagnostics": final,
        "diagnosticMeaning": "D distinguishes held-out real development images from current G outputs. This is not image quality, test accuracy, nor general AI detection.",
        "selection": run["selection"], "testEvaluated": False,
    })
    print(f"Figures and results: {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("run_directory", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report(args.run_directory, args.output)
