from pathlib import Path
import uuid

from fastapi import FastAPI, File, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext

from database import (
    create_tables,
    create_user,
    get_user_by_email,
    create_scan,
    get_all_scans,
    get_scan_by_id
)


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="EcoSort AI API",
    description="AI-powered waste classification and recycling assistant",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DIRECTORIES
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(
    exist_ok=True
)


# ============================================================
# MOCK AI
# ============================================================

MOCK_AI_ENABLED = False  # Real AI — using COCO zero-shot model (no training needed)

# ============================================================
# REAL AI IMPORT
# ============================================================

_run_ai_predict = None   # assigned after model loads

if not MOCK_AI_ENABLED:
    import sys as _sys
    import threading as _threading
    from pathlib import Path as _Path

    _backend_dir = _Path(__file__).resolve().parent
    if str(_backend_dir) not in _sys.path:
        _sys.path.insert(0, str(_backend_dir))

    def _load_ai_in_background():
        global _run_ai_predict
        try:
            from ai_predict import run_ai_predict
            _run_ai_predict = run_ai_predict
            print("✅ AI model loaded and ready.")
        except Exception as e:
            print(f"⚠️  AI model failed to load: {e}")

    _thread = _threading.Thread(target=_load_ai_in_background, daemon=True)
    _thread.start()

# ============================================================
# PASSWORD HASHING
# ============================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# ============================================================
# RECYCLING RULES
# ============================================================

RECYCLING_RULES = {

    "plastic": {
        "action": "RECYCLE",

        "instruction":
            "Clean and dry the plastic item, "
            "then place it in the recyclable-plastic collection.",

        "reason":
            "Clean plastic containers can often be "
            "recycled when accepted by the local recycling system."
    },

    "glass": {
        "action": "RECYCLE",

        "instruction":
            "Empty and rinse the glass item, "
            "then place it in the glass recycling stream.",

        "reason":
            "Glass is commonly recyclable when separated "
            "from contamination and non-glass materials."
    },

    "metal": {
        "action": "RECYCLE",

        "instruction":
            "Empty and rinse the metal item, "
            "then place it with recyclable metals.",

        "reason":
            "Metal containers are commonly recyclable "
            "when clean and separated properly."
    },

    "paper_cardboard": {
        "action": "RECYCLE",

        "instruction":
            "Keep the paper or cardboard dry and clean, "
            "flatten it if possible, and place it with paper recycling.",

        "reason":
            "Clean and dry paper or cardboard is commonly recyclable."
    }
}


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():

    create_tables()


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "status": "online",
        "message": "EcoSort AI API is running",
        "mode": "mock_ai" if MOCK_AI_ENABLED else "real_ai"
    }


# ============================================================
# MODEL INFO
# ============================================================

@app.get("/model-info")
def model_info():

    return {

        "mode":
            "mock_ai" if MOCK_AI_ENABLED else "real_ai",

        "model":
            "Mock AI",

        "classes": {
            "0": "plastic",
            "1": "glass",
            "2": "metal",
            "3": "paper_cardboard"
        },

        "confidence_threshold": 0.50
    }

# ============================================================
# REGISTER
# ============================================================

@app.post("/register")
def register(
    name: str,
    email: str,
    password: str
):

    # --------------------------------------------------------
    # Basic validation
    # --------------------------------------------------------

    name = name.strip()
    email = email.strip().lower()


    if not name:

        return {
            "status": "error",
            "message": "Name is required."
        }


    if not email:

        return {
            "status": "error",
            "message": "Email is required."
        }


    if len(password) < 6:

        return {
            "status": "error",
            "message":
                "Password must contain at least 6 characters."
        }


    # --------------------------------------------------------
    # Check existing user
    # --------------------------------------------------------

    existing_user = get_user_by_email(
        email
    )


    if existing_user:

        return {
            "status": "error",
            "message":
                "An account with this email already exists."
        }


    # --------------------------------------------------------
    # Hash password
    # --------------------------------------------------------

    password_hash = pwd_context.hash(
        password
    )


    # --------------------------------------------------------
    # Create user
    # --------------------------------------------------------

    user_id, created_at = create_user(

        name=name,

        email=email,

        password_hash=password_hash
    )


    return {

        "status":
            "success",

        "message":
            "Account created successfully.",

        "user": {

            "id":
                user_id,

            "name":
                name,

            "email":
                email,

            "created_at":
                created_at
        }
    }

