# ♻️ EcoSort AI — Smart Waste Detection, GIS Mapping & Sustainability Platform

**EcoSort AI** is a full-stack AI-powered waste classification, environmental impact tracking, and GIS municipal hotspot mapping platform. It uses **YOLOv11 Object Detection** combined with visual feature analysis to identify waste materials, provide recycling/decomposition guidance, locate nearby disposal centers on **Leaflet + OpenStreetMap**, and crowd-source **Garbage Hotspot Detection**.

---

## 🌟 Key Features

1. **📷 AI Waste Scanner (Live Camera & Image Upload)**
   - Detects **7 waste categories**: `plastic`, `glass`, `metal`, `paper_cardboard`, `food_container`, `battery`, and `electronics`.
   - Displays **Recyclable Status**, **Reusable Status**, **Decomposition Time**, and step-by-step disposal instructions.

2. **🗺️ Interactive Waste Map (Leaflet + OpenStreetMap)**
   - Plots nearby **🗑️ Smart Dustbins**, **♻️ Recycling Centers**, **🌱 Composting Centers**, and **🔋 E-Waste Collection Points**.
   - Includes category filter buttons, live browser GPS location (`📍 Use My Live GPS`), and direct OpenStreetMap navigation links.

3. **🔥 Garbage Hotspot Detection (Crowd-Sourced Municipal Alerts)**
   - Citizens can click anywhere on the map to report overflowing bins or illegal dumping.
   - Clusters repeated reports into **High (🔴)**, **Medium (🟠)**, and **Low (🟡)** severity hotspot zones to help municipal authorities dispatch cleanup trucks and install extra dustbins.

4. **🌱 Real-Time Environmental Impact Tracker**
   - Dynamically calculates **Recycled Items**, **CO₂ Avoided (kg)**, **Water Saved (L)**, **Energy Saved (kWh)**, and **Eco Score** from user scan history.

5. **🤖 EcoSort AI Chatbot**
   - Interactive AI assistant that answers questions about waste sorting, composting, e-waste safety, decomposition times, and local recycling guidelines.

6. **👤 User Profile, Scan History & Settings**
   - Full authentication (`Register` / `Login`), scan history tracking, Eco Rank badges (`🍃 Eco Explorer` to `🏆 Eco Master`), and persistent user settings.

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router v7, Leaflet.js + OpenStreetMap, CSS3 |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic |
| **AI / Computer Vision** | Ultralytics YOLOv11 (`yolo11n.pt` / `best.pt`), PyTorch, Pillow (PIL), TACO Dataset |
| **Database** | SQLite3 (`ecosort.db`) |

---

## 📂 Project Structure

```text
EcoSortAI/
├── ai/
│   ├── object_detection/
│   │   ├── predict.py               # YOLO inference + Visual Feature Analysis
│   │   ├── train.py                 # YOLOv11 training script
│   │   └── validate.py              # Model evaluation script
│   └── preprocessing/               # TACO COCO-to-YOLO dataset converters
├── backend/
│   ├── main.py                      # FastAPI routes (/predict, /impact, /chat, /gis/*)
│   ├── ai_predict.py                # Bridge between FastAPI & YOLO model
│   ├── database.py                  # SQLite database models & queries
│   └── requirements.txt             # Backend Python dependencies
├── frontend/
│   ├── index.html                   # App entry + Leaflet CSS/JS CDN
│   ├── package.json                 # Frontend dependencies
│   └── src/
│       ├── components/
│       │   ├── ImageUploader.jsx    # File upload + Live WebRTC Camera capture
│       │   ├── WasteMap.jsx         # Interactive Leaflet map + Hotspot Detector
│       │   ├── Sidebar.jsx          # Navigation sidebar
│       │   └── Navbar.jsx           # Top bar with user session
│       ├── pages/
│       │   ├── Dashboard.jsx        # Overview & Eco Score stats
│       │   ├── ScanWaste.jsx        # AI waste scanner page
│       │   ├── Result.jsx           # Material lifecycle & decomposition result
│       │   ├── Impact.jsx           # Environmental impact & GIS Waste Map
│       │   ├── Chatbot.jsx          # AI Recycling Assistant
│       │   ├── History.jsx          # Past scan history
│       │   ├── Profile.jsx          # User profile & Eco Rank badges
│       │   └── Settings.jsx         # Application preferences
│       └── services/
│           └── api.js               # Frontend-to-Backend API client
├── models/
│   └── object_detection/
│       └── best.pt                  # Trained YOLO model weights
└── run_pipeline.py                  # Automated dataset & training pipeline