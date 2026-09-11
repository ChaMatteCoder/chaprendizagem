"""Run each stage in a fresh process; smoke artifacts are always isolated."""
import argparse
import subprocess
import sys
from pathlib import Path

from common import HERE


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--smoke", action="store_true", help="100 per class, 2 epochs; never copies to public")
    parser.add_argument("--run-dir", type=Path)
    args = parser.parse_args()
    run = (args.run_dir or HERE / "runs" / ("smoke" if args.smoke else "full")).resolve()
    if (run / "training.json").exists():
        parser.error("This run is already trained. Choose a new --run-dir to preserve its evidence.")

    def execute(script, *parameters):
        subprocess.run([sys.executable, str(HERE / script), *map(str, parameters)], check=True)

    execute("download_quickdraw.py")
    execute("prepare_dataset.py", "--run-dir", run, "--per-class", 100 if args.smoke else 10000)
    execute("train_models.py", "--run-dir", run, "--epochs", 2 if args.smoke else 15)
    execute("evaluate_models.py", "--run-dir", run)
    execute("export_tfjs.py", "--run-dir", run, *([] if args.smoke else ["--publish"]))


if __name__ == "__main__":
    main()