#============================================================
# login
#============================================================

@app.post("/login")
def login(email: str, password: str):
    email = email.strip().lower()

    user = get_user_by_email(email)

    if not user:
        return {
            "status": "error",
            "message": "Invalid email or password."
        }

    if not pwd_context.verify(password, user["password_hash"]):
        return {
            "status": "error",
            "message": "Invalid email or password."
        }

    return {
        "status": "success",
        "message": "Login successful.",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "created_at": user["created_at"]
        }
    }

# ============================================================
# PREDICT
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    user_id: int = Header(..., alias="X-User-ID")
):
    # --------------------------------------------------------
    # Validate filename
    # --------------------------------------------------------

    if not file.filename:

        return {
            "status": "error",
            "message": "No file was provided."
        }


    # --------------------------------------------------------
    # Validate image
    # --------------------------------------------------------

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg"
    }

    if file.content_type not in allowed_types:

        return {
            "status": "error",
            "message":
                "Please upload a JPG, JPEG, PNG or WEBP image."
        }


    # --------------------------------------------------------
    # Save temporary file
    # --------------------------------------------------------

    extension = Path(
        file.filename
    ).suffix

    filename = (
        f"{uuid.uuid4()}{extension}"
    )

    file_path = (
        UPLOAD_DIR / filename
    )

    file_bytes = await file.read()

    with open(
        file_path,
        "wb"
    ) as buffer:

        buffer.write(file_bytes)


    # ========================================================
    # MOCK AI
    # ========================================================

    if MOCK_AI_ENABLED:

        class_name = "plastic"

        confidence = 0.94

        rule = RECYCLING_RULES[
            class_name
        ]


        detection = {

            "class_name":
                class_name,

            "confidence":
                confidence,

            "action":
                rule["action"],

            "instruction":
                rule["instruction"],

            "reason":
                rule["reason"]
        }


        # ----------------------------------------------------
        # SAVE SCAN TO SQLITE
        # ----------------------------------------------------

        scan_id, created_at = create_scan(
            user_id=user_id,
            filename=file.filename,
            class_name=class_name,
            confidence=confidence,
            action=rule["action"],
            instruction=rule["instruction"],
            reason=rule["reason"],
            mode="mock_ai"
        )


        # ----------------------------------------------------
        # Delete temporary image
        # ----------------------------------------------------

        try:

            file_path.unlink()

        except Exception:

            pass


        # ----------------------------------------------------
        # Return result
        # ----------------------------------------------------

        return {

            "status":
                "success",

            "mode":
                "mock_ai",

            "scan_id":
                scan_id,

            "message":
                "Mock AI prediction generated successfully.",

            "detections": [
                detection
            ],

            "created_at":
                created_at
        }


    # ========================================================
    # REAL AI  (YOLO model — active when MOCK_AI_ENABLED = False)
    # ========================================================

    if _run_ai_predict is None:
        # Model is still loading in background thread
        try:
            file_path.unlink()
        except Exception:
            pass
        return {
            "status" : "error",
            "message": "AI model is still loading, please wait 30 seconds and try again."
        }

    try:

        detections = _run_ai_predict(file_path)

    except FileNotFoundError as exc:

        # Model not trained yet
        try:
            file_path.unlink()
        except Exception:
            pass

        return {
            "status" : "error",
            "mode"   : "real_ai",
            "message": str(exc)
        }

    except Exception as exc:

        try:
            file_path.unlink()
        except Exception:
            pass

        return {
            "status" : "error",
            "mode"   : "real_ai",
            "message": f"AI inference failed: {exc}"
        }


    # --------------------------------------------------------
    # Delete temporary image
    # --------------------------------------------------------

    try:
        file_path.unlink()
    except Exception:
        pass


    # --------------------------------------------------------
    # No detections above threshold
    # --------------------------------------------------------

    if not detections:

        return {
            "status"    : "no_reliable_detection",
            "mode"      : "real_ai",
            "detections": [],
            "message"   : "No reliable waste item detected."
        }


    # --------------------------------------------------------
    # Save top detection to database
    # --------------------------------------------------------

    top = detections[0]

    scan_id, created_at = create_scan(
        user_id     = user_id,
        filename    = file.filename,
        class_name  = top["class_name"],
        confidence  = top["confidence"],
        action      = top["action"],
        instruction = top["instruction"],
        reason      = top["reason"],
        mode        = "real_ai"
    )


    return {

        "status"    : "success",

        "mode"      : "real_ai",

        "scan_id"   : scan_id,

        "message"   : "Real AI prediction generated successfully.",

        "detections": detections,

        "created_at": created_at
    }


