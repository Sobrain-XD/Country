import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

  try {
    // Check if this IP was already counted in the last 24 hours
    const alreadyCounted = await kv.get(`ip:${ip}`);

    if (!alreadyCounted) {
      const geo = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
      const { countryCode } = await geo.json();

      if (countryCode) {
        await kv.hincrby("flags", countryCode, 1);
        // Store IP for 24 hours (86400 seconds)
        await kv.set(`ip:${ip}`, "1", { ex: 15552000 });
      }
    }
  } catch (e) {}

  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"));
}
