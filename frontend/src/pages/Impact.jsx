import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import WasteMap from "../components/WasteMap";
import { getEnvironmentalImpact } from "../services/api";

function Impact() {
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const impactRes = await getEnvironmentalImpact();
        setImpactData(impactRes);
      } catch (err) {
        console.error("Impact error:", err);
        setError("Could not load environmental metrics.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          <div className="page-introduction">
            <span className="small-label">ENVIRONMENT, GIS MAP &amp; HOTSPOTS</span>
            <h2>Environmental Impact &amp; Interactive Waste Map</h2>
            <p>
              Track your real-world carbon reduction, explore nearby dustbins &amp; recycling centers on OpenStreetMap, and monitor Garbage Hotspots.
            </p>
          </div>

          {error && <div className="camera-error">⚠️ {error}</div>}

          {/* STATS GRID */}
          <div className="stats-grid">
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

          {/* INTERACTIVE LEAFLET + OPENSTREETMAP & GARBAGE HOTSPOT DETECTOR */}
          <WasteMap />
        </section>
      </main>
    </div>
  );
}

export default Impact;