const API_BASE = import.meta.env.VITE_API_URL || "https://travel-crm-backend-ml5u.onrender.com/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("tripwise-token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  login: (body) => request("/auth/login", { method: "POST", headers: {}, body: JSON.stringify(body) }),
  stats: () => request("/dashboard/stats"),
  leads: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
    return request(`/leads${query.size ? `?${query}` : ""}`);
  },
  createLead: (body) => request("/leads", { method: "POST", body: JSON.stringify(body) }),
  updateLead: (id, body) => request(`/leads/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  updateStatus: (id, status) => request(`/leads/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  addActivity: (id, body) => request(`/leads/${id}/activities`, { method: "POST", body: JSON.stringify(body) }),
  convert: (id) => request(`/leads/${id}/convert`, { method: "POST", body: JSON.stringify({}) }),
  bookings: () => request("/bookings"),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: "PATCH", body: JSON.stringify({}) }),
  users: () => request("/users")
};
