import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { getScanHistory } from "../services/api";

function Profile() {
  const [user, setUser]               = useState(null);
  const [scanCount, setScanCount]     = useState(0);
  const [recycledCount, setRecycledCount] = useState(0);
  const [editing, setEditing]         = useState(false);
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("ecosort_user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setName(parsed.name || "");
        setEmail(parsed.email || "");
      } catch (e) {
        console.error(e);
      }
    }

    async function loadStats() {
      try {
        const historyRes = await getScanHistory();
        if (historyRes.status === "success" && historyRes.history) {
          setScanCount(historyRes.history.length);
          const recycled = historyRes.history.filter((s) =>
            (s.action || "").toUpperCase().includes("RECYCLE")
          ).length;
          setRecycledCount(recycled);
        }
      } catch (err) {
        console.error("Profile stats error:", err);
      }
    }

    loadStats();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (!user) return;

    const updated = { ...user, name, email };
    localStorage.setItem("ecosort_user", JSON.stringify(updated));
    setUser(updated);
    setEditing(false);
    alert("Profile updated successfully!");
  };

  const getRankBadge = (count) => {
    if (count >= 20) return "🏆 Eco Master";
    if (count >= 10) return "🌟 Green Pioneer";
    if (count >= 5)  return "🌱 Recycling Advocate";
    return "🍃 Eco Explorer";
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          <div className="page-introduction">
            <span className="small-label">ACCOUNT</span>
            <h2>Profile</h2>
            <p>Manage your EcoSort AI account profile and track your eco-rank progress.</p>
          </div>

          <div className="profile-card" style={{ maxWidth: "800px", display: "flex", gap: "30px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div className="large-avatar" style={{ width: "90px", height: "90px", fontSize: "36px", flexShrink: 0 }}>
              {initial}
            </div>

            <div className="profile-details" style={{ flex: 1 }}>
              {!editing ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2>{user?.name || "Eco User"}</h2>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      style={{
                        padding: "6px 14px",
                        border: "1px solid #d4ddd4",
                        borderRadius: "8px",
                        background: "#f4f8f4",
                        color: "#2e7d32",
                        fontWeight: "600",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      ✏️ Edit Profile
                    </button>
                  </div>

                  <p style={{ margin: "4px 0 12px", color: "#666" }}>{user?.email || "user@example.com"}</p>

                  <div style={{ display: "inline-block", background: "#e8f5ea", color: "#256e3b", padding: "6px 14px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" }}>
                    {getRankBadge(recycledCount)}
                  </div>

                  <div style={{ display: "flex", gap: "30px", marginTop: "20px" }}>
                    <div className="profile-stat">
                      <span>Total Scans</span>
                      <strong>{scanCount}</strong>
                    </div>

                    <div className="profile-stat">
                      <span>Items Recycled</span>
                      <strong>{recycledCount}</strong>
                    </div>

                    <div className="profile-stat">
                      <span>Account Status</span>
                      <strong style={{ color: "#31864a" }}>Active Member</strong>
                    </div>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSave} style={{ width: "100%" }}>
                  <div className="form-group" style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px" }}>Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px" }}>Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button type="submit" className="primary-btn" style={{ padding: "8px 18px", fontSize: "13px" }}>
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      style={{ padding: "8px 18px", fontSize: "13px", borderRadius: "8px", border: "1px solid #ccc", background: "white" }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Profile;