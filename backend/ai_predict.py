"""
EcoSort AI - Backend AI Integration
======================================
Bridge module that the FastAPI backend (main.py) imports
when MOCK_AI_ENABLED = False.

It calls the YOLO model via ai/object_detection/predict.py
and applies the same RECYCLING_RULES logic used in mock mode
so the API response format stays 100% identical.

Usage in main.py
----------------
    from ai_predict import run_ai_predict

    # inside the /predict route, after MOCK_AI block:
    detections_raw = run_ai_predict(file_path)
"""

import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Make sure the ai/ package is importable from backend/
# ---------------------------------------------------------------------------

_AI_DIR = Path(__file__).resolve().parents[1] / "ai" / "object_detection"
if str(_AI_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_DIR))

from predict import predict as yolo_predict   # noqa: E402


# ============================================================
# RECYCLING RULES  (mirrors backend/main.py RECYCLING_RULES)
# ============================================================

RECYCLING_RULES = {

    "plastic": {
        "action": "RECYCLE",
        "instruction":
            "Clean and dry the plastic item, "
            "then place it in the recyclable-plastic collection.",
        "reason":
            "Clean plastic containers can often be "
            "recycled when accepted by the local recycling system.",
        "recyclable": True,
        "reusable": False,
        "decompose_time": "20–500 years (landfill)",
    },

    "glass": {
        "action": "RECYCLE",
        "instruction":
            "Empty and rinse the glass item, "
            "then place it in the glass recycling stream.",
        "reason":
            "Glass is 100% recyclable indefinitely without loss of quality.",
        "recyclable": True,
        "reusable": True,
        "decompose_time": "1 million+ years (landfill)",
    },

    "metal": {
        "action": "RECYCLE",
        "instruction":
            "Empty and rinse the metal item, "
            "then place it with recyclable metals.",
        "reason":
            "Metal is infinitely recyclable and saves up to 95% energy "
            "compared to virgin production.",
        "recyclable": True,
        "reusable": False,
        "decompose_time": "50–200 years (landfill)",
    },

    "paper_cardboard": {
        "action": "RECYCLE",
        "instruction":
            "Keep the paper or cardboard dry and clean, "
            "flatten it if possible, and place it with paper recycling.",
        "reason":
            "Clean and dry paper or cardboard is commonly recyclable.",
        "recyclable": True,
        "reusable": False,
        "decompose_time": "2–6 weeks (composted) / months (landfill)",
    },

    "food_container": {
        "action": "COMPOST OR LANDFILL",
        "instruction":
            "Empty and rinse the container. If made from compostable "
            "material, compost it; otherwise dispose of it in general waste.",
        "reason":
            "Food-soiled containers are usually not accepted for recycling "
            "because contamination degrades the recycled material.",
        "recyclable": False,
        "reusable": False,
        "decompose_time": "5–50 years depending on material",
    },

    "battery": {
        "action": "HAZARDOUS WASTE",
        "instruction":
            "Do NOT put batteries in household recycling or general waste. "
            "Take them to a designated battery-collection point.",
        "reason":
            "Batteries contain toxic heavy metals that contaminate soil and "
            "water when landfilled, and can cause fires in recycling trucks.",
        "recyclable": True,
        "reusable": False,
        "decompose_time": "100+ years (toxic leaching)",
    },

    "electronics": {
        "action": "E-WASTE RECYCLING",
        "instruction":
            "Take the item to an authorised e-waste recycling centre "
            "or manufacturer take-back programme.",
        "reason":
            "Electronics contain valuable metals and toxic substances "
            "that must be recovered or contained safely.",
        "recyclable": True,
        "reusable": True,
        "decompose_time": "Centuries (toxic leaching)",
    },

    "organic_waste": {
        "action": "ORGANIC COMPOST",
        "instruction":
            "Place in green organic waste bin or backyard compost pit. "
            "Keeps biodegradable food scraps out of methane-producing landfills.",
        "reason":
            "Organic food waste decomposes into nutrient-rich soil fertilizer when composted.",
        "recyclable": True,
        "reusable": True,
        "decompose_time": "1–4 months (composted)",
    },

    "hazardous_waste": {
        "action": "SPECIAL HAZARDOUS DISPOSAL",
        "instruction":
            "Hand over to municipal chemical waste depot. "
            "Do NOT dump in regular trash or drain.",
        "reason":
            "Contains toxic compounds requiring specialized chemical containment.",
        "recyclable": False,
        "reusable": False,
        "decompose_time": "Centuries (toxic threat)",
    },

    "unknown": {
        "action": "GENERAL WASTE",
        "instruction":
            "The item could not be confidently identified. "
            "Dispose of it in general waste.",
        "reason":
            "Unable to determine the material type from the image.",
        "recyclable": False,
        "reusable": False,
        "decompose_time": "Unknown",
    },
}


# ============================================================
# PUBLIC FUNCTION
# ============================================================

def run_ai_predict(image_path) -> list:
    """
    Run real YOLO inference, multi-object detection, and image preprocessing.
    """
    raw = yolo_predict(image_path)

    formatted = []

    for det in raw:
        class_name = det["class_name"]
        rule       = RECYCLING_RULES.get(class_name, RECYCLING_RULES["unknown"])

        formatted.append({
            "class_name"    : class_name,
            "confidence"    : det["confidence"],
            "action"        : rule["action"],
            "instruction"   : rule["instruction"],
            "reason"        : rule["reason"],
            "recyclable"    : rule["recyclable"],
            "reusable"      : rule["reusable"],
            "decompose_time": rule["decompose_time"],
            "bbox"          : det.get("bbox", [50.0, 50.0, 590.0, 590.0]),
            "img_dimensions": det.get("img_dimensions", [640, 640]),
            "contamination" : det.get("contamination", {
                "status": "Clean & Dry ✨", "level": "Clean", "instruction": "Item approved for recycling!", "is_clean": True
            }),
        })

    return formatted
