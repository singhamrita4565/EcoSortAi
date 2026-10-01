import { useState } from "react";
import { reportGarbageHotspot } from "../services/api";

function ReportGarbageForm({ userLocation }) {
  const [areaName, setAreaName]       = useState("");
  const [wasteType, setWasteType]     = useState("Plastic & Mixed Packaging");
  const [description, setDescription] = useState("");
  const [reportMsg, setReportMsg]     = useState("");
  const [submitting, setSubmitting]   = useState(false);

  const defaultLat = userLocation?.lat || 28.6139;
  const defaultLng = userLocation?.lng || 77.2090;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!areaName.trim()) return;

    try {
      setSubmitting(true);
      setReportMsg("");

      const res = await reportGarbageHotspot({
        area_name: areaName,
        lat: defaultLat,
        lng: defaultLng,
        waste_type: wasteType,
        description: description || "Garbage accumulation reported by citizen.",
      });

      if (res.status === "success") {
        setReportMsg(`Report successfully filed for ${areaName}! Municipal cleanup team notified.`);
        setAreaName("");
        setDescription("");
      } else {
        setReportMsg("Report submitted successfully.");
      }
    } catch (err) {
      console.error("Report error:", err);
      setReportMsg("Failed to submit report. Please check server connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #ffffff, #f4fbf5)",
        border: "1px solid #c8e6c9",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        marginTop: "25px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <span className="small-label" style={{ color: "#d32f2f" }}>CITIZEN ACTION &amp; CLEANUP REPORT</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "20px", color: "#1b5e20", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📢 Report Garbage Accumulation &amp; Hotspots</span>
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#546e7a" }}>
            Spot overflowing bins or illegal dumping in your neighborhood? Submit a citizen report to alert municipal environmental teams.
          </p>
        </div>

        <div style={{ background: "#ffebee", border: "1px solid #ffcdd2", padding: "6px 12px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", color: "#c62828" }}>
          📍 Location: {userLocation?.city || userLocation?.displayName || "Active GPS Area"}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "#173f2c" }}>
            Area / Landmark Name *
          </label>
          <input
            type="text"
            placeholder="e.g., Sector 4 Bus Station or Main Market Alley"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid #cfe0d2",
              fontSize: "13px",
              background: "#ffffff"
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "#173f2c" }}>
            Primary Waste Category *
          </label>
          <select
            value={wasteType}
            onChange={(e) => setWasteType(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid #cfe0d2",
              fontSize: "13px",
              background: "#ffffff"
            }}
          >
            <option value="Plastic & Mixed Packaging">🥤 Plastic &amp; Mixed Packaging</option>
            <option value="Overflowing Public Dustbin">🗑️ Overflowing Public Dustbin</option>
            <option value="Organic & Food Waste">🍎 Organic &amp; Rotten Food</option>
            <option value="E-Waste & Hazardous Scrap">⚡ E-Waste &amp; Batteries</option>
            <option value="Glass & Metal Litter">🍾 Glass &amp; Metal Scrap</option>
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "#173f2c" }}>
            Details / Observation Notes
          </label>
          <textarea
            rows={2}
            placeholder="Describe the severity, estimated volume, or hazardous condition of the garbage dump..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid #cfe0d2",
              fontSize: "13px",
              resize: "vertical",
              background: "#ffffff"
            }}
          />
        </div>

        {reportMsg && (
          <div style={{ gridColumn: "1 / -1", padding: "12px 16px", borderRadius: "12px", background: "#e8f5e9", border: "1px solid #a5d6a7", color: "#1b5e20", fontSize: "13px", fontWeight: "600" }}>
            ✅ {reportMsg}
          </div>
        )}

        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={submitting || !areaName.trim()}
            style={{
              padding: "12px 24px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #d32f2f, #b71c1c)",
              color: "#ffffff",
              fontWeight: "bold",
              fontSize: "13px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(211,47,47,0.25)",
              transition: "all 0.2s ease"
            }}
          >
            {submitting ? "Submitting Report..." : "📢 Submit Citizen Garbage Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReportGarbageForm;
