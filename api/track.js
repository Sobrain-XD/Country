import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

  try {
    const geo = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    const { countryCode } = await geo.json();
    if (countryCode) {
      await kv.hincrby("flags", countryCode, 1);
    }
  } catch (e) {}

  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"));
}
