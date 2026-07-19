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
    .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]));

  const top5 = sorted.slice(0, 5);
  const rest = sorted.slice(5);

  const totalVisits = sorted.reduce((sum, [, v]) => sum + Number(v), 0);
  const maxCount = top5.length > 0 ? Number(top5[0][1]) : 1;

  const cardW = 340;
  const rowH = 48;
  const paddingX = 16;
  const headerH = 44;
  const colCount = 4;
  const cellW = Math.floor((cardW - paddingX * 2) / colCount);
  const restRows = rest.length > 0 ? Math.ceil(rest.length / colCount) : 0;
  const restHeaderH = rest.length > 0 ? 60 : 0;
  const restRowH = 24;
  const restH = rest.length > 0 ? restHeaderH + restRows * restRowH : 0;
  const footerH = 16;
  const cardH = headerH + top5.length * rowH + restH + footerH;
  const barTrackW = cardW - paddingX * 2;

  const rows = top5.map(([code, count], i) => {
    const y = headerH + i * rowH;
    const flag = getFlagEmoji(code);
    const pct = Math.max(0.04, Number(count) / maxCount);
    const barW = Math.round(pct * barTrackW);
    const countNum = Number(count);
    const isTop = i === 0;
    const barGradient = isTop ? "url(#goldBar)" : "url(#purpleBar)";
    const labelColor = isTop ? "#ffd700" : "#c4b5fd";
    const crown = isTop ? "👑 " : "";
    const pctOfTotal = Math.round((countNum / totalVisits) * 100);
    const rightLabel = isTop
      ? `→ ${maxCount} visit${maxCount !== 1 ? "s" : ""} · ${pctOfTotal}%`
      : `#${i + 1} · ${pctOfTotal}%`;

    return `
      <text x="${paddingX}" y="${y + 16}"
        font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="600" fill="${labelColor}">
        ${crown}${flag} ${code}
      </text>
      <text x="${cardW - paddingX}" y="${y + 16}" text-anchor="end"
        font-family="'Segoe UI', Arial, sans-serif" font-size="12" fill="${isTop ? "#ffd700" : "#6d5fa0"}">
        ${rightLabel}
      </text>
      <rect x="${paddingX}" y="${y + 22}" width="${barTrackW}" height="16" rx="8" fill="#1a1640"/>
      <rect x="${paddingX}" y="${y + 22}" width="${barW}" height="16" rx="8"
        fill="${barGradient}" filter="${isTop ? "url(#goldGlow)" : "url(#purpleGlow)"}"/>
      ${isTop ? `<rect x="${paddingX}" y="${y + 22}" width="${barW}" height="16" rx="8"
        fill="none" stroke="#ffd700" stroke-width="2"/>` : ""}
      <text x="${paddingX + barTrackW / 2}" y="${y + 34}" text-anchor="middle"
        font-family="'Segoe UI', Arial, sans-serif" font-size="11" font-weight="700"
        fill="${barW > barTrackW / 2 ? "#ffffff" : "#8878c0"}">
        ${countNum} visit${countNum !== 1 ? "s" : ""}
      </text>
    `;
  });

  const othersTotal = rest.reduce((sum, [, v]) => sum + Number(v), 0);
  const othersPct = totalVisits > 0 ? Math.round((othersTotal / totalVisits) * 100) : 0;

  const restCells = rest.map(([code, count], i) => {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const x = paddingX + col * cellW;
    const y = headerH + top5.length * rowH + restHeaderH + row * restRowH;
    const flag = getFlagEmoji(code);
    const num = i + 6;
    const isLast = col === colCount - 1 || i === rest.length - 1;

    return `
      <text x="${x}" y="${y}"
        font-family="'Segoe UI Emoji', Apple Color Emoji, sans-serif" font-size="10" fill="#a0a0c0">
        ${num}.${flag}${count}
      </text>
      ${!isLast ? `<line x1="${x + cellW - 2}" y1="${y - 14}" x2="${x + cellW - 2}" y2="${y + 4}"
        stroke="#3a3260" stroke-width="1"/>` : ""}
    `;
  });

  const restSection = rest.length > 0 ? `
    <line x1="${paddingX}" y1="${headerH + top5.length * rowH + 16}"
      x2="${cardW - paddingX}" y2="${headerH + top5.length * rowH + 16}"
      stroke="#2a2250" stroke-width="1"/>
    <text x="${paddingX}" y="${headerH + top5.length * rowH + 38}"
      font-family="'Segoe UI', Arial, sans-serif" font-size="11" fill="#6d5fa0">
      Others
    </text>
    <text x="${cardW - paddingX}" y="${headerH + top5.length * rowH + 38}" text-anchor="end"
      font-family="'Segoe UI', Arial, sans-serif" font-size="11" fill="#6d5fa0">
      → ${othersPct}%
    </text>
    ${restCells.join("")}
  ` : "";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}">
  <defs>
    <linearGradient id="purpleBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7e56d9"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <linearGradient id="goldBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b8860b"/>
      <stop offset="100%" stop-color="#ffd700"/>
    </linearGradient>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#12102a"/>
      <stop offset="100%" stop-color="#191530"/>
    </linearGradient>
    <filter id="purpleGlow" x="-5%" y="-50%" width="110%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="goldGlow" x="-5%" y="-50%" width="110%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${cardW}" height="${cardH}" rx="10" fill="url(#cardBg)"/>
  <rect x="0" y="0" width="${cardW}" height="3" rx="2" fill="url(#purpleBar)"/>

  <text x="${paddingX}" y="28"
    font-family="'Segoe UI', Arial, sans-serif" font-size="15" font-weight="700" fill="#ffffff">
    🌍 Visitor Countries
  </text>
  <text x="${cardW - paddingX}" y="28" text-anchor="end"
    font-family="'Segoe UI', Arial, sans-serif" font-size="12" fill="#6d5fa0">
    ${totalVisits} total visits
  </text>

  <line x1="${paddingX}" y1="36" x2="${cardW - paddingX}" y2="36" stroke="#2a2250" stroke-width="1"/>

  ${rows.join("")}

  ${restSection}
</svg>`.trim();

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
  res.send(svg);
}
