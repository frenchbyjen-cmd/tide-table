import { diagnostic, readAll } from "./_store.mjs";

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(body, null, 2)
});

export async function handler() {
  const env = diagnostic();

  if (!env.siteIDPresent || !env.tokenPresent) {
    return respond(503, {
      ok: false,
      message: "Backend configuration incomplete",
      environment: env,
      nextStep: !env.tokenPresent
        ? "Add NETLIFY_BLOBS_TOKEN in Netlify Environment Variables with Functions access, then redeploy."
        : "Redeploy the project so Netlify injects SITE_ID into the Function runtime."
    });
  }

  try {
    const orders = await readAll("tide-table-orders");
    return respond(200, {
      ok: true,
      message: "Tide Table backend is connected to Netlify Blobs.",
      environment: env,
      ordersStored: orders.length
    });
  } catch (error) {
    return respond(500, {
      ok: false,
      message: "Netlify Blobs connection failed",
      environment: env,
      error: error?.message || String(error)
    });
  }
}
