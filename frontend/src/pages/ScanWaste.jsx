import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ImageUploader from "../components/ImageUploader";
import LoadingSpinner from "../components/LoadingSpinner";

import { scanWaste } from "../services/api";

function ScanWaste() {
  const navigate = useNavigate();

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const handleScan = async () => {
    if (!selectedImage) {
      alert("Please upload a waste image first.");
      return;
    }

    try {
      setLoading(true);

      // Send image to FastAPI backend
      const result = await scanWaste(selectedImage);

      console.log("AI Result:", result);

      // Convert uploaded image into Base64
      // so it can be displayed on the Result page.
      const reader = new FileReader();

      reader.onloadend = () => {
        const imageData = reader.result;

        // Store AI result
        sessionStorage.setItem(
          "ecosortResult",
          JSON.stringify(result)
        );

        // Store uploaded image
        sessionStorage.setItem(
          "ecosortImage",
          imageData
        );

        // Open Result page
        navigate("/result");
      };

      reader.readAsDataURL(selectedImage);

    } catch (error) {
      console.error("Scan error:", error);

      alert(
        error.message ||
          "Something went wrong while analyzing the image."
      );

      setLoading(false);
    }
  };

  return (
    <div className="app-layout">

      <Sidebar />

      <main className="main-content">

        <Navbar />

        <section className="page-content">

          <div className="page-introduction">

            <span className="small-label">
              AI WASTE SCANNER
            </span>

            <h2>
              Identify Your Waste
            </h2>

            <p>
              Upload a clear image of your waste item.
              EcoSort AI will analyze it using computer vision.
            </p>

          </div>

          <div className="scan-layout">

            <div className="scan-main-panel">

              {!loading ? (
                <>
                  <ImageUploader
                    onImageSelected={setSelectedImage}
                  />

                  <button
                    className="scan-button"
                    type="button"
                    onClick={handleScan}
                    disabled={!selectedImage}
                  >
                    🤖 Prepare for AI Analysis
                  </button>
                </>
              ) : (
                <LoadingSpinner />
              )}

            </div>

            <div className="scan-info-panel">

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#173f2c" }}>
                  🎯 Multi-Object AI Scanner Tips
                </h3>
                <span style={{ fontSize: "10px", background: "#e8f5e9", color: "#2e7d32", padding: "3px 8px", borderRadius: "10px", fontWeight: "bold" }}>
                  ~95% Accuracy
                </span>
              </div>

              <div className="info-item">
                <span>💡</span>
                <p>
                  <b>Optimal Lighting:</b> Position item in good ambient light. Our automatic Pillow pre-processor balances medium/dim photos.
                </p>
              </div>

              <div className="info-item">
                <span>📸</span>
                <p>
                  <b>Multi-Object Scan:</b> You can include up to 6 waste objects in a single photo (e.g. plastic bottle &amp; glass jar together).
                </p>
              </div>

              <div className="info-item">
                <span>🧽</span>
                <p>
                  <b>Contamination Detection:</b> EcoSort AI scans for dirt &amp; food grease stains, advising if a 5-second rinse is needed.
                </p>
              </div>

              {/* DETECTABLE CLASSES CATEGORIES CHEAT SHEET */}
              <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e0e0e0" }}>
                <h4 style={{ fontSize: "13px", color: "#1b5e20", marginBottom: "10px" }}>
                  🏷️ Detectable Material Categories
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div style={{ padding: "8px", background: "#f4f8f4", borderRadius: "8px", fontSize: "11px", color: "#2e7d32", fontWeight: "600" }}>
                    🥤 Plastic (PET/HDPE)
                  </div>
                  <div style={{ padding: "8px", background: "#f4f8f4", borderRadius: "8px", fontSize: "11px", color: "#0288d1", fontWeight: "600" }}>
                    🍾 Glass (Jars/Bottles)
                  </div>
                  <div style={{ padding: "8px", background: "#f4f8f4", borderRadius: "8px", fontSize: "11px", color: "#d32f2f", fontWeight: "600" }}>
                    🥫 Metal (Cans/Foil)
                  </div>
                  <div style={{ padding: "8px", background: "#f4f8f4", borderRadius: "8px", fontSize: "11px", color: "#f57c00", fontWeight: "600" }}>
                    📦 Paper &amp; Cardboard
                  </div>
                  <div style={{ padding: "8px", background: "#f4f8f4", borderRadius: "8px", fontSize: "11px", color: "#7b1fa2", fontWeight: "600" }}>
                    🔋 Batteries (Hazardous)
                  </div>
                  <div style={{ padding: "8px", background: "#f4f8f4", borderRadius: "8px", fontSize: "11px", color: "#3f51b5", fontWeight: "600" }}>
                    💻 E-Waste Electronics
                  </div>
                </div>
              </div>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default ScanWaste;