# ============================================================
# HISTORY
# ============================================================

@app.get("/history")
def get_history(
    user_id: int = Header(..., alias="X-User-ID")
):
    rows = get_all_scans(user_id)

    results = []

    for scan in rows:
        results.append({
            "id": scan["id"],
            "filename": scan["filename"],
            "class_name": scan["class_name"],
            "confidence": scan["confidence"],
            "action": scan["action"],
            "instruction": scan["instruction"],
            "reason": scan["reason"],
            "mode": scan["mode"],
            "created_at": scan["created_at"]
        })

    return {
        "status": "success",
        "count": len(results),
        "history": results
    }


# ============================================================
# GET SINGLE SCAN
# ============================================================

@app.get("/history/{scan_id}")
def get_scan(
    scan_id: int,
    user_id: int = Header(..., alias="X-User-ID")
):
    scan = get_scan_by_id(
        scan_id,
        user_id
    )

    if not scan:
        return {
            "status": "error",
            "message": "Scan not found."
        }

    return {
        "status": "success",
        "scan": {
            "id": scan["id"],
            "filename": scan["filename"],
            "class_name": scan["class_name"],
            "confidence": scan["confidence"],
            "action": scan["action"],
            "instruction": scan["instruction"],
            "reason": scan["reason"],
            "mode": scan["mode"],
            "created_at": scan["created_at"]
        }
    }


# ============================================================
# ENVIRONMENTAL IMPACT
# ============================================================

@app.get("/impact")
def get_impact(user_id: int = Header(..., alias="X-User-ID")):
    scans = get_all_scans(user_id)
    total_scans = len(scans)

    # Calculate material breakdown and impact
    recycled_items = 0
    co2_kg = 0.0
    water_liters = 0.0
    energy_kwh = 0.0
    material_counts = {}

    for scan in scans:
        cls = scan["class_name"]
        material_counts[cls] = material_counts.get(cls, 0) + 1

        # Check if item action is RECYCLE or COMPOST
        action = (scan["action"] or "").upper()
        if "RECYCLE" in action or "COMPOST" in action:
            recycled_items += 1
            if cls == "plastic":
                co2_kg += 0.5
                water_liters += 4.0
                energy_kwh += 1.2
            elif cls == "glass":
                co2_kg += 0.3
                water_liters += 2.0
                energy_kwh += 0.6
            elif cls == "metal":
                co2_kg += 1.2
                water_liters += 6.5
                energy_kwh += 2.5
            elif cls == "paper_cardboard":
                co2_kg += 0.4
                water_liters += 8.0
                energy_kwh += 0.9
            elif cls == "electronics":
                co2_kg += 3.5
                water_liters += 12.0
                energy_kwh += 5.0
            else:
                co2_kg += 0.4
                water_liters += 3.0
                energy_kwh += 0.8

    return {
        "status": "success",
        "total_scans": total_scans,
        "recycled_items": recycled_items,
        "co2_kg": round(co2_kg, 2),
        "water_liters": round(water_liters, 1),
        "energy_kwh": round(energy_kwh, 1),
        "trees_equivalent": round(co2_kg / 20.0, 2),
        "materials": material_counts
    }


