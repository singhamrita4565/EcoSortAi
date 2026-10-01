import { useEffect, useRef, useState } from "react";
import {
  getGisCenters,
  getGarbageHotspots,
  reportGarbageHotspot,
  takeMunicipalAction,
  getReverseGeocode
} from "../services/api";

function WasteMap({ initialLocation }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const layerGroupRef   = useRef(null);

  const [userCoords, setUserCoords] = useState({
    lat: initialLocation?.lat || 28.6139,
    lng: initialLocation?.lng || 77.2090,
  });
  const [cityName, setCityName]     = useState(initialLocation?.city || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching]   = useState(false);

  const [centers, setCenters]       = useState([]);
  const [hotspots, setHotspots]     = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Hotspot reporting form state
  const [areaName, setAreaName]       = useState("");
  const [wasteType, setWasteType]     = useState("Plastic & Mixed Packaging");
  const [description, setDescription] = useState("");
  const [clickedCoords, setClickedCoords] = useState(null);
  const [reportMsg, setReportMsg]     = useState("");
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    if (initialLocation?.lat && initialLocation?.lng) {
      setUserCoords({ lat: initialLocation.lat, lng: initialLocation.lng });
      if (initialLocation.city) setCityName(initialLocation.city);
    }
  }, [initialLocation]);

  // 1. Fetch GIS Centers & Garbage Hotspots
  const loadMapData = async (lat, lng, city = "") => {
    try {
      const [centersRes, hotspotsRes] = await Promise.all([
        getGisCenters(lat, lng, "", city),
        getGarbageHotspots(lat, lng),
      ]);
      if (centersRes.status === "success") {
        setCenters(centersRes.centers || []);
      }
      if (hotspotsRes.status === "success") {
        setHotspots(hotspotsRes.hotspots || []);
      }
    } catch (err) {
      console.error("Failed to load GIS map data:", err);
    }
  };

  useEffect(() => {
    loadMapData(userCoords.lat, userCoords.lng, cityName);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 13);
    }
  }, [userCoords.lat, userCoords.lng, cityName]);

  // Search location by city or landmark name
  const handleLocationSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const top = results[0];
          const newLat = parseFloat(top.lat);
          const newLng = parseFloat(top.lon);
          const nameParts = top.display_name.split(",");
          const mainCity = nameParts[0] || searchQuery;

          const newLoc = {
            lat: newLat,
            lng: newLng,
            city: mainCity,
            displayName: top.display_name,
            source: "Search"
          };

          setUserCoords({ lat: newLat, lng: newLng });
          setCityName(mainCity);
          saveUserLocation(newLoc);

          if (mapInstanceRef.current) {
            if (mapInstanceRef.current.flyTo) {
              mapInstanceRef.current.flyTo([newLat, newLng], 13, { duration: 1.2 });
            } else {
              mapInstanceRef.current.setView([newLat, newLng], 13);
            }
          }
        } else {
          alert(`No locations found for "${searchQuery}". Please try another city.`);
        }
      }
    } catch (err) {
      alert("Location search error: " + err.message);
    } finally {
      setSearching(false);
    }
  };

  // 2. Initialize Leaflet + OpenStreetMap
  useEffect(() => {
    const L = window.L;
    if (!L || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(
        [userCoords.lat, userCoords.lng],
        13
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | EcoSort AI GIS',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      layerGroupRef.current = layerGroup;

      // Allow user to click anywhere on the map to pick coordinates for a garbage report
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        setClickedCoords({
          lat: Number(lat.toFixed(5)),
          lng: Number(lng.toFixed(5)),
        });
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Render Markers & Garbage Hotspot Circles whenever data or filter changes
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!L || !map || !layerGroup) return;

    layerGroup.clearLayers();

    // User current location pin
    const userIcon = L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background:#1b5e20;color:#fff;border:2px solid #fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">📍</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
      .bindPopup(`<b>📍 Your Current Area</b><br/>Lat: ${userCoords.lat.toFixed(4)}, Lng: ${userCoords.lng.toFixed(4)}`)
      .addTo(layerGroup);

    // Plot Waste Facilities (Dustbins, Recycling, Composting, E-Waste)
    if (activeFilter !== "HOTSPOTS") {
      centers
        .filter((c) => activeFilter === "ALL" || c.type === activeFilter)
        .forEach((center) => {
          const badgeIcon = L.divIcon({
            className: "facility-div-icon",
            html: `<div style="background:${center.color || "#2e7d32"};color:#fff;border:2px solid #fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 3px 8px rgba(0,0,0,0.25);">${center.icon || "♻️"}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          });

          const popupHtml = `
            <div style="min-width:210px;font-family:sans-serif;">
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;background:#e8f5e9;color:#2e7d32;padding:2px 7px;border-radius:10px;">
                ${center.type}
              </span>
              <h4 style="margin:6px 0 4px;font-size:14px;color:#173f2c;">${center.name}</h4>
              <p style="margin:2px 0;font-size:12px;color:#555;">📍 ${center.address}</p>
              <p style="margin:2px 0;font-size:12px;color:#555;">🕒 ${center.hours}</p>
              <p style="margin:4px 0;font-size:11px;color:#2e7d32;font-weight:600;">📏 ${center.distance_km} km away</p>
              <a href="${center.maps_url}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;font-size:12px;color:#1976d2;font-weight:600;text-decoration:none;">
                🧭 Open in OpenStreetMap &rarr;
              </a>
            </div>
          `;

          L.marker([center.lat, center.lng], { icon: badgeIcon })
            .bindPopup(popupHtml)
            .addTo(layerGroup);
        });
    }

    // Plot Garbage Hotspots (Red/Orange/Yellow accumulation zones)
    if (activeFilter === "ALL" || activeFilter === "HOTSPOTS") {
      hotspots.forEach((h) => {
        const zoneColor =
          h.severity === "High"
            ? "#d32f2f"
            : h.severity === "Medium"
            ? "#f57c00"
            : "#fbc02d";

        // Draw Hotspot Circle on OpenStreetMap
        L.circle([h.lat, h.lng], {
          color: zoneColor,
          fillColor: zoneColor,
          fillOpacity: 0.28,
          radius: h.radius_m || 250,
          weight: 2,
        }).addTo(layerGroup);

        // Draw Hotspot Alert Pin
        const hotspotIcon = L.divIcon({
          className: "hotspot-div-icon",
          html: `<div style="background:${zoneColor};color:#fff;border:2px solid #fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:bold;box-shadow:0 0 12px ${zoneColor};">⚠️</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const hotspotPopup = `
          <div style="min-width:220px;font-family:sans-serif;">
            <span style="font-size:10px;font-weight:700;background:${zoneColor};color:#fff;padding:2px 8px;border-radius:10px;">
              🔥 ${h.severity.toUpperCase()} GARBAGE HOTSPOT
            </span>
            <h4 style="margin:6px 0 4px;font-size:14px;color:#b71c1c;">${h.area_name}</h4>
            <p style="margin:3px 0;font-size:12px;color:#333;"><b>📊 Reports:</b> ${h.reports_count} citizen complaints</p>
            <p style="margin:3px 0;font-size:12px;color:#333;"><b>🗑️ Primary Waste:</b> ${h.waste_type}</p>
            <p style="margin:3px 0;font-size:11px;color:#555;">${h.description}</p>
            <p style="margin:6px 0 0;font-size:11px;font-weight:600;color:#d32f2f;">🚨 ${h.status}</p>
          </div>
        `;

        L.marker([h.lat, h.lng], { icon: hotspotIcon })
          .bindPopup(hotspotPopup)
          .addTo(layerGroup);
      });
    }

    // Show temporary pin where user clicked on map
    if (clickedCoords) {
      const clickIcon = L.divIcon({
        className: "click-div-icon",
        html: `<div style="background:#d32f2f;color:#fff;border:2px solid #fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;">📌</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([clickedCoords.lat, clickedCoords.lng], { icon: clickIcon })
        .bindPopup(`<b>Selected Report Location</b><br/>Lat: ${clickedCoords.lat}, Lng: ${clickedCoords.lng}`)
        .addTo(layerGroup)
        .openPopup();
    }
  }, [centers, hotspots, activeFilter, userCoords, clickedCoords]);

  // Use browser GPS location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setUserCoords({ lat: newLat, lng: newLng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 14);
        }
      },
      () => {
        alert("Unable to fetch GPS location. Showing default city center.");
      }
    );
  };

  // Submit new Garbage Hotspot report
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!areaName.trim()) return;

    try {
      setSubmitting(true);
      setReportMsg("");
      const targetLat = clickedCoords ? clickedCoords.lat : userCoords.lat + (Math.random() * 0.016 - 0.008);
      const targetLng = clickedCoords ? clickedCoords.lng : userCoords.lng + (Math.random() * 0.016 - 0.008);

      const res = await reportGarbageHotspot({
        area_name: areaName,
        waste_type: wasteType,
        description,
        lat: targetLat,
        lng: targetLng,
      });

      setReportMsg(res.message || "Garbage report plotted on map!");
      setAreaName("");
      setDescription("");
      setClickedCoords(null);
      await loadMapData(userCoords.lat, userCoords.lng);
    } catch (err) {
      setReportMsg("Failed to submit report: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filterButtons = [
    { label: "🌍 Show All", value: "ALL" },
    { label: "🗑️ Dustbins", value: "Dustbin" },
    { label: "♻️ Recycling Centers", value: "Recycling Center" },
    { label: "🌱 Composting Centers", value: "Composting Center" },
    { label: "🔋 E-Waste Points", value: "E-Waste Point" },
    { label: "🔥 Garbage Hotspots", value: "HOTSPOTS" },
  ];

  return (
    <div style={{ marginTop: "30px" }}>
      {/* MAP HEADER & CONTROLS */}
      <div className="impact-panel" style={{ marginBottom: "24px" }}>
        {/* LOCATION SEARCH BAR & GPS BTN */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span className="small-label">LEAFLET + OPENSTREETMAP GIS</span>
            <h3 style={{ margin: "4px 0" }}>
              🗺️ Interactive Waste Map &amp; Garbage Hotspot Detection
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#5f7066" }}>
              Locate nearby smart dustbins, recycling centers, composting yards, e-waste drop-offs, and monitor repeated garbage accumulation hotspots.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <form onSubmit={handleLocationSearch} style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                placeholder="Search city / area (e.g. Paris, New York)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cfe0d2",
                  fontSize: "12px",
                  minWidth: "220px",
                }}
              />
              <button
                type="submit"
                disabled={searching}
                className="secondary-btn"
                style={{ padding: "8px 14px", fontSize: "12px" }}
              >
                {searching ? "Searching..." : "🔍 Search"}
              </button>
            </form>

            <button
              type="button"
              onClick={handleLocateMe}
              className="primary-btn"
              style={{ padding: "8px 14px", fontSize: "12px" }}
            >
              📍 Use My GPS
            </button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
          {filterButtons.map((btn) => {
            const active = activeFilter === btn.value;
            return (
              <button
                key={btn.value}
                type="button"
                onClick={() => setActiveFilter(btn.value)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "20px",
                  border: active ? "1px solid #2e7d32" : "1px solid #d5e2d7",
                  background: active ? "#2e7d32" : "#f5f9f6",
                  color: active ? "#ffffff" : "#2b4332",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* LEAFLET MAP CANVAS */}
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: "430px",
            borderRadius: "14px",
            marginTop: "18px",
            border: "2px solid #dfece1",
            zIndex: 1,
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginTop: "10px", fontSize: "12px", color: "#5f7066" }}>
          <span>💡 <b>Tip:</b> Click any marker on the map for facility hours &amp; directions, or click anywhere on the map to select coordinates for reporting a garbage hotspot.</span>
          <span>🔴 High Hotspot &nbsp;|&nbsp; 🟠 Medium Hotspot &nbsp;|&nbsp; 🗑️ Dustbin &nbsp;|&nbsp; ♻️ Recycling &nbsp;|&nbsp; 🌱 Compost &nbsp;|&nbsp; 🔋 E-Waste</span>
        </div>
      </div>

      {/* GARBAGE HOTSPOT DETECTION & REPORTING GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        
        {/* LEFT: ACTIVE GARBAGE HOTSPOTS LIST */}
        <div className="impact-panel">
          <h3>🔥 Detected Garbage Hotspots (Repeated Accumulation)</h3>
          <p style={{ fontSize: "13px", color: "#5f7066", marginBottom: "16px" }}>
            Areas identified via citizen report clustering where garbage frequently accumulates.
          </p>

          <div style={{ display: "grid", gap: "12px" }}>
            {hotspots.map((h) => {
              const badgeBg =
                h.severity === "High"
                  ? "#ffebee"
                  : h.severity === "Medium"
                  ? "#fff3e0"
                  : "#fffde7";
              const badgeColor =
                h.severity === "High"
                  ? "#c62828"
                  : h.severity === "Medium"
                  ? "#ef6c00"
                  : "#f9a825";

              return (
                <div
                  key={h.id}
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setView([h.lat, h.lng], 15);
                    }
                  }}
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px solid #e6ece7",
                    background: "#fafcfa",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "14px", color: "#173f2c" }}>
                      ⚠️ {h.area_name}
                    </strong>
                    <span
                      style={{
                        background: badgeBg,
                        color: badgeColor,
                        padding: "3px 9px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "700",
                      }}
                    >
                      {h.severity} ({h.reports_count} Reports)
                    </span>
                  </div>

                  <p style={{ margin: "6px 0 4px", fontSize: "12px", color: "#4a5d50" }}>
                    🗑️ <b>Dominant Waste:</b> {h.waste_type} &nbsp;&bull;&nbsp; 🕒 {h.last_reported}
                  </p>
                  <p style={{ margin: "2px 0", fontSize: "12px", color: "#666" }}>
                    {h.description}
                  </p>
                  <div style={{ marginTop: "6px", fontSize: "11px", fontWeight: "600", color: badgeColor }}>
                    🚨 Status: {h.status}
                  </div>

                  {/* MUNICIPAL ACTION BUTTONS */}
                  <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await takeMunicipalAction(h.id, "dispatch_truck");
                        loadMapData(userCoords.lat, userCoords.lng, cityName);
                      }}
                      style={{
                        padding: "4px 8px",
                        fontSize: "10px",
                        borderRadius: "6px",
                        border: "1px solid #bbdefb",
                        background: "#e3f2fd",
                        color: "#1565c0",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      🚚 Dispatch Truck
                    </button>

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await takeMunicipalAction(h.id, "install_bin");
                        loadMapData(userCoords.lat, userCoords.lng, cityName);
                      }}
                      style={{
                        padding: "4px 8px",
                        fontSize: "10px",
                        borderRadius: "6px",
                        border: "1px solid #c8e6c9",
                        background: "#e8f5e9",
                        color: "#2e7d32",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      🗑️ Request Smart Bin
                    </button>

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await takeMunicipalAction(h.id, "mark_cleaned");
                        loadMapData(userCoords.lat, userCoords.lng, cityName);
                      }}
                      style={{
                        padding: "4px 8px",
                        fontSize: "10px",
                        borderRadius: "6px",
                        border: "1px solid #d1c4e9",
                        background: "#f3e5f5",
                        color: "#6a1b9a",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      ✅ Mark Cleaned
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

export default WasteMap;
