import { kv } from "@vercel/kv";

function getFlagEmoji(code) {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

export default async function handler(req, res) {
  const flags = await kv.hgetall("flags") || {};

  const sorted = Object.entries(flags)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 8);

  const totalVisits = sorted.reduce((sum, [, v]) => sum + Number(v), 0);
  const maxCount = sorted.length > 0 ? Number(sorted[0][1]) : 1;

  const cardW = 340;
  const rowH = 52;
  const paddingX = 16;
  const headerH = 44;
  const footerH = 10;
  const cardH = headerH + sorted.length * rowH + footerH;
  const barTrackW = cardW - paddingX * 2;

  const rows = sorted.map(([code, count], i) => {
    const y = headerH + i * rowH;
    const flag = getFlagEmoji(code);
    const pct = Math.max(0.04, Number(count) / maxCount);
    const barW = Math.round(pct * barTrackW);
    const countNum = Number(count);
    const isTop = i === 0;

    // Top country: golden bar + crown label
    const barGradient = isTop ? "url(#goldBar)" : "url(#purpleBar)";
    const labelColor = isTop ? "#ffd700" : "#c4b5fd";
    const crown = isTop ? "👑 " : "";

    return `
      <text x="${paddingX}" y="${y + 16}"
        font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="600" fill="${labelColor}">
        ${crown}${flag} ${code}
      </text>
      <text x="${cardW - paddingX}" y="${y + 16}" text-anchor="end"
        font-family="'Segoe UI', Arial, sans-serif" font-size="12" fill="#6d5fa0">
        → ${maxCount} visit${maxCount !== 1 ? "s" : ""}
      </text>

      <!-- Bar track -->
      <rect x="${paddingX}" y="${y + 22}" width="${barTrackW}" height="16" rx="8"
        fill="#1a1640"/>

      <!-- Bar fill -->
      <rect x="${paddingX}" y="${y + 22}" width="${barW}" height="16" rx="8"
        fill="${barGradient}" filter="${isTop ? "url(#goldGlow)" : "url(#purpleGlow)"}"/>

      <!-- Count label on bar -->
      <text x="${paddingX + Math.min(barW, barTrackW) / 2}" y="${y + 34}" text-anchor="middle"
        font-family="'Segoe UI', Arial, sans-serif" font-size="11" font-weight="700" fill="#ffffff">
        ${countNum} visit${countNum !== 1 ? "s" : ""}
      </text>
    `;
  });

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}">
  <defs>
    <!-- AniList exact purple gradient -->
    <linearGradient id="purpleBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7e56d9"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>

    <!-- Gold gradient for top country -->
    <linearGradient id="goldBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b8860b"/>
      <stop offset="100%" stop-color="#ffd700"/>
    </linearGradient>

    <!-- Card background -->
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#12102a"/>
      <stop offset="100%" stop-color="#191530"/>
    </linearGradient>

    <!-- Purple bar glow -->
    <filter id="purpleGlow" x="-5%" y="-50%" width="110%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0.5 0 1 0 0  0 0 0.3 0 0  1 0 1 0 0  0 0 0 0.6 0" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Gold bar glow -->
    <filter id="goldGlow" x="-5%" y="-50%" width="110%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="1 0.8 0 0 0  0.8 0.6 0 0 0  0 0 0 0 0  0 0 0 0.7 0" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Card background -->
  <rect width="${cardW}" height="${cardH}" rx="10" fill="url(#cardBg)"/>

  <!-- Thin top accent line (AniList style) -->
  <rect x="0" y="0" width="${cardW}" height="3" rx="2" fill="url(#purpleBar)"/>

  <!-- Header title -->
  <text x="${paddingX}" y="28"
    font-family="'Segoe UI', Arial, sans-serif" font-size="15" font-weight="700" fill="#ffffff">
    🌍 Visitor Countries
  </text>
  <text x="${cardW - paddingX}" y="28" text-anchor="end"
    font-family="'Segoe UI', Arial, sans-serif" font-size="12" fill="#6d5fa0">
    ${totalVisits} total visits
  </text>

  <!-- Divider -->
  <line x1="${paddingX}" y1="36" x2="${cardW - paddingX}" y2="36"
    stroke="#2a2250" stroke-width="1"/>

  <!-- Rows -->
  ${rows.join("")}
</svg>`.trim();

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
  res.send(svg);
}
