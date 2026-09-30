"""
EcoSort AI - Model Validation
================================
Evaluates the trained best.pt model on the test split and
prints standard YOLO metrics (mAP50, mAP50-95, precision,
recall) per class and overall.

Usage:
    python ai/object_detection/validate.py
"""

from pathlib import Path

from ultralytics import YOLO


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    PROJECT_ROOT
    / "models"
    / "object_detection"
    / "best.pt"
)

DATASET_YAML = (
    PROJECT_ROOT
    / "datasets"
    / "processed"
    / "ecosort_yolo"
    / "data.yaml"
)

VALIDATION_OUTPUT = (
    PROJECT_ROOT
    / "runs"
    / "object_detection"
    / "validation"
)


# ============================================================
# SETTINGS
# ============================================================

IMAGE_SIZE           = 640
CONFIDENCE_THRESHOLD = 0.50
IOU_THRESHOLD        = 0.50   # for mAP50


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("EcoSort AI - Model Validation")
    print("=" * 60)


    # --------------------------------------------------------
    # Check model
    # --------------------------------------------------------

    if not MODEL_PATH.exists():
        print()
        print("ERROR: Trained model not found.")
        print(f"Expected: {MODEL_PATH}")
        print()
        print("Train first:")
        print("  python ai/object_detection/train.py")
        return


    # --------------------------------------------------------
    # Check dataset
    # --------------------------------------------------------

    if not DATASET_YAML.exists():
        print()
        print("ERROR: data.yaml not found.")
        print(f"Expected: {DATASET_YAML}")
        return


    print()
    print(f"Model  : {MODEL_PATH}")
    print(f"Dataset: {DATASET_YAML}")
    print()


    # --------------------------------------------------------
    # Load model
    # --------------------------------------------------------

    print("Loading model...")
    model = YOLO(str(MODEL_PATH))


    # --------------------------------------------------------
    # Validate on test split
    # --------------------------------------------------------

    print("Running validation on test split...")
    print()

    VALIDATION_OUTPUT.mkdir(parents=True, exist_ok=True)

    metrics = model.val(
        data=str(DATASET_YAML),
        split="test",
        imgsz=IMAGE_SIZE,
        conf=CONFIDENCE_THRESHOLD,
        iou=IOU_THRESHOLD,
        project=str(VALIDATION_OUTPUT),
        name="test_run",
        verbose=True
    )


    # --------------------------------------------------------
    # Print summary
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("VALIDATION RESULTS")
    print("=" * 60)

    try:

        print()
        print(f"mAP50      : {metrics.box.map50:.4f}")
        print(f"mAP50-95   : {metrics.box.map:.4f}")
        print(f"Precision  : {metrics.box.mp:.4f}")
        print(f"Recall     : {metrics.box.mr:.4f}")

        class_names = [
            "plastic",
            "glass",
            "metal",
            "paper_cardboard",
            "food_container",
            "battery",
            "electronics",
        ]

        if hasattr(metrics.box, "maps") and metrics.box.maps is not None:
            print()
            print("Per-class mAP50:")
            print("-" * 40)
            for idx, ap in enumerate(metrics.box.maps):
                name = class_names[idx] if idx < len(class_names) else str(idx)
                print(f"  {name:<20}: {ap:.4f}")

    except AttributeError:
        print("(Detailed metrics not available in this version of ultralytics.)")

    print()
    print("Full results saved to:")
    print(VALIDATION_OUTPUT)


if __name__ == "__main__":
    main()
