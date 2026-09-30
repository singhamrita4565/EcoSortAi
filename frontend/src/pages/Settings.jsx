import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function Settings() {
  const [settings, setSettings] = useState({
    notifications: true,
    tips: true,
    gisLocation: true,
    darkMode: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("ecosort_settings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    localStorage.setItem("ecosort_settings", JSON.stringify(updated));
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          <div className="page-introduction">
            <span className="small-label">PREFERENCES</span>
            <h2>Settings</h2>
            <p>Configure your EcoSort AI application preferences, notifications, and location services.</p>
          </div>

          <div className="settings-panel">
            <div className="setting-row">
              <div>
                <h3>Recycling Notifications</h3>
                <p>Receive weekly recycling summaries and eco-reminders.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={() => handleToggle("notifications")}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
              />
            </div>

            <div className="setting-row">
              <div>
                <h3>Environmental &amp; Sustainability Tips</h3>
                <p>Show useful daily waste reduction and composting tips on the dashboard.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.tips}
                onChange={() => handleToggle("tips")}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
              />
            </div>

            <div className="setting-row">
              <div>
                <h3>GIS Location-Based Disposal Services</h3>
                <p>Allow location access to discover nearby authorized recycling and e-waste centers.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.gisLocation}
                onChange={() => handleToggle("gisLocation")}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
              />
            </div>

            <div className="setting-row">
              <div>
                <h3>Compact Dashboard View</h3>
                <p>Optimize dashboard layout for smaller screen displays.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={() => handleToggle("darkMode")}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Settings;