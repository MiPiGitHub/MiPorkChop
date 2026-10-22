/**
 * MyPorkChop 0.2 — Cloudflare Worker status API.
 *
 * Required KV binding: STATUS_KV -> miporkchop-status
 * Required Worker secret: DEVICE_API_TOKEN (create in Cloudflare settings).
 *
 * Routes:
 *   GET  /health         -> non-sensitive readiness response
 *   GET  /api/status     -> current state (requires viewer token)
 *   POST /api/status     -> device state update (requires device token)
 *
 * Security: all status access is authenticated; never put tokens in Git.
 * No tokens are configured by this file. Do not deploy status functionality
 * until secrets and the KV binding are configured.
 *
 * KV is eventually consistent. Treat this as a prototype, not an immediate
 * global source of truth. The UI should report UNKNOWN on stale heartbeats.
 */

const KEY = "garage-status";
const HEARTBEAT_STALE_MS = 3 * 60 * 1000;
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function authorized(request, secret) {
  if (!secret || typeof secret !== "string") return false;
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  // Avoid early-exit string equality on authentication secrets.
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(secret);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ service: "MyPorkChop", ok: true });
    }

    if (url.pathname !== "/api/status") {
      return json({ error: "Not found" }, 404);
    }

    if (!env.STATUS_KV) {
      return json({ error: "Storage not configured" }, 503);
    }

    if (request.method === "GET") {
      if (!authorized(request, env.VIEWER_API_TOKEN)) {
        return json({ error: "Unauthorized" }, 401);
      }
      const record = await env.STATUS_KV.get(KEY, "json");
      if (!record) return json({ state: "UNKNOWN", reason: "No device report yet" });

      const lastSeen = Date.parse(record.lastSeen ?? "");
      if (!Number.isFinite(lastSeen) || Date.now() - lastSeen > HEARTBEAT_STALE_MS) {
        return json({ state: "UNKNOWN", reason: "Device heartbeat stale", lastSeen: record.lastSeen ?? null });
      }
      return json({ state: record.switchState, lastChanged: record.lastChanged, lastSeen: record.lastSeen });
    }

    if (request.method === "POST") {
      if (!authorized(request, env.DEVICE_API_TOKEN)) {
        return json({ error: "Unauthorized" }, 401);
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      if (!body || typeof body !== "object" || !["OPEN", "CLOSED"].includes(body.state)) {
        return json({ error: "state must be OPEN or CLOSED" }, 400);
      }

      const now = new Date().toISOString();
      const previous = await env.STATUS_KV.get(KEY, "json");
      const lastChanged = previous?.switchState === body.state && previous.lastChanged
        ? previous.lastChanged : now;
      await env.STATUS_KV.put(KEY, JSON.stringify({
        switchState: body.state,
        lastChanged,
        lastSeen: now,
        source: "physical-switch",
      }));
      return json({ ok: true, state: body.state, lastChanged, lastSeen: now });
    }

    return json({ error: "Method not allowed" }, 405);
  },
};
