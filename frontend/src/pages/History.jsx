import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { getScanHistory } from "../services/api";

function History() {
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedScan, setSelectedScan] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const result = await getScanHistory();
        setHistory(result.history || []);
      } catch (err) {
        console.error("History error:", err);
        setError(err.message || "Failed to load scan history.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const getMaterialIcon = (cls = "") => {
    const lower = cls.toLowerCase();
    if (lower.includes("plastic")) return "🥤";
    if (lower.includes("glass")) return "🍾";
    if (lower.includes("metal")) return "🥫";
    if (lower.includes("paper") || lower.includes("cardboard")) return "📦";
    if (lower.includes("electronic") || lower.includes("battery")) return "⚡";
    if (lower.includes("organic") || lower.includes("food")) return "🍎";
    return "♻️";
  };

  const getBinBadgeStyle = (action = "") => {
    const act = action.toLowerCase();
    if (act.includes("recycle")) return { bg: "#e3f2fd", color: "#1565c0", border: "#bbdefb", bin: "🔵 Blue Bin" };
    if (act.includes("compost")) return { bg: "#e8f5e9", color: "#2e7d32", border: "#c8e6c9", bin: "🟢 Green Bin" };
    if (act.includes("electronic") || act.includes("hazard")) return { bg: "#f3e5f5", color: "#7b1fa2", border: "#e1bee7", bin: "🔴 Red Bin / Drop-off" };
    return { bg: "#f5f5f5", color: "#424242", border: "#e0e0e0", bin: "⚫ Black Trash Bin" };
  };

  const calculateItemImpact = (cls = "") => {
    const lower = cls.toLowerCase();
    if (lower.includes("plastic")) return { co2: "0.50 kg", water: "4.0 L", energy: "1.2 kWh" };
    if (lower.includes("glass")) return { co2: "0.30 kg", water: "2.0 L", energy: "0.6 kWh" };
    if (lower.includes("metal")) return { co2: "1.20 kg", water: "6.5 L", energy: "2.5 kWh" };
    if (lower.includes("paper") || lower.includes("cardboard")) return { co2: "0.40 kg", water: "8.0 L", energy: "0.9 kWh" };
    if (lower.includes("electronic")) return { co2: "3.50 kg", water: "12.0 L", energy: "5.0 kWh" };
    return { co2: "0.35 kg", water: "3.2 L", energy: "0.8 kWh" };
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          <div className="page-introduction">
            <span className="small-label">INTERACTIVE SCAN ARCHIVE</span>
            <h2>Your Previous Scans</h2>
            <p>
              Click on any scan entry below to inspect its detailed AI breakdown, environmental savings, and localized disposal summary.
            </p>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <h3>Loading your scan history...</h3>
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              <h3>Unable to load history</h3>
              <p>{error}</p>
            </div>
          )}

          {/* NO SCANS */}
          {!loading && !error && history.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">♻️</div>
              <h3>No scans recorded yet</h3>
              <p>Upload or capture a waste image in the Scan section to build your history log.</p>
              <button
                type="button"
                onClick={() => navigate("/scan")}
                style={{
                  marginTop: "16px",
                  padding: "10px 20px",
                  borderRadius: "12px",
                  background: "#2e7d32",
                  color: "#ffffff",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                📷 Start Scanning
              </button>
            </div>
          )}

          {/* SCAN HISTORY GRID */}
          {!loading && !error && history.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
              {history.map((scan) => {
                const binStyle = getBinBadgeStyle(scan.action);
                const icon = getMaterialIcon(scan.class_name);
                const confidencePct = (scan.confidence * 100).toFixed(1);

                return (
                  <div
                    key={scan.id}
                    onClick={() => setSelectedScan(scan)}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8e3",
                      borderRadius: "16px",
                      padding: "20px",
                      boxShadow: "0 3px 12px rgba(0,0,0,0.03)",
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(46,125,50,0.12)";
                      e.currentTarget.style.borderColor = "#81c784";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.03)";
                      e.currentTarget.style.borderColor = "#e2e8e3";
                    }}
                  >
                    <div>
                      {/* CARD HEADER */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold", color: "#2e7d32", textTransform: "uppercase", background: "#e8f5e9", padding: "2px 8px", borderRadius: "10px" }}>
                          SCAN #{scan.id}
                        </span>

                        <span style={{ fontSize: "11px", color: "#78909c" }}>
                          {scan.created_at ? new Date(scan.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>

                      {/* ITEM TITLE */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <div style={{ fontSize: "28px", background: "#f4f8f4", borderRadius: "12px", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {icon}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "18px", color: "#173f2c", textTransform: "capitalize" }}>
                            {scan.class_name}
                          </h3>
                          <div style={{ fontSize: "12px", color: "#546e7a", marginTop: "2px" }}>
                            Confidence: <b>{confidencePct}%</b>
                          </div>
                        </div>
                      </div>

                      {/* BIN STREAM BADGE */}
                      <div
                        style={{
                          background: binStyle.bg,
                          color: binStyle.color,
                          border: `1px solid ${binStyle.border}`,
                          borderRadius: "12px",
                          padding: "8px 12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          marginBottom: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                      >
                        <span>{scan.action}</span>
                        <span style={{ fontSize: "11px", opacity: 0.9 }}>{binStyle.bin}</span>
                      </div>

                      {/* PREVIEW INSTRUCTION */}
                      <p style={{ fontSize: "13px", color: "#455a64", lineHeight: "1.5", margin: 0 }}>
                        {scan.instruction}
                      </p>
                    </div>

                    {/* FOOTER CALL TO ACTION */}
                    <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f0f4f1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: "bold", color: "#2e7d32", display: "flex", alignItems: "center", gap: "4px" }}>
                        🔍 View Full Detailed Summary
                      </span>
                      <span style={{ fontSize: "14px", color: "#2e7d32" }}>➔</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DETAILED SCAN SUMMARY MODAL */}
          {selectedScan && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(15, 30, 20, 0.65)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "20px"
              }}
              onClick={() => setSelectedScan(null)}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "24px",
                  maxWidth: "620px",
                  width: "100%",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  padding: "28px",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                  border: "1px solid #c8e6c9",
                  position: "relative",
                  animation: "fadeIn 0.2s ease-out"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* CLOSE BUTTON */}
                <button
                  type="button"
                  onClick={() => setSelectedScan(null)}
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    background: "#f1f5f2",
                    border: "none",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    cursor: "pointer",
                    fontSize: "16px",
                    color: "#546e7a",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ✕
                </button>

                {/* MODAL HEADER */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "36px", background: "#e8f5e9", borderRadius: "16px", width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {getMaterialIcon(selectedScan.class_name)}
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "#2e7d32", textTransform: "uppercase" }}>
                      DETAILED SCAN REPORT SUMMARY
                    </span>
                    <h2 style={{ margin: "2px 0 0 0", fontSize: "24px", color: "#173f2c", textTransform: "capitalize" }}>
                      {selectedScan.class_name}
                    </h2>
                    <div style={{ fontSize: "12px", color: "#78909c", marginTop: "2px" }}>
                      Scan ID #{selectedScan.id} &bull; Recorded on {selectedScan.created_at ? new Date(selectedScan.created_at).toLocaleString() : "Recently"}
                    </div>
                  </div>
                </div>

                {/* CONFIDENCE & BIN BADGE BAR */}
                <div style={{ background: "#f8fbf8", border: "1px solid #e2ece3", borderRadius: "16px", padding: "16px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "bold", color: "#1b5e20" }}>AI Detection Accuracy:</span>
                    <span style={{ fontSize: "14px", fontWeight: "800", color: "#2e7d32" }}>
                      {(selectedScan.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  {/* CONFIDENCE BAR */}
                  <div style={{ height: "8px", background: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(selectedScan.confidence * 100).toFixed(1)}%`,
                        background: "linear-gradient(90deg, #4caf50, #2e7d32)",
                        borderRadius: "4px"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", paddingTop: "10px", borderTop: "1px dashed #cfd8dc" }}>
                    <span style={{ fontSize: "12px", color: "#546e7a" }}>Assigned Municipal Stream:</span>
                    <span style={{ fontSize: "12px", fontWeight: "bold", padding: "4px 12px", borderRadius: "12px", background: getBinBadgeStyle(selectedScan.action).bg, color: getBinBadgeStyle(selectedScan.action).color }}>
                      {getBinBadgeStyle(selectedScan.action).bin}
                    </span>
                  </div>
                </div>

                {/* STEP BY STEP INSTRUCTION */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#1b5e20", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📋 Step-by-Step Action:</span>
                  </h4>
                  <div style={{ background: "#ffffff", border: "1px solid #dcedc8", borderRadius: "14px", padding: "14px", fontSize: "14px", color: "#2e3b32", lineHeight: "1.6" }}>
                    {selectedScan.instruction}
                  </div>
                </div>

                {/* REASON / RATIONALE */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#1b5e20", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>💡 Why This Action Matters:</span>
                  </h4>
                  <div style={{ background: "#f1f8e9", border: "1px solid #c8e6c9", borderRadius: "14px", padding: "14px", fontSize: "13px", color: "#1b5e20", lineHeight: "1.6" }}>
                    {selectedScan.reason}
                  </div>
                </div>

                {/* ESTIMATED SAVINGS METRICS */}
                {(() => {
                  const impact = calculateItemImpact(selectedScan.class_name);
                  return (
                    <div style={{ marginBottom: "24px" }}>
                      <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#1b5e20" }}>
                        🌱 Environmental Savings for this Item:
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                        <div style={{ background: "#e8f5e9", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                          <div style={{ fontSize: "16px" }}>🌱</div>
                          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1b5e20", marginTop: "2px" }}>{impact.co2}</div>
                          <div style={{ fontSize: "10px", color: "#388e3c" }}>CO₂ Avoided</div>
                        </div>

                        <div style={{ background: "#e0f7fa", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                          <div style={{ fontSize: "16px" }}>💧</div>
                          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#006064", marginTop: "2px" }}>{impact.water}</div>
                          <div style={{ fontSize: "10px", color: "#00838f" }}>Water Saved</div>
                        </div>

                        <div style={{ background: "#fff8e1", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                          <div style={{ fontSize: "16px" }}>⚡</div>
                          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#f57f17", marginTop: "2px" }}>{impact.energy}</div>
                          <div style={{ fontSize: "10px", color: "#f9a825" }}>Energy Saved</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ACTION BUTTONS */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScan(null);
                      navigate("/map");
                    }}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "12px",
                      border: "1px solid #a5d6a7",
                      background: "#e8f5e9",
                      color: "#1b5e20",
                      fontSize: "13px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    🗺️ Find Nearby Disposal Points
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScan(null);
                      navigate("/scan");
                    }}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "12px",
                      border: "none",
                      background: "#2e7d32",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    📷 Scan New Waste
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default History;