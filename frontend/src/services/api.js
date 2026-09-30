const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

// Helper to get authorization header
const getUserHeader = () => {
  const userData = localStorage.getItem("ecosort_user");
  if (!userData) return {};
  try {
    const user = JSON.parse(userData);
    return { "X-User-ID": String(user.id) };
  } catch (e) {
    return {};
  }
};

// 1. SCAN WASTE
export const scanWaste = async (imageFile) => {
  const userData = localStorage.getItem("ecosort_user");
  if (!userData) {
    throw new Error("Please login before scanning.");
  }

  const user = JSON.parse(userData);
  const formData = new FormData();
  formData.append("file", imageFile);

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: {
      "X-User-ID": String(user.id),
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to analyze image.");
  }

  return data;
};

// 2. SCAN HISTORY
export const getScanHistory = async () => {
  const userData = localStorage.getItem("ecosort_user");
  if (!userData) {
    throw new Error("Please login before viewing history.");
  }

  const user = JSON.parse(userData);

  const response = await fetch(`${API_BASE_URL}/history`, {
    headers: {
      "X-User-ID": String(user.id),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to load scan history.");
  }

  return data;
};

// 3. SCAN BY ID
export const getScanById = async (scanId) => {
  const response = await fetch(`${API_BASE_URL}/history/${scanId}`, {
    headers: getUserHeader(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to load scan.");
  }

  return response.json();
};

// 4. ENVIRONMENTAL IMPACT
export const getEnvironmentalImpact = async () => {
  const response = await fetch(`${API_BASE_URL}/impact`, {
    headers: getUserHeader(),
  });

  if (!response.ok) {
    throw new Error("Failed to load environmental impact.");
  }

  return response.json();
};

// 5. AI CHATBOT
export const sendChatMessage = async (message) => {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getUserHeader(),
    },
    body: JSON.stringify({ message }),
  });

  const data = await response.json();
  if (!response.ok || data.status !== "success") {
    throw new Error(data.message || "Failed to send chat message.");
  }

  return data;
};

// 6. INTERACTIVE WASTE MAP (Dustbins, Recycling, Compost, E-Waste)
export const getGisCenters = async (lat = 28.6139, lng = 77.2090, query = "") => {
  const params = new URLSearchParams({ lat, lng, q: query });
  const response = await fetch(`${API_BASE_URL}/gis/centers?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load nearby disposal facilities.");
  }

  return response.json();
};

// 7. GARBAGE HOTSPOT DETECTION
export const getGarbageHotspots = async (lat = 28.6139, lng = 77.2090) => {
  const params = new URLSearchParams({ lat, lng });
  const response = await fetch(`${API_BASE_URL}/gis/hotspots?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load garbage hotspots.");
  }

  return response.json();
};

export const reportGarbageHotspot = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/gis/hotspots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getUserHeader(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || data.status !== "success") {
    throw new Error(data.message || "Failed to submit hotspot report.");
  }

  return data;
};

export const takeMunicipalAction = async (hotspotId, actionType) => {
  const response = await fetch(`${API_BASE_URL}/gis/hotspots/${hotspotId}/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getUserHeader(),
    },
    body: JSON.stringify({ action_type: actionType }),
  });

  const data = await response.json();
  if (!response.ok || data.status !== "success") {
    throw new Error(data.message || "Failed to execute municipal action.");
  }

  return data;
};