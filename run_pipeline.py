"""
EcoSort AI - Full Training Pipeline Runner
==========================================
Runs all 5 pipeline steps in sequence:

    Step 1  Download TACO dataset
    Step 2  Convert COCO → YOLO format
    Step 3  Verify dataset
    Step 4  Split dataset (train / val / test)
    Step 5  Train YOLO model

Usage:
    python run_pipeline.py

Run from the EcoSortAI project root.
"""

import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent


def run_step(step_number: int, label: str, script: Path):

    print()
    print("=" * 60)
    print(f"Step {step_number}: {label}")
    print("=" * 60)

    if not script.exists():
        print(f"ERROR: Script not found: {script}")
        sys.exit(1)

    result = subprocess.run(
        [sys.executable, str(script)],
        cwd=str(PROJECT_ROOT)
    )

    if result.returncode != 0:
        print()
        print(f"Step {step_number} FAILED (exit code {result.returncode}).")
        print("Fix the error above, then re-run this script.")
        sys.exit(result.returncode)

    print()
    print(f"Step {step_number} complete.")


def main():

    print()
    print("=" * 60)
    print("EcoSort AI - Full Training Pipeline")
    print("=" * 60)
    print()
    print("This script will:")
    print("  1. Download the TACO garbage dataset (~1500 images)")
    print("  2. Convert COCO annotations to YOLO format")
    print("  3. Verify the converted dataset")
    print("  4. Split into train / val / test")
    print("  5. Train YOLOv11-nano for 100 epochs")
    print()
    print("Estimated time: 30–90 min depending on hardware")
    print()

    steps = [
        (
            1,
            "Download TACO Dataset",
            PROJECT_ROOT / "datasets" / "download_taco.py"
        ),
        (
            2,
            "Convert COCO → YOLO Format",
            PROJECT_ROOT / "ai" / "preprocessing" / "convert_coco_to_yolo.py"
        ),
        (
            3,
            "Verify Dataset",
            PROJECT_ROOT / "ai" / "preprocessing" / "verify_dataset.py"
        ),
        (
            4,
            "Split Dataset (Train / Val / Test)",
            PROJECT_ROOT / "ai" / "preprocessing" / "split_dataset.py"
        ),
        (
            5,
            "Train YOLO Model",
            PROJECT_ROOT / "ai" / "object_detection" / "train.py"
        ),
    ]

    for step_number, label, script in steps:
        run_step(step_number, label, script)

    print()
    print("=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    print()
    print("Trained model saved to:")
    print("  models/object_detection/best.pt")
    print()
    print("Next steps:")
    print("  1. Open backend/main.py")
    print("  2. Set  MOCK_AI_ENABLED = False")
    print("  3. Uncomment the REAL AI block (see instructions in main.py)")
    print("  4. Restart the backend:  uvicorn main:app --reload")
    print()


if __name__ == "__main__":
    main()
