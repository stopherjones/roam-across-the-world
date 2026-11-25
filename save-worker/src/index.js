const ALLOWED_ORIGIN = "https://stopherjones.github.io";
const MAX_BYTES = 512 * 1024;
const TTL = 60 * 60 * 24 * 60; // 60 days

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const reply = (body, status = 200, extra = {}) =>
  new Response(body, { status, headers: { ...cors, ...extra } });

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

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

    return reply("Method not allowed", 405, { Allow: "GET, PUT, OPTIONS" });
  }
};