# ============================================================
# AI CHATBOT
# ============================================================

from pydantic import BaseModel

class ChatQuery(BaseModel):
    message: str


@app.post("/chat")
def chat_assistant(query: ChatQuery):
    msg = query.message.lower().strip()

    if not msg:
        return {"status": "error", "message": "Query cannot be empty."}

    # Expert EcoSort AI Knowledge Base
    if any(k in msg for k in ["plastic", "bottle", "jug", "container"]):
        reply = (
            "PET (#1) and HDPE (#2) plastics (like water bottles and milk jugs) are widely recyclable! "
            "Always rinse out food/liquid residue and flatten them to save space. "
            "Avoid putting thin plastic bags or film in curbside bins as they jam sorting machinery."
        )
    elif any(k in msg for k in ["glass", "jar", "wine", "mirror"]):
        reply = (
            "Glass bottles and jars are 100% infinitely recyclable without quality loss! "
            "Remove metal/plastic caps and rinse. Note: Ceramics, mirrors, and window glass "
            "have higher melting points and should NOT be mixed with container glass recycling."
        )
    elif any(k in msg for k in ["metal", "can", "aluminum", "tin", "foil"]):
        reply = (
            "Aluminum soda cans and steel food tins are among the most valuable recyclable items! "
            "Recycling aluminum saves up to 95% of the energy required to make new aluminum. "
            "Rinse clean before recycling. Clean aluminum foil can be balled up to tennis-ball size."
        )
    elif any(k in msg for k in ["paper", "cardboard", "box", "newspaper"]):
        reply = (
            "Clean paper, cardboard boxes, and newspapers are easily recyclable. "
            "Flatten boxes before putting them in the bin. "
            "IMPORTANT: Grease-stained pizza boxes or wet paper cannot be recycled — compost them instead!"
        )
    elif any(k in msg for k in ["battery", "batteries", "lithium", "cell"]):
        reply = (
            "Do NOT throw batteries in standard household trash or recycling bins! "
            "Lithium-ion and rechargeable batteries can spark and cause dangerous truck or landfill fires. "
            "Take them to a dedicated hazardous e-waste or retail drop-off center."
        )
    elif any(k in msg for k in ["electronic", "e-waste", "phone", "laptop", "cable", "computer"]):
        reply = (
            "E-waste contains precious metals (gold, copper) as well as toxic heavy metals (lead, mercury). "
            "Never landfill electronics. Use authorized e-waste collection drives, manufacturer take-back programs, "
            "or local municipal e-waste recycling centers."
        )
    elif any(k in msg for k in ["compost", "food", "organic", "scraps", "peel"]):
        reply = (
            "Organic food scraps (fruit peels, coffee grounds, eggshells, vegetable ends) decompose into nutrient-rich compost soil! "
            "Composting diverts food from landfills where it would otherwise release harmful methane gas."
        )
    elif any(k in msg for k in ["where", "location", "gis", "facility", "center", "near", "drop"]):
        reply = (
            "You can use our GIS Waste Disposal Locator feature to find real-world drop-off centers! "
            "Search by your city or enable GPS location to see nearby recycling hubs, compost facilities, and e-waste depots on the map."
        )
    else:
        reply = (
            f"Great sustainability question! EcoSort AI recommends following the 3 R's: Reduce, Reuse, and Recycle. "
            f"For items like '{query.message}', make sure to check whether it's clean and dry before placing it in recyclable streams, "
            f"or search our GIS Disposal Locator for specialized drop-off points."
        )

    return {
        "status": "success",
        "query": query.message,
        "reply": reply,
        "suggestions": [
            "How do I recycle plastic bottles?",
            "Where can I dispose of e-waste?",
            "What items are compostable?"
        ]
    }


