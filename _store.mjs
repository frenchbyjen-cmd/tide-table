import { getStore } from "@netlify/blobs";

function credentials() {
  const siteID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN;

  if (!siteID) {
    throw new Error(
      "Missing SITE_ID. Netlify normally injects SITE_ID automatically into Functions."
    );
  }

  if (!token) {
    throw new Error(
      "Missing NETLIFY_BLOBS_TOKEN. Add a Netlify Personal Access Token as an environment variable named NETLIFY_BLOBS_TOKEN with Functions scope, then redeploy."
    );
  }

  return { siteID, token };
}

export function store(name) {
  const { siteID, token } = credentials();
  return getStore(name, { siteID, token, consistency: "strong" });
}

export async function readAll(name) {
  const s = store(name);
  try {
    const data = await s.get("data", { type: "json" });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // A missing first blob should behave like an empty database.
    const message = String(error?.message || "");
    if (
      message.includes("404") ||
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("does not exist")
    ) {
      return [];
    }
    throw error;
  }
}

export async function writeAll(name, data) {
  const s = store(name);
  await s.setJSON("data", data);
}

export function diagnostic() {
  return {
    siteIDPresent: Boolean(process.env.SITE_ID || process.env.NETLIFY_SITE_ID),
    tokenPresent: Boolean(
      process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN
    ),
    siteName: process.env.SITE_NAME || null,
    url: process.env.URL || null
  };
}
