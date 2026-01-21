// =============================
// 100% WORKING API HANDLER
// =============================

// VITE_API_BASE_URL must be like:
// https://arvindvm-1.tail09b31c.ts.net/api
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Normalize base URL (remove trailing slash)
const BASE = API_BASE.endsWith("/")
  ? API_BASE.slice(0, -1)
  : API_BASE;

// ---------------------------------------
// POST JSON FUNCTION
// ---------------------------------------
export async function postJSON(path: string, body: any) {
  // Ensure path begins with "/"
  if (!path.startsWith("/")) path = "/" + path;

  // Remove duplicate "/api" if user calls postJSON("/api/...")  
  const cleanPath = path.replace(/^\/api/, "");

  // Final URL always = BASE + /api + path  
  const fullUrl = `${BASE}${cleanPath}`;

  console.log("🌐 API Request:", fullUrl);

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.message || `HTTP error ${response.status}`);
  }

  return json;
}

// ---------------------------------------
// GET JSON FUNCTION
// ---------------------------------------
export async function getJSON(path: string) {
  if (!path.startsWith("/")) path = "/" + path;
  const cleanPath = path.replace(/^\/api/, "");

  const fullUrl = `${BASE}${cleanPath}`;
  console.log("🌐 API GET:", fullUrl);

  const response = await fetch(fullUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.message || `HTTP error ${response.status}`);
  }

  return json;
}

export { BASE as API_BASE };

