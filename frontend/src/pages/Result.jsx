import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ResultCard from "../components/ResultCard";

function Result() {
  const [result, setResult] = useState(null);
  const [image, setImage]   = useState(null);

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

  const hasDetection =
    result &&
    result.status === "success" &&
    result.detections &&
    result.detections.length > 0;

  const detection = hasDetection ? result.detections[0] : null;

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          {/* PAGE INTRODUCTION */}
          <div className="page-introduction">
            <span className="small-label">ANALYSIS RESULT</span>
            <h2>AI Scan Result</h2>
            <p>
              EcoSort AI analyzed your uploaded image using the YOLO waste detection model.
            </p>
          </div>

          {/* RESULT AREA */}
          <div className="result-layout">
            {/* IMAGE */}
            <div className="result-image-panel">
              {image ? (
                <div className="uploaded-result-image">
                  <img src={image} alt="Uploaded waste" />
                </div>
              ) : (
                <div className="placeholder-image">
                  <span>📷</span>
                  <span>Uploaded image</span>
                </div>
              )}
            </div>

            {/* AI RESULT */}
            {hasDetection ? (
              <ResultCard
                objectName={detection.class_name}
                material={detection.class_name}
                recommendation={detection.action}
                confidence={detection.confidence * 100}
                ecoScore={detection.recyclable ? 90 : 40}
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

                <p>
                  Try uploading a clearer image with better lighting and make sure the waste item is clearly visible.
                </p>
              </div>
            )}
          </div>

          {/* DETAILED MATERIAL & DECOMPOSITION BREAKDOWN */}
          {hasDetection && (
            <div className="future-result-panel">
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
                    {detection.recyclable !== false ? "✅ Yes (Recyclable)" : "❌ Non-Recyclable"}
                  </strong>
                </div>

                <div style={{ padding: "14px", background: "#eef8ef", borderRadius: "12px", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "#5f7066", display: "block" }}>Reusable</span>
                  <strong style={{ fontSize: "16px", color: "#173f2c", marginTop: "4px", display: "block" }}>
                    {detection.reusable ? "♻️ Yes (Reusable)" : "🔄 Single-Use / Reprocess"}
                  </strong>
                </div>

                <div style={{ padding: "14px", background: "#fff8e1", borderRadius: "12px", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "#795548", display: "block" }}>Decomposition Time</span>
                  <strong style={{ fontSize: "15px", color: "#e65100", marginTop: "4px", display: "block" }}>
                    ⏳ {detection.decompose_time || "50–400 years"}
                  </strong>
                </div>
              </div>

              {/* INSTRUCTIONS */}
              <div style={{ marginTop: "20px", display: "grid", gap: "15px" }}>
                <div style={{ padding: "16px", background: "#eef8ef", borderRadius: "12px" }}>
                  <strong>Recommended Action</strong>
                  <p style={{ marginTop: "7px", color: "#5f7066", fontSize: "13px" }}>
                    {detection.action}
                  </p>
                </div>

                <div style={{ padding: "16px", background: "#f5f8f5", borderRadius: "12px" }}>
                  <strong>How to Decompose / Dispose Safely</strong>
                  <p style={{ marginTop: "7px", color: "#5f7066", fontSize: "13px", lineHeight: "1.6" }}>
                    {detection.instruction || "Follow local recycling guidelines."}
                  </p>
                </div>

                <div style={{ padding: "16px", background: "#f5f8f5", borderRadius: "12px" }}>
                  <strong>Environmental Reason</strong>
                  <p style={{ marginTop: "7px", color: "#5f7066", fontSize: "13px", lineHeight: "1.6" }}>
                    {detection.reason || "Proper sorting prevents landfill contamination."}
                  </p>
                </div>
              </div>

              {/* GIS ACTION BUTTON */}
              <div style={{ marginTop: "20px", display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <Link
                  to="/impact"
                  className="primary-btn"
                  style={{ textDecoration: "none", display: "inline-block" }}
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