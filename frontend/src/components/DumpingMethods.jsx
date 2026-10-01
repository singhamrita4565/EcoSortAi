import { useState } from "react";

function DumpingMethods({ userLocation }) {
  const [activeTab, setActiveTab] = useState("all");

  const city = userLocation?.city || userLocation?.displayName?.split(",")[0] || "Your Local Area";

  const methods = [
    {
      id: "doorstep",
      category: "municipal",
      title: "🚛 Municipal Doorstep Collection",
      badge: "Official Service",
      badgeBg: "#e8f5e9",
      badgeColor: "#1b5e20",
      icon: "🏠",
      description: `Daily & weekly scheduled pickup operating across ${city}. Segregate waste into color-coded bins at source.`,
      steps: [
        "🔵 Blue Bin: Clean dry paper, cardboard, rigid plastics (#1, #2), & aluminum cans.",
        "🟢 Green Bin: Kitchen food waste, fruit peels, vegetable scraps, and garden waste.",
        "🔴 Red Box: Household batteries, electronic wires, expired medicines, & CFL bulbs.",
        "⚫ Black Bin: Soiled items, sanitary waste, non-recyclable multi-layer plastics."
      ],
      availability: "High (Available in most urban & suburban wards)",
      timing: "Morning 7:00 AM - 10:30 AM daily"
    },
    {
      id: "dropoff",
      category: "recycling",
      title: "♻️ Community Recycling Drop-Off Hubs",
      badge: "Self Drop-Off",
      badgeBg: "#e3f2fd",
      badgeColor: "#0d47a1",
      icon: "📍",
      description: `Centralized community recycling banks in ${city} for large cardboard boxes, glass containers, and bulk plastics.`,
      steps: [
        "Rinse and flatten cardboard boxes to maximize bin space.",
        "Separate clear glass from colored bottles before drop-off.",
        "Remove caps and lids from plastic containers.",
        "Deposit items directly into dedicated material hoppers."
      ],
      availability: "Available at municipal centers & transit stations",
      timing: "Open 24/7 or 8:00 AM - 6:00 PM"
    },
    {
      id: "ewaste",
      category: "hazardous",
      title: "🔴 E-Waste & Hazardous Material Take-Back",
      badge: "Specialized",
      badgeBg: "#f3e5f5",
      badgeColor: "#4a148c",
      icon: "🔋",
      description: "Authorized e-waste collection points for safe extraction of heavy metals, circuit boards, and lithium batteries.",
      steps: [
        "Do NOT place lithium batteries or broken electronics in regular trash.",
        "Tape terminal contacts on lithium batteries with tape to prevent short circuits.",
        "Drop off laptops, smartphones, cables, and chargers at certified drop boxes.",
        "Participate in electronic brand trade-in programs for store credits."
      ],
      availability: "High (Authorized electronic service centers & store bins)",
      timing: "Store business hours (10:00 AM - 8:00 PM)"
    },
    {
      id: "compost",
      category: "organic",
      title: "🌿 Community & Home Composting Methods",
      badge: "Zero Waste",
      badgeBg: "#f0f4c3",
      badgeColor: "#33691e",
      icon: "🌱",
      description: "Turn organic kitchen waste into nutrient-rich soil compost, diverting up to 40% of household waste from landfills.",
      steps: [
        "Pot Composting: Layer 2 parts dry brown leaves/sawdust with 1 part wet kitchen scraps in a ventilated terracotta pot.",
        "Pits / Tumblers: Add nitrogen-rich food scraps, turn weekly for aeration.",
        "Vermicomposting: Use earthworms in shaded bin for rapid 45-day organic fertilizer decomposition.",
        "Avoid adding cooked oil, dairy, or meat scraps to prevent odor and pests."
      ],
      availability: "100% Home DIY or Community Park compost pits",
      timing: "Takes 30 to 60 days to yield organic fertilizer"
    },
    {
      id: "scrap",
      category: "cash",
      title: "💸 Scrap Dealer & Kabadiwala Cash Trade-Ins",
      badge: "Earn Cash",
      badgeBg: "#fff8e1",
      badgeColor: "#f57f17",
      icon: "💵",
      description: "Trade high-value scrap recyclables (old newspapers, brass/copper, aluminum cans, heavy plastics) for cash payouts.",
      steps: [
        "Bundle old newspapers, magazines, and corrugated cardboard securely with string.",
        "Crush aluminum beverage cans and stack metal scrap.",
        "Schedule home doorstep scrap pickup or visit local scrap collector yard.",
        "Receive instant cash payment per kilogram based on daily market rates."
      ],
      availability: "High (Doorstep pickup apps & neighborhood scrap yards)",
      timing: "Mon - Sat (9:00 AM - 7:00 PM)"
    },
    {
      id: "retail",
      category: "retail",
      title: "🏬 Supermarket & Retail Take-Back Bins",
      badge: "In-Store",
      badgeBg: "#e0f2f1",
      badgeColor: "#004d40",
      icon: "🛒",
      description: "Return grocery bags, soft plastic film, and beverage bottles at local supermarket return stations.",
      steps: [
        "Return clean, dry plastic grocery bags, bubble wrap, and bread bags to storefront collection bins.",
        "Use Reverse Vending Machines (RVMs) for PET bottle and aluminum can deposit returns.",
        "Claim retail rewards points or discount coupons per returned bottle."
      ],
      availability: "Available at participating supermarkets & shopping malls",
      timing: "Mall / Supermarket Operating Hours"
    }
  ];

  const filteredMethods = activeTab === "all"
    ? methods
    : methods.filter(m => m.category === activeTab);

  return (
    <div style={{ marginTop: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <span className="small-label">RESOURCE &amp; DISPOSAL GUIDE</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "20px", color: "#1b5e20" }}>
            📍 Garbage Dumping &amp; Disposal Methods in {city}
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#616161" }}>
            Recommended waste disposal streams tailored to your location's municipal infrastructure and local recycling facilities.
          </p>
        </div>

        {/* CATEGORY FILTER TABS */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Methods" },
            { id: "municipal", label: "🚛 Doorstep Pickup" },
            { id: "recycling", label: "♻️ Drop-Off Hubs" },
            { id: "hazardous", label: "🔴 E-Waste" },
            { id: "organic", label: "🌿 Composting" },
            { id: "cash", label: "💸 Cash Scrap" }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "16px",
                border: activeTab === tab.id ? "1px solid #2e7d32" : "1px solid #e0e0e0",
                background: activeTab === tab.id ? "#2e7d32" : "#ffffff",
                color: activeTab === tab.id ? "#ffffff" : "#424242",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* METHODS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" }}>
        {filteredMethods.map((m) => (
          <div
            key={m.id}
            style={{
              background: "#ffffff",
              border: "1px solid #e5ebe6",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 3px 12px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              justify: "space-between",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "16px", color: "#173f2c", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{m.title}</span>
                </h4>
                <span
                  style={{
                    background: m.badgeBg,
                    color: m.badgeColor,
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    whiteSpace: "nowrap"
                  }}
                >
                  {m.badge}
                </span>
              </div>

              <p style={{ fontSize: "13px", color: "#546e7a", lineHeight: "1.5", marginBottom: "14px" }}>
                {m.description}
              </p>

              <div style={{ background: "#f8fbf8", border: "1px solid #e8f2e9", borderRadius: "12px", padding: "12px", marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#2e7d32", marginBottom: "8px" }}>
                  📋 Step-by-Step Dumping Instructions:
                </div>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#2e3b32", lineHeight: "1.6" }}>
                  {m.steps.map((step, idx) => (
                    <li key={idx} style={{ marginBottom: "4px" }}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #edf2ee", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#616161" }}>
              <span>📍 <b>Availability:</b> {m.availability}</span>
              <span>⏰ <b>Operating:</b> {m.timing}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DumpingMethods;
