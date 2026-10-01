import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import ReportGarbageForm from "../components/ReportGarbageForm";
import { getEnvironmentalImpact, detectUserLocation } from "../services/api";

function Impact() {
  const [impactData, setImpactData]   = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [locating, setLocating]       = useState(false);

  // Interactive Carbon Calculator State
  const [weeklyPlastics, setWeeklyPlastics] = useState(12);
  const [weeklyPaper, setWeeklyPaper]       = useState(8);
  const [weeklyGlass, setWeeklyGlass]       = useState(4);
  const [weeklyMetal, setWeeklyMetal]       = useState(6);

  const fetchLocationAndImpact = async () => {
    try {
      setLoading(true);
      setLocating(true);
      setError("");

      const loc = await detectUserLocation();
      setUserLocation(loc);

      const impactRes = await getEnvironmentalImpact(loc.lat, loc.lng, loc.city);
      setImpactData(impactRes);
    } catch (err) {
      console.error("Impact error:", err);
      setError("Could not load local environmental metrics.");
    } finally {
      setLoading(false);
      setLocating(false);
    }
  };

  useEffect(() => {
    fetchLocationAndImpact();
  }, []);

  // Calculated annual savings
  const annualCo2 = ((weeklyPlastics * 0.5 + weeklyPaper * 0.4 + weeklyGlass * 0.3 + weeklyMetal * 1.2) * 52).toFixed(1);
  const annualWater = Math.round((weeklyPlastics * 4 + weeklyPaper * 8 + weeklyGlass * 2 + weeklyMetal * 6.5) * 52);
  const treesEquivalent = (annualCo2 / 21.0).toFixed(1);

  const aqi = impactData?.local_air_quality;

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          {/* PAGE INTRODUCTION */}
          <div className="page-introduction">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span className="small-label">LOCATION &amp; CITIZEN ACTION</span>
                <h2>Environmental Impact &amp; Citizen Action Hub</h2>
                <p>
                  Monitor real-time air quality, simulate your annual carbon offsets, report local garbage accumulation, and explore municipal segregation rules.
                </p>
              </div>

              {/* LOCATION BADGE CARD */}
              <div
                style={{
                  background: "#f0f7f2",
                  border: "1px solid #c8e6c9",
                  borderRadius: "14px",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#2e7d32", letterSpacing: "0.5px" }}>
                    📍 DETECTED LOCATION ({userLocation?.source || "GPS"})
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#1b5e20", marginTop: "2px" }}>
                    {locating ? "Locating area..." : userLocation?.displayName || "Detecting location..."}
                  </div>
                  {aqi && (
                    <div style={{ fontSize: "12px", color: "#388e3c", marginTop: "2px" }}>
                      🌤️ <b>AQI:</b> {aqi.us_aqi} ({aqi.status}) &bull; PM2.5: {aqi.pm25} µg/m³
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={fetchLocationAndImpact}
                  disabled={locating}
                  className="secondary-btn"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1px solid #a5d6a7",
                    color: "#2e7d32",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  {locating ? "↻ Scanning..." : "📍 Refresh Location"}
                </button>
              </div>
            </div>
          </div>

          {error && <div className="camera-error">⚠️ {error}</div>}

          {/* REAL-TIME LOCAL AIR QUALITY ALERT BANNER */}
          {aqi && aqi.advice && (
            <div
              style={{
                marginBottom: "20px",
                padding: "14px 18px",
                borderRadius: "16px",
                background: aqi.us_aqi > 100 ? "#fff3e0" : "#e8f5e9",
                border: aqi.us_aqi > 100 ? "1px solid #ffe0b2" : "1px solid #c8e6c9",
                color: aqi.us_aqi > 100 ? "#e65100" : "#1b5e20",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "13px",
                fontWeight: "500",
                boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
              }}
            >
              <span style={{ fontSize: "22px" }}>{aqi.us_aqi > 100 ? "⚠️" : "🍃"}</span>
              <div>
                <b>Live Environmental Alert ({userLocation?.city || "Local Area"}):</b> {aqi.advice}
              </div>
            </div>
          )}

          {/* STATS GRID */}
          <div className="stats-grid" style={{ marginBottom: "25px" }}>
            <StatCard
              icon="♻️"
              title="Recycled Items"
              value={loading ? "..." : String(impactData?.recycled_items || 0)}
              description="Total items diverted from landfill"
            />

            <StatCard
              icon="🌱"
              title="CO₂ Avoided"
              value={loading ? "..." : `${impactData?.co2_kg || 0} kg`}
              description="Estimated greenhouse gas savings"
            />

            <StatCard
              icon="💧"
              title="Water Saved"
              value={loading ? "..." : `${impactData?.water_liters || 0} L`}
              description="Freshwater conserved by recycling"
            />

            <StatCard
              icon="⚡"
              title="Energy Saved"
              value={loading ? "..." : `${impactData?.energy_kwh || 0} kWh`}
              description="Power conserved vs virgin manufacturing"
            />
          </div>

          {/* INTERACTIVE PERSONAL CARBON FOOTPRINT SIMULATOR */}
          <div
            style={{
              background: "linear-gradient(135deg, #1b5e20, #2e7d32)",
              color: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              marginBottom: "25px",
              boxShadow: "0 6px 24px rgba(27,94,32,0.2)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: "12px" }}>
                  INTERACTIVE SIMULATOR
                </span>
                <h3 style={{ margin: "6px 0 0 0", fontSize: "20px" }}>
                  🧮 Personal Annual Carbon Offset Calculator
                </h3>
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "22px", fontWeight: "900" }}>{annualCo2} kg</div>
                  <div style={{ fontSize: "11px", opacity: 0.85 }}>Annual CO₂ Prevented</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "22px", fontWeight: "900" }}>{treesEquivalent}</div>
                  <div style={{ fontSize: "11px", opacity: 0.85 }}>Trees Planted Equiv.</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", background: "rgba(255,255,255,0.1)", padding: "16px", borderRadius: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  🥤 Plastic Bottles / Wk: <b>{weeklyPlastics}</b>
                </label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={weeklyPlastics}
                  onChange={(e) => setWeeklyPlastics(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#81c784", cursor: "pointer" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  📦 Paper &amp; Cardboard / Wk: <b>{weeklyPaper}</b>
                </label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={weeklyPaper}
                  onChange={(e) => setWeeklyPaper(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#81c784", cursor: "pointer" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  🍾 Glass Containers / Wk: <b>{weeklyGlass}</b>
                </label>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={weeklyGlass}
                  onChange={(e) => setWeeklyGlass(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#81c784", cursor: "pointer" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  🥫 Metal Cans / Wk: <b>{weeklyMetal}</b>
                </label>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={weeklyMetal}
                  onChange={(e) => setWeeklyMetal(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#81c784", cursor: "pointer" }}
                />
              </div>
            </div>
          </div>

          {/* LOCAL MUNICIPAL RECYCLING GUIDELINES CARD */}
          {impactData?.city_guidelines && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #c8e6c9",
                borderRadius: "20px",
                padding: "24px",
                marginBottom: "25px",
                boxShadow: "0 3px 12px rgba(0,0,0,0.03)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#1b5e20", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🏛️ Municipal Segregation Guidelines for</span>
                  <span style={{ background: "#e8f5e9", padding: "2px 10px", borderRadius: "12px", fontSize: "14px" }}>
                    {userLocation?.city || userLocation?.displayName || "Your City"}
                  </span>
                </h3>
                <span style={{ fontSize: "11px", fontWeight: "bold", color: "#2e7d32", textTransform: "uppercase" }}>
                  Segregation Stream Rules
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                <div style={{ background: "#e3f2fd", border: "1px solid #bbdefb", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1565c0" }}>🔵 Blue Bin (Dry Recyclables)</div>
                  <div style={{ fontSize: "12px", color: "#0d47a1", marginTop: "6px", lineHeight: "1.5" }}>
                    {impactData.city_guidelines.dry_recyclables}
                  </div>
                </div>

                <div style={{ background: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#2e7d32" }}>🟢 Green Bin (Organics & Food)</div>
                  <div style={{ fontSize: "12px", color: "#1b5e20", marginTop: "6px", lineHeight: "1.5" }}>
                    {impactData.city_guidelines.organics}
                  </div>
                </div>

                <div style={{ background: "#f3e5f5", border: "1px solid #e1bee7", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#7b1fa2" }}>🔴 Red Bin / Drop-Off (E-Waste)</div>
                  <div style={{ fontSize: "12px", color: "#4a148c", marginTop: "6px", lineHeight: "1.5" }}>
                    {impactData.city_guidelines.hazardous_ewaste}
                  </div>
                </div>

                <div style={{ background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#424242" }}>⚫ Black Bin (Non-Recyclable Trash)</div>
                  <div style={{ fontSize: "12px", color: "#212121", marginTop: "6px", lineHeight: "1.5" }}>
                    {impactData.city_guidelines.landfill}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CITIZEN GARBAGE ACCUMULATION REPORTING FORM */}
          <ReportGarbageForm userLocation={userLocation} />
        </section>
      </main>
    </div>
  );
}

export default Impact;