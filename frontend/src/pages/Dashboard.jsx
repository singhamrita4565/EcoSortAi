import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import ScanCard from "../components/ScanCard";
import { getEnvironmentalImpact, detectUserLocation, sendChatMessage } from "../services/api";

function Dashboard() {
  const [stats, setStats]               = useState({ total_scans: 0, recycled_items: 0, co2_kg: 0 });
  const [userLocation, setUserLocation] = useState(null);

  // Quick Dashboard Chatbot Widget state
  const [chatInput, setChatInput]     = useState("");
  const [chatReply, setChatReply]     = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const loc = await detectUserLocation();
        setUserLocation(loc);

        const res = await getEnvironmentalImpact(loc.lat, loc.lng, loc.city);
        if (res.status === "success") {
          setStats(res);
        }
      } catch (e) {
        console.error("Dashboard stats error:", e);
      }
    }
    fetchData();
  }, []);

  const ecoScore = Math.min(100, stats.recycled_items * 10);

  const handleQuickChatSubmit = async (queryText) => {
    const text = queryText || chatInput;
    if (!text.trim() || chatLoading) return;

    try {
      setChatLoading(true);
      const res = await sendChatMessage(text, userLocation || {});
      setChatReply(res.reply);
      if (!queryText) setChatInput("");
    } catch (err) {
      console.error("Quick chat error:", err);
      setChatReply("Sorry, I had trouble answering right now. Try opening the full AI Chatbot.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          {/* WELCOME BANNER */}
          <div className="welcome-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span className="small-label">WELCOME TO ECOSORT AI 👋</span>
                <h2>Make every waste item count.</h2>
                <p>
                  AI-powered waste identification, contamination checking, and localized recycling guidance.
                </p>
              </div>

              {/* LOCATION BADGE */}
              <div
                style={{
                  background: "#e8f5e9",
                  border: "1px solid #c8e6c9",
                  borderRadius: "14px",
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#1b5e20",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>📍 Active Area:</span>
                <span>{userLocation?.city || userLocation?.displayName || "Detecting..."}</span>
              </div>
            </div>
          </div>

          {/* CORE STATS SUMMARY GRID */}
          <div className="stats-grid" style={{ marginBottom: "24px" }}>
            <StatCard
              icon="📷"
              title="Items Scanned"
              value={String(stats.total_scans)}
              description="Total AI waste scans completed"
            />

            <StatCard
              icon="♻️"
              title="Items Recycled"
              value={String(stats.recycled_items)}
              description="Diverted from local landfills"
            />

            <StatCard
              icon="🌱"
              title="Eco Score"
              value={`${ecoScore}/100`}
              description="Your sustainability rating"
            />

            <StatCard
              icon="🌍"
              title="CO₂ Saved"
              value={`${stats.co2_kg} kg`}
              description="Estimated greenhouse gas savings"
            />
          </div>

          {/* HERO QUICK SCAN CAMERA / UPLOAD MODULE */}
          <div style={{ marginBottom: "25px" }}>
            <ScanCard />
          </div>

          {/* TWO COLUMN SUMMARY DASHBOARD GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px", marginBottom: "25px" }}>
            
            {/* COLUMN 1: AI CHATBOT ASSISTANT WIDGET */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #c8e6c9",
                borderRadius: "20px",
                padding: "20px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                justify: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>🤖</span>
                    <h3 style={{ margin: 0, fontSize: "17px", color: "#1b5e20" }}>
                      EcoSort AI Assistant
                    </h3>
                  </div>
                  <span style={{ fontSize: "10px", background: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>
                    Live AI
                  </span>
                </div>

                <p style={{ fontSize: "13px", color: "#546e7a", lineHeight: "1.5", marginBottom: "14px" }}>
                  Ask any recycling, disposal, or sustainability question right here or launch the full voice assistant.
                </p>

                {/* QUICK PROMPT CHIPS */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                  {[
                    "How to recycle plastic bottles?",
                    "Is pizza box compostable?",
                    "Where to drop batteries?"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setChatInput(chip);
                        handleQuickChatSubmit(chip);
                      }}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "12px",
                        border: "1px solid #c8e6c9",
                        background: "#f4f9f5",
                        color: "#2e7d32",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* CHAT REPLY BOX */}
                {chatReply && (
                  <div style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: "14px", padding: "12px", fontSize: "13px", color: "#1b5e20", lineHeight: "1.5", marginBottom: "14px", maxHeight: "140px", overflowY: "auto" }}>
                    <b>🤖 EcoSort:</b> {chatReply}
                  </div>
                )}
              </div>

              {/* QUICK CHAT INPUT FORM */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuickChatSubmit();
                }}
                style={{ display: "flex", gap: "8px", marginTop: "10px" }}
              >
                <input
                  type="text"
                  placeholder="Ask EcoSort AI..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1px solid #cfe0d2",
                    fontSize: "13px"
                  }}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "12px",
                    background: "#2e7d32",
                    color: "#ffffff",
                    fontWeight: "bold",
                    fontSize: "13px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  {chatLoading ? "..." : "Ask"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/chatbot")}
                  title="Open Full Voice Assistant"
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    background: "#e8f5e9",
                    color: "#1b5e20",
                    fontWeight: "bold",
                    fontSize: "13px",
                    border: "1px solid #a5d6a7",
                    cursor: "pointer"
                  }}
                >
                  🎙️ Voice
                </button>
              </form>
            </div>

            {/* COLUMN 2: GEOSPATIAL WASTE MAP SUMMARY & BEST PRACTICES */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* WASTE MAP SUMMARY BANNER */}
              <div
                style={{
                  background: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
                  borderRadius: "20px",
                  padding: "20px",
                  border: "1px solid #90caf9",
                  display: "flex",
                  justify: "space-between",
                  alignItems: "center",
                  gap: "16px"
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: "#1565c0", textTransform: "uppercase" }}>
                    GEOSPATIAL LOCATOR SUMMARY
                  </span>
                  <h3 style={{ margin: "4px 0 0 0", fontSize: "17px", color: "#0d47a1" }}>
                    🗺️ Local Recycling Facilities &amp; Hotspots
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#1565c0" }}>
                    Find nearby GIS recycling drop-offs, e-waste centers, and compost hubs in {userLocation?.city || "your city"}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/map")}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "14px",
                    background: "#1565c0",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "bold",
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: "0 3px 10px rgba(21,101,192,0.25)"
                  }}
                >
                  Explore Map ➔
                </button>
              </div>

              {/* RECYCLING BEST PRACTICES SUMMARY */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5ebe6",
                  borderRadius: "20px",
                  padding: "18px",
                  boxShadow: "0 3px 12px rgba(0,0,0,0.02)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "18px" }}>💡</span>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "#173f2c" }}>
                    Quick Recycling Best Practices
                  </h4>
                </div>

                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#455a64", lineHeight: "1.6" }}>
                  <li>Rinse containers to remove food residues before recycling.</li>
                  <li>Separate multi-layer packaging into dry plastic &amp; organic streams.</li>
                  <li>Never mix lithium batteries with general dry trash.</li>
                </ul>
              </div>

            </div>

          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;