# ============================================================
# 1. INTERACTIVE WASTE MAP (Dustbins, Recycling, Compost, E-Waste)
# ============================================================

@app.get("/gis/centers")
def get_gis_centers(lat: float = 28.6139, lng: float = 77.2090, q: str = ""):
    """
    Returns nearby Dustbins, Recycling Centers, Composting Centers,
    and E-Waste Collection Points for the Leaflet + OpenStreetMap view.
    """
    facilities = [
        {
            "id": 1,
            "name": "Connaught Place Smart Dustbin Cluster #4",
            "type": "Dustbin",
            "icon": "🗑️",
            "color": "#2e7d32",
            "categories": ["plastic", "paper_cardboard", "food_container"],
            "address": "Block A Inner Circle, Central Market",
            "distance_km": 0.4,
            "lat": lat + 0.004,
            "lng": lng + 0.005,
            "hours": "24/7 Public Smart Bin (Solar Compactor)",
            "phone": "Municipal Helpline: 1916",
            "maps_url": f"https://www.openstreetmap.org/?mlat={lat+0.004}&mlon={lng+0.005}#map=16/{lat+0.004}/{lng+0.005}"
        },
        {
            "id": 2,
            "name": "Metro Station Segregated Dustbins (Dry/Wet)",
            "type": "Dustbin",
            "icon": "🗑️",
            "color": "#2e7d32",
            "categories": ["plastic", "metal", "glass", "food_container"],
            "address": "Gate 2 Exit, Main Metro Corridor",
            "distance_km": 0.8,
            "lat": lat - 0.006,
            "lng": lng + 0.004,
            "hours": "24/7 Public Access",
            "phone": "Municipal Helpline: 1916",
            "maps_url": f"https://www.openstreetmap.org/?mlat={lat-0.006}&mlon={lng+0.004}#map=16/{lat-0.006}/{lng+0.004}"
        },
        {
            "id": 3,
            "name": "GreenLoop Municipal Recycling Center",
            "type": "Recycling Center",
            "icon": "♻️",
            "color": "#1976d2",
            "categories": ["plastic", "paper_cardboard", "glass", "metal"],
            "address": "45 Eco Industrial Parkway, Sector 12",
            "distance_km": 1.4,
            "lat": lat + 0.012,
            "lng": lng + 0.015,
            "hours": "Mon-Sat: 8:00 AM - 6:00 PM",
            "phone": "+91 98111-23456",
            "maps_url": f"https://www.openstreetmap.org/?mlat={lat+0.012}&mlon={lng+0.015}#map=16/{lat+0.012}/{lng+0.015}"
        },
        {
            "id": 4,
            "name": "City Clean Glass & Metal Recycling Hub",
            "type": "Recycling Center",
            "icon": "♻️",
            "color": "#1976d2",
            "categories": ["glass", "metal", "plastic"],
            "address": "89 Industrial Ring Road",
            "distance_km": 3.1,
            "lat": lat - 0.021,
            "lng": lng - 0.018,
            "hours": "Mon-Sat: 8:00 AM - 7:00 PM",
            "phone": "+91 98111-90123",
            "maps_url": f"https://www.openstreetmap.org/?mlat={lat-0.021}&mlon={lng-0.018}#map=16/{lat-0.021}/{lng-0.018}"
        },
        {
            "id": 5,
            "name": "BioSoil Organics & Municipal Composting Center",
            "type": "Composting Center",
            "icon": "🌱",
            "color": "#ef6c00",
            "categories": ["food_container", "paper_cardboard"],
            "address": "12 Community Botanical Garden Road",
            "distance_km": 2.2,
            "lat": lat + 0.018,
            "lng": lng - 0.011,
            "hours": "Mon-Fri: 7:00 AM - 4:00 PM",
            "phone": "+91 98111-34567",
            "maps_url": f"https://www.openstreetmap.org/?mlat={lat+0.018}&mlon={lng-0.011}#map=16/{lat+0.018}/{lng-0.011}"
        },
        {
            "id": 6,
            "name": "EcoTek Authorized E-Waste & Battery Point",
            "type": "E-Waste Point",
            "icon": "🔋",
            "color": "#7b1fa2",
            "categories": ["electronics", "battery", "metal"],
            "address": "108 Cyber Tech Park, Block B",
            "distance_km": 2.8,
            "lat": lat - 0.015,
            "lng": lng + 0.022,
            "hours": "Tue-Sun: 9:00 AM - 5:00 PM",
            "phone": "+91 98111-87654",
            "maps_url": f"https://www.openstreetmap.org/?mlat={lat-0.015}&mlon={lng+0.022}#map=16/{lat-0.015}/{lng+0.022}"
        }
    ]

    return {
        "status": "success",
        "user_location": {"lat": lat, "lng": lng, "query": q},
        "count": len(facilities),
        "centers": facilities
    }


