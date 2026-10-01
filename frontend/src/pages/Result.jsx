import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ResultCard from "../components/ResultCard";

const CLASS_COLORS = {
  plastic: "#2e7d32",
  glass: "#0288d1",
  metal: "#d32f2f",
  paper_cardboard: "#f57c00",
  food_container: "#ef6c00",
  battery: "#7b1fa2",
  electronics: "#3f51b5",
  unknown: "#616161"
};

function Result() {
  const navigate = useNavigate();
  const [result, setResult]               = useState(null);
  const [image, setImage]                 = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const storedResult = sessionStorage.getItem("ecosortResult");
    if (storedResult) {
      try {
        setResult(JSON.parse(storedResult));
      } catch (error) {
        console.error("Failed to read AI result:", error);
      }
    }

    const storedImage = sessionStorage.getItem("ecosortImage");
    if (storedImage) {
      setImage(storedImage);
    }
  }, []);

  const detections = (result && result.status === "success" && result.detections) || [];
  const hasDetection = detections.length > 0;
  const activeDet = hasDetection ? detections[selectedIndex] || detections[0] : null;

  // Draw Bounding Boxes on Canvas Overlay
  const drawBoundingBoxes = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || detections.length === 0) return;

    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    if (displayWidth === 0 || displayHeight === 0) return;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Get image dimensions from backend or original img
    const origW = activeDet?.img_dimensions?.[0] || img.naturalWidth || 640;
    const origH = activeDet?.img_dimensions?.[1] || img.naturalHeight || 640;

    const scaleX = displayWidth / origW;
    const scaleY = displayHeight / origH;

    detections.forEach((det, idx) => {
      if (!det.bbox) return;
      const [x1, y1, x2, y2] = det.bbox;

      const bx1 = x1 * scaleX;
      const by1 = y1 * scaleY;
      const bw  = (x2 - x1) * scaleX;
      const bh  = (y2 - y1) * scaleY;

      const color = CLASS_COLORS[det.class_name] || "#2e7d32";
      const isSelected = idx === selectedIndex;

      // Box rectangle
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = isSelected ? 10 : 4;
      ctx.strokeRect(bx1, by1, bw, bh);

      // Label background pill
      const label = `#${idx + 1} ${det.class_name.toUpperCase()} (${(det.confidence * 100).toFixed(0)}%)`;
      ctx.font = "bold 12px sans-serif";
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = color;
      ctx.shadowBlur = 0;
      ctx.fillRect(bx1, Math.max(0, by1 - 22), textWidth + 12, 22);

      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, bx1 + 6, Math.max(15, by1 - 6));
    });
  };

  useEffect(() => {
    if (image && detections.length > 0) {
      setTimeout(drawBoundingBoxes, 200);
    }
  }, [image, detections, selectedIndex]);

  const handleRetake = () => {
    sessionStorage.removeItem("ecosortResult");
    sessionStorage.removeItem("ecosortImage");
    navigate("/scan");
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          {/* HEADER & RETAKE BUTTON */}
          <div className="page-introduction">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span className="small-label">MULTI-OBJECT AI ANALYSIS</span>
                <h2>AI Waste Scan &amp; Object Detection</h2>
                <p>
                  Found <b>{detections.length}</b> waste {detections.length === 1 ? "object" : "objects"} in your photo. Click any bounding box or card to inspect details.
                </p>
              </div>

              {/* 1-CLICK RETAKE / RESCAN BUTTON */}
              <button
                type="button"
                onClick={handleRetake}
                className="primary-btn"
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer"
                }}
              >
                <span>📷 Retake / Rescan Photo</span>
              </button>
            </div>
          </div>

          {/* MAIN RESULT LAYOUT WITH BOUNDING BOX CANVAS */}
          <div className="result-layout">
            {/* IMAGE & BOUNDING BOX OVERLAY CANVAS */}
            <div className="result-image-panel" style={{ position: "relative" }}>
              {image ? (
                <div className="uploaded-result-image" style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: "12px" }}>
                  <img
                    ref={imgRef}
                    src={image}
                    alt="Uploaded waste"
                    onLoad={drawBoundingBoxes}
                    style={{ width: "100%", height: "auto", maxHeight: "450px", objectFit: "contain", display: "block" }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              ) : (
                <div className="placeholder-image">
                  <span>📷</span>
                  <span>No uploaded image</span>
                </div>
              )}

              {/* MULTI-OBJECT SELECTOR CAROUSEL CHIPS */}
              {detections.length > 1 && (
                <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#2e7d32", alignSelf: "center" }}>
                    Detected Objects:
                  </span>
                  {detections.map((det, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "14px",
                        border: idx === selectedIndex ? "2px solid #2e7d32" : "1px solid #c8e6c9",
                        background: idx === selectedIndex ? "#2e7d32" : "#f4f8f4",
                        color: idx === selectedIndex ? "#ffffff" : "#1b5e20",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      #{idx + 1} {det.class_name} ({(det.confidence * 100).toFixed(0)}%)
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI RESULT CARD */}
            {activeDet ? (
              <ResultCard
                objectName={activeDet.class_name}
                material={activeDet.class_name}
                recommendation={activeDet.action}
                confidence={activeDet.confidence * 100}
                ecoScore={activeDet.recyclable !== false ? 90 : 40}
              />
            ) : (
              <div className="result-card">
                <div className="result-header">
                  <div>
                    <span className="result-label">AI ANALYSIS</span>
                    <h2>No Reliable Detection</h2>
                  </div>
                  <div className="material-badge">NOT DETECTED</div>
                </div>

                <div className="recommendation">
                  <span className="recommendation-icon">⚠️</span>
                  <div>
                    <span>Message</span>
                    <h3>{result?.message || "No reliable waste item was detected."}</h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="primary-btn"
                  style={{ marginTop: "15px", width: "100%" }}
                >
                  📷 Take Another Photo
                </button>
              </div>
            )}
          </div>

          {/* DETAILED MATERIAL, CONTAMINATION & DECOMPOSITION BREAKDOWN */}
          {activeDet && (
            <div className="future-result-panel" style={{ marginTop: "25px" }}>
              
              {/* CLEANLINESS & CONTAMINATION STATUS BADGE */}
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "14px",
                  background: activeDet.contamination?.is_clean === false ? "#fff3e0" : "#e8f5e9",
                  border: activeDet.contamination?.is_clean === false ? "1px solid #ffe0b2" : "1px solid #c8e6c9",
                  color: activeDet.contamination?.is_clean === false ? "#e65100" : "#1b5e20",
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    SOIL &amp; CONTAMINATION ANALYSIS (MEDIUM LIGHTING NORMALIZED)
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "bold", marginTop: "4px" }}>
                    Status: {activeDet.contamination?.status || "Clean & Dry ✨"}
                  </div>
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>
                    {activeDet.contamination?.instruction || "Item is clean and approved for standard recycling!"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="secondary-btn"
                  style={{ padding: "8px 14px", fontSize: "12px", background: "#ffffff", cursor: "pointer" }}
                >
                  📷 Retake / Rescan
                </button>
              </div>

              <h3>♻️ Material Lifecycle &amp; Decomposition Breakdown</h3>

              {/* LIFECYCLE BADGES */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "15px",
                  marginTop: "20px",
                }}
              >
                <div style={{ padding: "14px", background: "#eef8ef", borderRadius: "12px", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "#5f7066", display: "block" }}>Recyclable</span>
                  <strong style={{ fontSize: "16px", color: "#173f2c", marginTop: "4px", display: "block" }}>
                    {activeDet.recyclable !== false ? "✅ Yes (Recyclable)" : "❌ Non-Recyclable"}
                  </strong>
                </div>

                <div style={{ padding: "14px", background: "#eef8ef", borderRadius: "12px", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "#5f7066", display: "block" }}>Reusable</span>
                  <strong style={{ fontSize: "16px", color: "#173f2c", marginTop: "4px", display: "block" }}>
                    {activeDet.reusable ? "♻️ Yes (Reusable)" : "🔄 Single-Use / Reprocess"}
                  </strong>
                </div>

                <div style={{ padding: "14px", background: "#fff8e1", borderRadius: "12px", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "#795548", display: "block" }}>Decomposition Time</span>
                  <strong style={{ fontSize: "15px", color: "#e65100", marginTop: "4px", display: "block" }}>
                    ⏳ {activeDet.decompose_time || "50–400 years"}
                  </strong>
                </div>
              </div>

              {/* INSTRUCTIONS */}
              <div style={{ marginTop: "20px", display: "grid", gap: "15px" }}>
                <div style={{ padding: "16px", background: "#eef8ef", borderRadius: "12px" }}>
                  <strong>Recommended Action</strong>
                  <p style={{ marginTop: "7px", color: "#5f7066", fontSize: "13px" }}>
                    {activeDet.action}
                  </p>
                </div>

                <div style={{ padding: "16px", background: "#f5f8f5", borderRadius: "12px" }}>
                  <strong>How to Decompose / Dispose Safely</strong>
                  <p style={{ marginTop: "7px", color: "#5f7066", fontSize: "13px", lineHeight: "1.6" }}>
                    {activeDet.instruction || "Follow local recycling guidelines."}
                  </p>
                </div>

                <div style={{ padding: "16px", background: "#f5f8f5", borderRadius: "12px" }}>
                  <strong>Environmental Reason</strong>
                  <p style={{ marginTop: "7px", color: "#5f7066", fontSize: "13px", lineHeight: "1.6" }}>
                    {activeDet.reason || "Proper sorting prevents landfill contamination."}
                  </p>
                </div>
              </div>

              {/* GIS & RETAKE ACTION BUTTONS */}
              <div style={{ marginTop: "20px", display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="primary-btn"
                  style={{ padding: "11px 18px", fontSize: "14px" }}
                >
                  📷 Retake / Rescan Photo
                </button>

                <Link
                  to="/impact"
                  style={{
                    padding: "11px 18px",
                    borderRadius: "9px",
                    border: "1px solid #31864a",
                    color: "#31864a",
                    fontWeight: "bold",
                    textDecoration: "none",
                    fontSize: "14px",
                  }}
                >
                  🗺️ Find Nearest GIS Disposal Facility
                </Link>

                <Link
                  to="/chatbot"
                  style={{
                    padding: "11px 18px",
                    borderRadius: "9px",
                    border: "1px solid #31864a",
                    color: "#31864a",
                    fontWeight: "bold",
                    textDecoration: "none",
                    fontSize: "14px",
                  }}
                >
                  🤖 Ask AI Chatbot About This Item
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Result;