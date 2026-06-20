// api.js
// Talks to the Django REST API. Handles JWT storage, attaches the access
// token to every request, transparently refreshes it on a 401, and turns
// DRF error payloads into a single readable string.

const AUTH_STORAGE_KEY = "ecom_auth";

// Each browser tab gets a unique ID so tabs can hold different user sessions.
// The ID lives in sessionStorage (per-tab, cleared on close).
const _TAB_AUTH_KEY = "ecom_auth_" + (
  sessionStorage.getItem("_tab_id") ||
  (sessionStorage.setItem("_tab_id", Math.random().toString(36).slice(2)),
   sessionStorage.getItem("_tab_id"))
);

// ---------------------------------------------------------------------
// Auth storage — per-tab sessionStorage with localStorage fallback
//   setAuthData  → writes to this tab's sessionStorage only
//   getAuthData  → reads tab sessionStorage; falls back to localStorage
//                  so a freshly opened tab inherits the shared session
//   clearAuthData → clears both so logout works everywhere
// ---------------------------------------------------------------------
function getAuthData() {
  try {
    const tabRaw = sessionStorage.getItem(_TAB_AUTH_KEY);
    if (tabRaw) return JSON.parse(tabRaw);
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      // Snapshot into this tab's sessionStorage so that if another tab
      // logs in as a different user (overwriting localStorage), this tab
      // still reads its own session on refresh.
      sessionStorage.setItem(_TAB_AUTH_KEY, raw);
      return JSON.parse(raw);
    }
    return null;
  } catch (err) {
    return null;
  }
}

function setAuthData(data) {
  const json = JSON.stringify(data);
  sessionStorage.setItem(_TAB_AUTH_KEY, json);
  localStorage.setItem(AUTH_STORAGE_KEY, json);
}

function clearAuthData() {
  sessionStorage.removeItem(_TAB_AUTH_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getAccessToken() {
  const data = getAuthData();
  return data ? data.access : null;
}

function getRefreshToken() {
  const data = getAuthData();
  return data ? data.refresh : null;
}

function getCurrentUser() {
  const data = getAuthData();
  return data ? data.user : null;
}

function isLoggedIn() {
  return !!getAccessToken();
}

function isAdmin() {
  const user = getCurrentUser();
  return !!user && user.role === "admin";
}

function logout() {
  clearAuthData();
  window.location.href = "login.html";
}

// ---------------------------------------------------------------------
// DRF error payload -> readable string
//   { detail: "..." }
//   { non_field_errors: ["..."] }
//   { field_name: ["msg", ...], other_field: ["msg"] }
// ---------------------------------------------------------------------
function getErrorMessage(payload, fallback) {
  fallback = fallback || "Something went wrong. Please try again.";
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (payload.detail) return payload.detail;
  if (Array.isArray(payload.non_field_errors) && payload.non_field_errors.length) {
    return payload.non_field_errors[0];
  }
  for (const key of Object.keys(payload)) {
    const value = payload[key];
    if (Array.isArray(value) && value.length) {
      return key.replace(/_/g, " ") + ": " + value[0];
    }
    if (typeof value === "string" && value) {
      return value;
    }
  }
  return fallback;
}

// ---------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------
async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const current = getAuthData() || {};
    setAuthData(Object.assign({}, current, { access: data.access }));
    return true;
  } catch (err) {
    return false;
  }
}

async function apiFetch(path, options, _retried) {
  options = options || {};
  const url = path.indexOf("http") === 0 ? path : `${API_BASE_URL}${path}`;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = Object.assign({}, options.headers || {});
  if (!isFormData && options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, Object.assign({}, options, { headers }));
  } catch (networkErr) {
    const err = new Error("Could not reach the server. Make sure the Django backend is running.");
    err.isNetworkError = true;
    throw err;
  }

  if (res.status === 401 && !_retried && getRefreshToken() && !path.includes("/auth/login")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch(path, options, true);
    }
    clearAuthData();
  }

  if (res.status === 204) {
    return null;
  }

  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (err) {
      payload = text;
    }
  }

  if (!res.ok) {
    const err = new Error(getErrorMessage(payload));
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

function buildQuery(params) {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

// Unwraps DRF's PageNumberPagination envelope ({count, next, previous, results})
// so callers can treat list endpoints as plain arrays either way.
function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

// Follows DRF's pagination "next" links to collect every result across all
// pages. Used by the admin dashboard, which needs true totals rather than
// just the first page.
async function fetchAllPages(path, params) {
  let results = [];
  let nextUrl = path + buildQuery(params);
  while (nextUrl) {
    const data = await apiFetch(nextUrl, { method: "GET" });
    if (Array.isArray(data)) {
      results = results.concat(data);
      break;
    }
    results = results.concat(data.results || []);
    nextUrl = data.next || null;
  }
  return results;
}

// ---------------------------------------------------------------------
// Cross-tab real-time updates via BroadcastChannel
// Admin pages call broadcastEvent() after mutating data; customer pages
// listen and reload automatically.
// ---------------------------------------------------------------------
const _bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("ecom_updates") : null;

function broadcastEvent(type) {
  if (_bc) _bc.postMessage({ type });
}

const api = {
  get(path, params) {
    return apiFetch(path + buildQuery(params), { method: "GET" });
  },
  getAll(path, params) {
    return fetchAllPages(path, params);
  },
  post(path, body) {
    return apiFetch(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
  },
  patch(path, body) {
    return apiFetch(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
  },
  put(path, body) {
    return apiFetch(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });
  },
  delete(path) {
    return apiFetch(path, { method: "DELETE" });
  },
  postForm(path, formData) {
    return apiFetch(path, { method: "POST", body: formData });
  },
  patchForm(path, formData) {
    return apiFetch(path, { method: "PATCH", body: formData });
  },
};
