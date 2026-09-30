import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import ScanCard from "../components/ScanCard";
import { getEnvironmentalImpact } from "../services/api";

function Dashboard() {
  const [stats, setStats] = useState({
    total_scans: 0,
    recycled_items: 0,
    co2_kg: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await getEnvironmentalImpact();
        if (res.status === "success") {
          setStats(res);
        }
      } catch (e) {
        console.error("Dashboard stats error:", e);
      }
    }
    fetchStats();
  }, []);

  const ecoScore = Math.min(100, stats.recycled_items * 10);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          <div className="welcome-section">
            <div>
              <span className="small-label">WELCOME TO ECOSORT AI 👋</span>
              <h2>Make every waste item count.</h2>
              <p>
                Use AI to identify waste and discover the right way to recycle or decompose it.
              </p>
            </div>
          </div>

          <div className="stats-grid">
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
              description="Keep building your impact"
            />

            <StatCard
              icon="🌱"
              title="Eco Score"
              value={`${ecoScore}/100`}
              description="Your sustainability score"
            />

            <StatCard
              icon="🌍"
              title="CO₂ Saved"
              value={`${stats.co2_kg} kg`}
              description="Estimated environmental impact"
            />
          </div>

          <ScanCard />

          <div className="dashboard-grid">
            <div className="dashboard-panel">
              <div className="panel-header">
                <span className="small-label">HOW IT WORKS</span>
                <h2>AI-Powered Recycling</h2>
              </div>

              <div className="steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div>
                    <h3>Upload or Capture</h3>
                    <p>Take a live camera photo or upload an image of your waste item.</p>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">2</div>
                  <div>
                    <h3>AI Analysis</h3>
                    <p>YOLO AI identifies the material, recyclability, and decomposition time.</p>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">3</div>
                  <div>
                    <h3>Get GIS Guidance</h3>
                    <p>Receive disposal instructions and locate nearby GIS recycling centers.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-panel tip-panel">
              <span className="tip-icon">💡</span>
              <h2>Why proper sorting matters</h2>
              <p>
                Correctly sorting recyclable materials reduces landfill methane emissions, conserves up to 95% manufacturing energy, and prevents hazardous e-waste soil contamination.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;