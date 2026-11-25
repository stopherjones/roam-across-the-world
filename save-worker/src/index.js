const ALLOWED_ORIGINS = new Set([
  "https://stopherjones.github.io",
  "http://127.0.0.1:8768",
  "http://localhost:8768",
  "http://127.0.0.1:8000",
  "http://localhost:8000"
]);
const MAX_BYTES = 512 * 1024;
const TTL = 60 * 60 * 24 * 60; // 60 days

const corsHeaders = (origin) => ({
  ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);
    const reply = (body, status = 200, extra = {}) =>
      new Response(body, { status, headers: { ...cors, ...extra } });

    if (request.method === "OPTIONS") {
      return new Response(null, { status: ALLOWED_ORIGINS.has(origin) ? 204 : 403, headers: cors });
    }

    const m = new URL(request.url).pathname.match(/^\/save\/([A-Za-z0-9_-]{16,64})$/);
    if (!m) return reply("Not found", 404);
    const key = "save:" + m[1];

    if (request.method === "GET") {
      const v = await env.SAVES.get(key);
      return v
        ? reply(v, 200, { "Content-Type": "application/json", "Cache-Control": "no-store" })
        : reply("No save", 404);
    }

    if (request.method === "PUT") {
      if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES)
        return reply("Too large", 413);

      const body = await request.text();
      if (new TextEncoder().encode(body).length > MAX_BYTES) return reply("Too large", 413);

      let parsed;
      try { parsed = JSON.parse(body); } catch { return reply("Bad JSON", 400); }
      if (typeof parsed !== "object" || parsed === null) return reply("Bad JSON", 400);

      await env.SAVES.put(key, body, { expirationTtl: TTL });
      return reply("Saved");
    }

    if (request.method === "DELETE") {
      await env.SAVES.delete(key);
      return reply("Deleted");
    }

    return reply("Method not allowed", 405, { Allow: "GET, PUT, DELETE, OPTIONS" });
  }
};
