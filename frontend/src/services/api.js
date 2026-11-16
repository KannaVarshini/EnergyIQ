
const API_BASE_URL = "http://127.0.0.1:8000";

// Get saved authentication token
export function getToken() {
  return localStorage.getItem("energyiq_token");
}

// Save authentication token
export function saveToken(token) {
  localStorage.setItem("energyiq_token", token);
}

// Remove authentication token
export function logout() {
  localStorage.removeItem("energyiq_token");
  localStorage.removeItem("energyiq_user");
}

// Common API request function
async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `API Error: ${response.status}`);
  }

  return data;
}

// Login
export async function login(email, password) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  saveToken(data.access_token);
  localStorage.setItem("energyiq_user", JSON.stringify(data.user));

  return data;
}

// Get logged-in user
export function getCurrentUser() {
  return apiRequest("/api/auth/me");
}

// Get available regions
export function getRegions() {
  return apiRequest("/api/regions");
}

// Get meters for a region
export function getMeters(region) {
  return apiRequest(`/api/meters/${encodeURIComponent(region)}`);
}

// Get protected dashboard
export function getDashboard(region, meter) {
  return apiRequest(
    `/api/dashboard/${encodeURIComponent(region)}/${encodeURIComponent(meter)}`
  );
}

// Create tenant (owner only)
export function createTenant(name, email, password) {
  return apiRequest("/api/auth/tenants", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

// Get owner's tenants
export function getTenants() {
  return apiRequest("/api/auth/tenants");
}

// Assign meter to tenant
export function assignMeter(tenant_id, region, meter_id) {
  return apiRequest("/api/auth/assign-meter", {
    method: "POST",
    body: JSON.stringify({ tenant_id, region, meter_id }),
  });
}
