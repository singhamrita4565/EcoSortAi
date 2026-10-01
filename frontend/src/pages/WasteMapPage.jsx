import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import WasteMap from "../components/WasteMap";
import DumpingMethods from "../components/DumpingMethods";
import { detectUserLocation } from "../services/api";

function WasteMapPage() {
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function loadLoc() {
      try {
        setLoading(true);
        const loc = await detectUserLocation();
        setUserLocation(loc);
      } catch (err) {
        console.error("Location error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLoc();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          {/* HEADER INTRODUCTION */}
          <div className="page-introduction">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span className="small-label">GEOSPATIAL RECYCLING &amp; DISPOSAL</span>
                <h2>Interactive Waste Map &amp; Garbage Hotspots</h2>
                <p>
                  Locate authorized recycling drop-offs, e-waste centers, organic compost hubs, and report illegal garbage dumping hotspots in real-time.
                </p>
              </div>

              {/* LOCATION BADGE */}
              <div
                style={{
                  background: "#eef7f0",
                  border: "1px solid #c3e5ca",
                  borderRadius: "14px",
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "18px" }}>📍</span>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#2e7d32" }}>
                    Active Location
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1b5e20" }}>
                    {loading ? "Detecting area..." : userLocation?.displayName || "Local Area"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN INTERACTIVE LEAFLET MAP & HOTSPOT DETECTOR */}
          <WasteMap initialLocation={userLocation} />

          {/* LOCATION-BASED GARBAGE DUMPING METHODS SECTION */}
          <DumpingMethods userLocation={userLocation} />
        </section>
      </main>
    </div>
  );
}

export default WasteMapPage;