# ============================================================
# 3. GARBAGE HOTSPOT DETECTION (Crowd-sourced Hotspot Plotting)
# ============================================================

_GARBAGE_HOTSPOTS = [
    {
        "id": 101,
        "area_name": "Old Market Backlane Corner",
        "waste_type": "Plastic & Mixed Packaging",
        "reports_count": 18,
        "severity": "High",
        "radius_m": 350,
        "lat_offset": 0.009,
        "lng_offset": -0.008,
        "status": "Critical Hotspot - Municipal Truck Dispatched",
        "last_reported": "2 hours ago",
        "description": "Repeated illegal dumping of single-use plastic bags and food wrappers near market entrance."
    },
    {
        "id": 102,
        "area_name": "Sector 4 Bus Stand Drain",
        "waste_type": "Plastic Bottles & Cans",
        "reports_count": 11,
        "severity": "Medium",
        "radius_m": 250,
        "lat_offset": -0.011,
        "lng_offset": 0.009,
        "status": "Recurring Accumulation - Cleanup Scheduled",
        "last_reported": "5 hours ago",
        "description": "Overflowing public bin causing litter accumulation along the roadside."
    },
    {
        "id": 103,
        "area_name": "Railway Underpass East",
        "waste_type": "Construction & E-Waste Scrap",
        "reports_count": 15,
        "severity": "High",
        "radius_m": 300,
        "lat_offset": -0.014,
        "lng_offset": -0.012,
        "status": "High Priority Hotspot - Under Surveillance",
        "last_reported": "1 day ago",
        "description": "Frequent night-time dumping of broken electronics, wires, and cardboard."
    },
    {
        "id": 104,
        "area_name": "Green Park Gate 3 Footpath",
        "waste_type": "Organic & Food Waste",
        "reports_count": 6,
        "severity": "Low",
        "radius_m": 180,
        "lat_offset": 0.015,
        "lng_offset": 0.006,
        "status": "Monitoring - Extra Dustbin Requested",
        "last_reported": "3 hours ago",
        "description": "Street food vendors leaving compostable plates and food containers."
    }
]


class HotspotReport(BaseModel):
    area_name: str
    waste_type: str
    description: str = ""
    lat: float = 28.6139
    lng: float = 77.2090


