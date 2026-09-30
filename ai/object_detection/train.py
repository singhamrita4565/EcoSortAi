from pathlib import Path
import shutil

from ultralytics import YOLO


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASET_YAML = (
    PROJECT_ROOT
    / "datasets"
    / "processed"
    / "ecosort_yolo"
    / "data.yaml"
)

MODEL_OUTPUT = (
    PROJECT_ROOT
    / "models"
    / "object_detection"
)

RUNS_OUTPUT = (
    PROJECT_ROOT
    / "runs"
    / "object_detection"
)


# ============================================================
# TRAINING SETTINGS
# ============================================================

MODEL_NAME = "yolo11n.pt"   # YOLOv11 nano — auto-downloaded on first run

EPOCHS = 30          # fast run — increase to 100 later for better accuracy

IMAGE_SIZE = 640

BATCH_SIZE = 8       # safe for most CPUs/GPUs

PATIENCE = 10

WORKERS = 0


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("EcoSort AI - YOLO Object Detection Training")
    print("=" * 60)


    # --------------------------------------------------------
    # Check dataset
    # --------------------------------------------------------

    if not DATASET_YAML.exists():

        print()
        print("ERROR: data.yaml was not found.")

        print()
        print("Expected:")
        print(DATASET_YAML)

        return


    print()
    print("Dataset:")
    print(DATASET_YAML)


    print()
    print("Model:")
    print(MODEL_NAME)


    print()
    print("Training settings:")
    print(f"Epochs: {EPOCHS}")
    print(f"Image size: {IMAGE_SIZE}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Patience: {PATIENCE}")


    # --------------------------------------------------------
    # Create output directories
    # --------------------------------------------------------

    MODEL_OUTPUT.mkdir(
        parents=True,
        exist_ok=True
    )

    RUNS_OUTPUT.mkdir(
        parents=True,
        exist_ok=True
    )


    # --------------------------------------------------------
    # Load pretrained YOLO model
    # --------------------------------------------------------

    print()
    print("Loading pretrained YOLO model...")

    model = YOLO(MODEL_NAME)


    # --------------------------------------------------------
    # Train
    # --------------------------------------------------------

    print()
    print("Starting training...")
    print()

    results = model.train(

        data=str(DATASET_YAML),

        epochs=EPOCHS,

        imgsz=IMAGE_SIZE,

        batch=BATCH_SIZE,

        patience=PATIENCE,

        workers=WORKERS,

        project=str(RUNS_OUTPUT),

        name="ecosort_yolo",

        exist_ok=True,

        pretrained=True,

        verbose=True
    )


    # --------------------------------------------------------
    # Locate best model
    # --------------------------------------------------------

    run_directory = (
        RUNS_OUTPUT
        / "ecosort_yolo"
    )

    best_model = (
        run_directory
        / "weights"
        / "best.pt"
    )


    print()

    if best_model.exists():

        final_model = (
            MODEL_OUTPUT
            / "best.pt"
        )

        shutil.copy2(
            best_model,
            final_model
        )

        print("=" * 60)
        print("TRAINING COMPLETE")
        print("=" * 60)

        print()
        print("Best model:")
        print(final_model)

        print()
        print("Training results:")
        print(run_directory)

    else:

        print(
            "WARNING: best.pt was not found."
        )

        print(
            "Check the training output folder:"
        )

        print(run_directory)


if __name__ == "__main__":

    main()