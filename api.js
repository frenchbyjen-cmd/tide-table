export async function api(path, options = {}) {
  const res = await fetch(`/.netlify/functions/${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Backend error (HTTP ${res.status})`;
    throw new Error(message);
  }

  return payload;
}
