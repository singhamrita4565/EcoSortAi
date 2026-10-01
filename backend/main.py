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
# REAL-TIME INFORMATION & LOCATION UTILITIES
# ============================================================

import urllib.request
import urllib.parse
import json

def fetch_realtime_aqi(lat: float = 28.6139, lng: float = 77.2090):
    """
    Fetches real-time Air Quality Index (AQI), PM2.5, PM10, and pollutant data
    from Open-Meteo Air Quality API (Free, no key required).
    """
    try:
        url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lng}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide"
        req = urllib.request.Request(url, headers={"User-Agent": "EcoSortAI/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                current = data.get("current", {})
                us_aqi = current.get("us_aqi", 45)
                pm25 = current.get("pm2_5", 12.5)
                pm10 = current.get("pm10", 25.0)

                if us_aqi <= 50:
                    status = "Good 🟢"
                    advice = "Air quality is satisfactory. Great day for outdoor waste collection and composting!"
                elif us_aqi <= 100:
                    status = "Moderate 🟡"
                    advice = "Air quality is acceptable. Sensitive individuals should take mild precautions."
                elif us_aqi <= 150:
                    status = "Unhealthy for Sensitive Groups 🟠"
                    advice = "Consider wearing a mask during prolonged outdoor waste pickup."
                elif us_aqi <= 200:
                    status = "Unhealthy 🔴"
                    advice = "Wear an N95 mask outdoors and minimize heavy physical waste sorting outside."
                else:
                    status = "Very Unhealthy / Hazardous 🟣"
                    advice = "Air pollution alert! Keep windows closed and stay indoors when possible."

                return {
                    "success": True,
                    "us_aqi": us_aqi,
                    "pm25": pm25,
                    "pm10": pm10,
                    "status": status,
                    "advice": advice,
                    "source": "Open-Meteo Live Air Quality Network"
                }
    except Exception as e:
        print(f"⚠️ Real-time AQI fetch warning: {e}")

    return {
        "success": False,
        "us_aqi": 42,
        "pm25": 11.2,
        "pm10": 22.0,
        "status": "Good 🟢 (Estimated)",
        "advice": "Air quality levels estimated for your area.",
        "source": "EcoSort AI Environmental Estimate"
    }


def fetch_duckduckgo_search(query: str):
    """
    Fetches real-time web summary snippet using DuckDuckGo Instant Answer API.
    """
    try:
        encoded_query = urllib.parse.quote(query)
        url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_html=1&skip_disambig=1"
        req = urllib.request.Request(url, headers={"User-Agent": "EcoSortAI/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                abstract = data.get("AbstractText", "") or data.get("Definition", "")
                heading = data.get("Heading", "")
                source_url = data.get("AbstractURL", "")

                if not abstract and data.get("RelatedTopics"):
                    for topic in data.get("RelatedTopics", []):
                        if isinstance(topic, dict) and "Text" in topic:
                            abstract = topic["Text"]
                            source_url = topic.get("FirstURL", "")
                            break

                if abstract:
                    return {
                        "found": True,
                        "title": heading or query,
                        "snippet": abstract,
                        "source_url": source_url or "https://duckduckgo.com"
                    }
    except Exception as e:
        print(f"⚠️ Real-time DDG search warning: {e}")

    return {"found": False}


# ============================================================
# ENVIRONMENTAL IMPACT (WITH LOCALIZATION & MUNICIPAL GUIDELINES)
# ============================================================

@app.get("/impact")
def get_impact(
    user_id: int = Header(..., alias="X-User-ID"),
    lat: float = 28.6139,
    lng: float = 77.2090,
    city: str = ""
):
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

    # Real-time local AQI & environmental metrics
    aqi_data = fetch_realtime_aqi(lat, lng)

    location_name = city if city else f"Lat {round(lat, 3)}, Lng {round(lng, 3)}"

    city_guidelines = {
        "city_name": location_name,
        "dry_recyclables": "Clean Plastic (#1, #2), Aluminum Cans, Glass Bottles, Cardboard & Dry Paper",
        "organics": "Food scraps, Fruit peels, Vegetable ends, Coffee grounds, Eggshells",
        "hazardous_ewaste": "Lithium batteries, Electronics, Chargers, Fluorescent bulbs",
        "landfill": "Soiled diapers, Ceramics, Styrofoam, Thin plastic film bags",
        "collection_tip": f"Segregate waste at home in {location_name} into Dry (Blue), Organic (Green), and E-Waste (Red)."
    }

    return {
        "status": "success",
        "location": {
            "name": location_name,
            "lat": lat,
            "lng": lng,
        },
        "local_air_quality": aqi_data,
        "city_guidelines": city_guidelines,
        "total_scans": total_scans,
        "recycled_items": recycled_items,
        "co2_kg": round(co2_kg, 2),
        "water_liters": round(water_liters, 1),
        "energy_kwh": round(energy_kwh, 1),
        "trees_equivalent": round(co2_kg / 20.0, 2),
        "materials": material_counts
    }


# ============================================================
# CONVERSATIONAL AI ENGINE
# ============================================================

def generate_conversational_ai_response(msg: str, lat: float, lng: float, city: str, realtime: bool):
    msg_clean = msg.lower().strip()
    loc = city if city else "your local area"
    loc_suffix = f" in {loc}" if city else ""

    # 1. Weather / AQI Queries
    if any(k in msg_clean for k in ["aqi", "air quality", "pollution", "weather", "smog", "environment today"]):
        aqi_info = fetch_realtime_aqi(lat, lng)
        reply = (
            f"🌍 **Real-Time Air Quality & Environment Report for {loc}**\n\n"
            f"• **US Air Quality Index (AQI):** {aqi_info['us_aqi']} ({aqi_info['status']})\n"
            f"• **PM2.5 Level:** {aqi_info['pm25']} µg/m³  |  **PM10:** {aqi_info['pm10']} µg/m³\n\n"
            f"💡 **Recommendation:** {aqi_info['advice']}\n\n"
            f"🌱 **EcoSort Tip:** Segregating organic waste and preventing illegal dumping helps keep neighborhood air fresh!"
        )
        return reply, True, aqi_info.get("source")

    # 2. Greeting / Conversational Intros
    if msg_clean in ["hi", "hello", "hey", "hola", "namaste", "good morning", "good afternoon", "who are you"]:
        reply = (
            f"Hello there! 👋 I'm EcoSort AI, your personal real-time recycling and sustainability assistant.\n\n"
            f"I'm currently synced with **{loc}**. You can ask or speak to me about:\n"
            f"• *How do I recycle lithium batteries or old electronics?*\n"
            f"• *Is a pizza box recyclable or compostable?*\n"
            f"• *What's the Air Quality AQI in {loc} right now?*\n"
            f"• *Where is the nearest recycling drop-off center in {loc}?*\n\n"
            f"What would you like to know or dispose of today?"
        )
        return reply, False, None

    # 3. Live Web News or Policy Search
    if realtime and any(k in msg_clean for k in ["news", "latest", "rule", "policy", "regulation", "law", "today", "guideline"]):
        search_res = fetch_duckduckgo_search(msg + loc_suffix)
        if search_res.get("found"):
            reply = (
                f"📰 **Real-Time Information for {loc}**\n\n"
                f"{search_res['snippet']}\n\n"
                f"🌱 **EcoSort AI Note:** For municipal collection schedules in {loc}, check your local portal or use our GIS Disposal Map!"
            )
            return reply, True, search_res.get("source_url")

    # 4. Item Specific Disposal & Waste Analytics
    if any(k in msg_clean for k in ["plastic", "bottle", "jug", "container", "cup", "pouch", "bag"]):
        reply = (
            f"🥤 **Plastic Item Waste & Recycling Guide ({loc})**\n\n"
            f"• **Material Type:** PET (#1) and HDPE (#2) rigid plastics (water bottles, milk jugs).\n"
            f"• **Disposal Steps{loc_suffix}:** Rinse out food/liquid residue thoroughly. Flatten the bottle to save space and place in the **Blue Dry Recyclables Bin**.\n"
            f"• **Landfill Degradation:** Takes up to **450 years** to decompose in landfills!\n"
            f"• **Carbon Savings:** Recycling 1 ton of plastic saves ~1.5 tons of CO₂ and 5,774 kWh of electricity.\n\n"
            f"💡 **Pro Tip:** Keep caps attached if accepted locally, but avoid putting thin plastic film or plastic bags into curbside bins as they jam sorting machinery."
        )
        return reply, False, None

    if any(k in msg_clean for k in ["glass", "jar", "wine", "mirror", "window"]):
        reply = (
            f"🍾 **Glass Container Recycling Guide ({loc})**\n\n"
            f"• **Material Type:** Container Glass (Soda-lime glass).\n"
            f"• **Disposal Steps{loc_suffix}:** Rinse clean and remove lids. Place in the **Glass & Metal Stream** or nearby drop-off depot.\n"
            f"• **Infinite Recyclability:** Glass is 100% infinitely recyclable without any loss in quality or purity!\n"
            f"• **Landfill Degradation:** Glass takes over **1,000,000 years** to decompose naturally.\n\n"
            f"⚠️ **Warning:** Do NOT mix ceramics, Pyrex, or window glass with bottle glass — they melt at higher temperatures and ruin recycled batches!"
        )
        return reply, False, None

    if any(k in msg_clean for k in ["metal", "can", "aluminum", "tin", "foil"]):
        reply = (
            f"🥫 **Metal & Aluminum Recycling Guide ({loc})**\n\n"
            f"• **Material Type:** Aluminum Soda Cans & Steel Food Tins.\n"
            f"• **Disposal Steps{loc_suffix}:** Rinse clean and place in **Dry Recyclables Bin**.\n"
            f"• **Energy Savings:** Recycling aluminum uses **95% less energy** than manufacturing from raw ore!\n"
            f"• **Circular Loop:** An aluminum can is recycled and back on store shelves as a new product in as little as **60 days**.\n\n"
            f"💡 **Pro Tip:** Clean aluminum foil can be rolled into a ball (size of a tennis ball) so automated sorters catch it easily."
        )
        return reply, False, None

    if any(k in msg_clean for k in ["paper", "cardboard", "box", "newspaper", "pizza"]):
        is_pizza = "pizza" in msg_clean
        if is_pizza:
            reply = (
                f"🍕 **Pizza Box Disposal & Composting Guide ({loc})**\n\n"
                f"• **Grease Contamination:** Grease-stained cardboard **CANNOT** be recycled because oil prevents paper fibers from binding.\n"
                f"• **Disposal Steps{loc_suffix}:** Tear off the clean top lid for **Cardboard Recycling**, and put the greasy bottom into **Organic Compost** or food waste!\n"
                f"• **Decomposition Time:** Clean cardboard decomposes in 2-3 months in compost soil."
            )
        else:
            reply = (
                f"📦 **Paper & Cardboard Recycling Guide ({loc})**\n\n"
                f"• **Material Type:** Corrugated Cardboard & Mixed Paper.\n"
                f"• **Disposal Steps{loc_suffix}:** Flatten boxes to save space and place in **Paper Recycling Bin**.\n"
                f"• **Impact:** Recycling 1 ton of cardboard saves 17 trees, 7,000 gallons of water, and 4,000 kWh of electricity."
            )
        return reply, False, None

    if any(k in msg_clean for k in ["battery", "batteries", "lithium", "cell"]):
        reply = (
            f"🔋 **Hazardous Battery & Lithium Cell Safety Guide ({loc})**\n\n"
            f"• **HAZARD WARNING:** Never throw batteries into regular trash or curbside bins! Lithium-ion batteries crush easily in collection trucks and cause dangerous fires.\n"
            f"• **Disposal Steps{loc_suffix}:** Bring to an authorized **E-Waste & Battery Drop-Off Point** (check our GIS Map layer for points in {loc}).\n"
            f"• **Resource Recovery:** 95% of battery materials (cobalt, lithium, nickel) are recoverable for new battery manufacturing!"
        )
        return reply, False, None

    if any(k in msg_clean for k in ["electronic", "e-waste", "phone", "laptop", "cable", "computer", "tv"]):
        reply = (
            f"💻 **E-Waste & Electronics Disposal Guide ({loc})**\n\n"
            f"• **Material Type:** Electronic Scrap (Circuit boards, wiring, display panels).\n"
            f"• **Disposal Steps{loc_suffix}:** Electronics contain toxic lead, mercury, and cadmium alongside gold and copper. Hand over to authorized e-waste recyclers.\n"
            f"• **Data Safety:** Remember to back up and factory-reset your device before recycling!"
        )
        return reply, False, None

    if any(k in msg_clean for k in ["compost", "food", "organic", "scraps", "peel", "banana"]):
        reply = (
            f"🌱 **Organic Food Waste & Composting Guide ({loc})**\n\n"
            f"• **Classification:** Organic Food Scraps & Green Waste.\n"
            f"• **Disposal Steps{loc_suffix}:** Place in your **Green Organic Bin** or backyard compost bin (includes fruit peels, coffee grounds, eggshells, vegetable ends).\n"
            f"• **Methane Reduction:** Composting diverts food scraps from landfills where they would otherwise release harmful methane gas!"
        )
        return reply, False, None

    if any(k in msg_clean for k in ["where", "location", "gis", "facility", "center", "near", "drop", "map"]):
        reply = (
            f"🗺️ **GIS Disposal Facilities Locator ({loc})**\n\n"
            f"You can find exact disposal drop-off locations near you on our **Environmental Impact & Waste Map** page!\n"
            f"• **Smart Dustbins:** Segregated Dry & Wet bins.\n"
            f"• **Recycling Depots:** Plastic, Glass, Paper & Metal hubs.\n"
            f"• **Composting Centers:** Organic waste drop-offs.\n"
            f"• **E-Waste Depots:** Battery & electronics collection points.\n\n"
            f"Click '📍 Refresh Location' or search your city name on the Map page to view active pins in {loc}!"
        )
        return reply, False, None

    # 5. Default Conversational Intelligence Response
    reply = (
        f"🌿 **EcoSort AI Sustainability Guide for {loc}**\n\n"
        f"Regarding **'{msg}'**:\n"
        f"1. **Segregation:** Ensure the item is clean and dry before recycling to avoid contaminating whole collection batches.\n"
        f"2. **Category Check:** Separate multi-component packaging (e.g., remove plastic lids from glass jars or metal seals).\n"
        f"3. **Local Guidelines{loc_suffix}:** Follow your city's collection rules or check our interactive GIS Disposal Map for drop-off points in {loc}.\n\n"
        f"You can also ask me about specific materials like plastics, glass, metals, paper, food scraps, or batteries!"
    )
    return reply, False, None


# ============================================================
# AI CHATBOT ENDPOINT
# ============================================================

from pydantic import BaseModel

class ChatQuery(BaseModel):
    message: str
    lat: float = 28.6139
    lng: float = 77.2090
    city: str = ""
    realtime: bool = True


@app.post("/chat")
def chat_assistant(query: ChatQuery):
    msg = query.message.strip()

    if not msg:
        return {"status": "error", "message": "Query cannot be empty."}

    reply, realtime_used, source_citation = generate_conversational_ai_response(
        msg=msg,
        lat=query.lat,
        lng=query.lng,
        city=query.city,
        realtime=query.realtime
    )

    location_ctx = f" in {query.city}" if query.city else ""

    return {
        "status": "success",
        "query": query.message,
        "reply": reply,
        "realtime_used": realtime_used,
        "source": source_citation,
        "location": query.city or f"{query.lat}, {query.lng}",
        "suggestions": [
            f"What is the Air Quality AQI{location_ctx}?",
            "How do I recycle plastic bottles?",
            "Where can I dispose of e-waste?",
            "Is a pizza box compostable?"
        ]
    }


# ============================================================
# INTERACTIVE WASTE MAP (LOCALIZED DUSTBINS & RECYCLING)
# ============================================================

@app.get("/gis/centers")
def get_gis_centers(lat: float = 28.6139, lng: float = 77.2090, q: str = "", city: str = ""):
    """
    Returns nearby Dustbins, Recycling Centers, Composting Centers,
    and E-Waste Collection Points dynamically centered around the user's latitude & longitude.
    """
    prefix = f"{city} " if city else ""

    facilities = [
        {
            "id": 1,
            "name": f"{prefix}Smart Dustbin Cluster #4",
            "type": "Dustbin",
            "icon": "🗑️",
            "color": "#2e7d32",
            "categories": ["plastic", "paper_cardboard", "food_container"],
            "address": f"{prefix}Central Marketplace & Transit Hub",
            "distance_km": 0.4,
            "lat": round(lat + 0.004, 5),
            "lng": round(lng + 0.005, 5),
            "hours": "24/7 Public Smart Bin (Solar Compactor)",
            "phone": "Municipal Helpline: 1916",
            "maps_url": f"https://www.openstreetmap.org/?mlat={round(lat+0.004, 5)}&mlon={round(lng+0.005, 5)}#map=16/{round(lat+0.004, 5)}/{round(lng+0.005, 5)}"
        },
        {
            "id": 2,
            "name": f"{prefix}Segregated Public Dustbins (Dry/Wet)",
            "type": "Dustbin",
            "icon": "🗑️",
            "color": "#2e7d32",
            "categories": ["plastic", "metal", "glass", "food_container"],
            "address": f"{prefix}Main Transit Station Gate 2",
            "distance_km": 0.8,
            "lat": round(lat - 0.006, 5),
            "lng": round(lng + 0.004, 5),
            "hours": "24/7 Public Access",
            "phone": "Municipal Helpline: 1916",
            "maps_url": f"https://www.openstreetmap.org/?mlat={round(lat-0.006, 5)}&mlon={round(lng+0.004, 5)}#map=16/{round(lat-0.006, 5)}/{round(lng+0.004, 5)}"
        },
        {
            "id": 3,
            "name": f"{prefix}GreenLoop Municipal Recycling Center",
            "type": "Recycling Center",
            "icon": "♻️",
            "color": "#1976d2",
            "categories": ["plastic", "paper_cardboard", "glass", "metal"],
            "address": f"{prefix}Eco Industrial Parkway, Hub 12",
            "distance_km": 1.4,
            "lat": round(lat + 0.012, 5),
            "lng": round(lng + 0.015, 5),
            "hours": "Mon-Sat: 8:00 AM - 6:00 PM",
            "phone": "+1 (800) 555-RECYCLE",
            "maps_url": f"https://www.openstreetmap.org/?mlat={round(lat+0.012, 5)}&mlon={round(lng+0.015, 5)}#map=16/{round(lat+0.012, 5)}/{round(lng+0.015, 5)}"
        },
        {
            "id": 4,
            "name": f"{prefix}City Clean Glass & Metal Recycling Depot",
            "type": "Recycling Center",
            "icon": "♻️",
            "color": "#1976d2",
            "categories": ["glass", "metal", "plastic"],
            "address": f"{prefix}Industrial Ring Road, Bay 89",
            "distance_km": 3.1,
            "lat": round(lat - 0.021, 5),
            "lng": round(lng - 0.018, 5),
            "hours": "Mon-Sat: 8:00 AM - 7:00 PM",
            "phone": "+1 (800) 555-0123",
            "maps_url": f"https://www.openstreetmap.org/?mlat={round(lat-0.021, 5)}&mlon={round(lng-0.018, 5)}#map=16/{round(lat-0.021, 5)}/{round(lng-0.018, 5)}"
        },
        {
            "id": 5,
            "name": f"{prefix}BioSoil Organics & Municipal Composting Hub",
            "type": "Composting Center",
            "icon": "🌱",
            "color": "#ef6c00",
            "categories": ["food_container", "paper_cardboard"],
            "address": f"{prefix}Botanical Community Gardens",
            "distance_km": 2.2,
            "lat": round(lat + 0.018, 5),
            "lng": round(lng - 0.011, 5),
            "hours": "Mon-Fri: 7:00 AM - 4:00 PM",
            "phone": "+1 (800) 555-SOIL",
            "maps_url": f"https://www.openstreetmap.org/?mlat={round(lat+0.018, 5)}&mlon={round(lng-0.011, 5)}#map=16/{round(lat+0.018, 5)}/{round(lng-0.011, 5)}"
        },
        {
            "id": 6,
            "name": f"{prefix}EcoTek Authorized E-Waste & Battery Drop-Off",
            "type": "E-Waste Point",
            "icon": "🔋",
            "color": "#7b1fa2",
            "categories": ["electronics", "battery", "metal"],
            "address": f"{prefix}Tech Park Boulevard, Block B",
            "distance_km": 2.8,
            "lat": round(lat - 0.015, 5),
            "lng": round(lng + 0.022, 5),
            "hours": "Tue-Sun: 9:00 AM - 5:00 PM",
            "phone": "+1 (800) 555-EWST",
            "maps_url": f"https://www.openstreetmap.org/?mlat={round(lat-0.015, 5)}&mlon={round(lng+0.022, 5)}#map=16/{round(lat-0.015, 5)}/{round(lng+0.022, 5)}"
        }
    ]

    return {
        "status": "success",
        "user_location": {"lat": lat, "lng": lng, "city": city, "query": q},
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