@app.get("/gis/hotspots")
def get_garbage_hotspots(lat: float = 28.6139, lng: float = 77.2090):
    """
    Returns identified garbage accumulation hotspots plotted around the user's coordinates.
    """
    results = []
    for h in _GARBAGE_HOTSPOTS:
        h_lat = h.get("exact_lat", lat + h["lat_offset"])
        h_lng = h.get("exact_lng", lng + h["lng_offset"])
        results.append({
            "id": h["id"],
            "area_name": h["area_name"],
            "waste_type": h["waste_type"],
            "reports_count": h["reports_count"],
            "severity": h["severity"],
            "radius_m": h["radius_m"],
            "lat": h_lat,
            "lng": h_lng,
            "status": h["status"],
            "last_reported": h["last_reported"],
            "description": h["description"]
        })

    # Sort by reports_count descending so worst hotspots appear first
    results.sort(key=lambda x: x["reports_count"], reverse=True)

    return {
        "status": "success",
        "count": len(results),
        "hotspots": results
    }


@app.post("/gis/hotspots")
def report_garbage_hotspot(report: HotspotReport):
    """
    Plots a user's garbage report on the map. If an existing hotspot is nearby
    or matches the area name, increments its report count and upgrades severity!
    """
    area_clean = report.area_name.strip()
    if not area_clean:
        return {"status": "error", "message": "Area name is required."}

    # Check if matching area already exists
    for h in _GARBAGE_HOTSPOTS:
        if area_clean.lower() in h["area_name"].lower() or h["area_name"].lower() in area_clean.lower():
            h["reports_count"] += 1
            h["last_reported"] = "Just now"
            if h["reports_count"] >= 12:
                h["severity"] = "High"
                h["radius_m"] = 350
                h["status"] = "Critical Hotspot - Municipal Alert Triggered"
            elif h["reports_count"] >= 7:
                h["severity"] = "Medium"
                h["radius_m"] = 250
            return {
                "status": "success",
                "message": f"Report added to existing hotspot '{h['area_name']}' (Total reports: {h['reports_count']})!",
                "hotspot": h
            }

    # Otherwise create a new garbage hotspot marker
    new_id = max(h["id"] for h in _GARBAGE_HOTSPOTS) + 1 if _GARBAGE_HOTSPOTS else 101
    new_hotspot = {
        "id": new_id,
        "area_name": area_clean,
        "waste_type": report.waste_type or "Mixed Garbage",
        "reports_count": 5,
        "severity": "Medium",
        "radius_m": 220,
        "lat_offset": 0.0,
        "lng_offset": 0.0,
        "exact_lat": report.lat,
        "exact_lng": report.lng,
        "status": "New Hotspot Identified - Flagged for Review",
        "last_reported": "Just now",
        "description": report.description or "User reported repeated garbage accumulation in this area."
    }
    _GARBAGE_HOTSPOTS.append(new_hotspot)

    return {
        "status": "success",
        "message": f"New garbage hotspot plotted at '{area_clean}'!",
        "hotspot": new_hotspot
    }


class MunicipalActionRequest(BaseModel):
    action_type: str  # "dispatch_truck", "install_bin", "mark_cleaned"


@app.post("/gis/hotspots/{hotspot_id}/action")
def take_municipal_action(hotspot_id: int, req: MunicipalActionRequest):
    """
    Allows Municipal Authorities to take direct action on a reported Garbage Hotspot.
    """
    for h in _GARBAGE_HOTSPOTS:
        if h["id"] == hotspot_id:
            if req.action_type == "dispatch_truck":
                h["status"] = "🚚 Municipal Cleanup Truck Dispatched (ETA: 20 mins)"
                h["severity"] = "Medium"
            elif req.action_type == "install_bin":
                h["status"] = "🗑️ New Smart Dustbin Approved & Scheduled"
            elif req.action_type == "mark_cleaned":
                h["status"] = "✅ Area Cleaned & Verified by Municipal Team"
                h["severity"] = "Low"
                h["reports_count"] = 1
                h["radius_m"] = 120
            return {
                "status": "success",
                "message": f"Municipal action updated for '{h['area_name']}'!",
                "hotspot": h
            }

    return {"status": "error", "message": "Hotspot not found."}

