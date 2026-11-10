/**
 * Stylised map of the Chromepet area (static SVG, no third-party map embeds or trackers).
 * It is illustrative, not to scale. "Open in Google Maps" on the contact page gives the
 * exact location.
 *
 * Layout rules, so labels never collide or get cut off:
 *  - The contact page centres the pin + name bubble over (360, 165), so keep x 290–430,
 *    y 110–170 free of labels.
 *  - Desktop crops the top and bottom (visible y ≈ 46–283); phones crop the sides
 *    (visible x ≈ 155–565). Labels that must always show sit inside both ranges.
 *  - The "Open in Google Maps" button covers the bottom-right corner (x > 520, y > 255).
 *  - No label crosses a road or another label; GST Road's label follows the road itself.
 */
export function MapIllustration() {
  const road = "#fffdf4";
  const minor = "#f6f5e2";
  const rail = "#b8b49b";
  const label = { fill: "#7a8270", fontSize: 11, fontFamily: "inherit" } as const;
  // GST Road runs diagonally through Chromepet, with the suburban railway alongside it.
  const gst = "M170 -10 L440 340";
  const railway = "M110 -10 L380 340";

  return (
    <svg viewBox="0 0 720 330" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="map-gst-road" d={gst} />
      </defs>
      <rect width="720" height="330" fill="#ecf0cf" />

      {/* green spaces + a pond (unlabelled) */}
      <path d="M30 196c30-18 80-20 110-4l10 52c-30 18-90 20-118 2z" fill="#dfe8bd" />
      <path d="M470 236c28-14 70-10 92 8l-6 34c-30 12-70 8-90-6z" fill="#dfe8bd" />
      <ellipse cx="640" cy="150" rx="46" ry="26" fill="#d9e6d8" />

      {/* minor streets */}
      <g stroke={minor} strokeWidth="5" fill="none" strokeLinecap="round">
        <path d="M-10 110H730" />
        <path d="M-10 262H730" />
        <path d="M150 -10V340" />
        <path d="M30 -10V340" />
        <path d="M590 -10V340" />
        <path d="M680 -10V340" />
        <path d="M430 40 720 40" />
      </g>

      {/* major roads */}
      <g stroke={road} strokeWidth="12" strokeLinecap="round" fill="none">
        <path d="M-10 215C200 205 450 230 730 200" />
      </g>
      <path d={gst} stroke={road} strokeWidth="16" strokeLinecap="round" fill="none" />
      <path d={gst} stroke="#f3e9b8" strokeWidth="2" fill="none" />

      {/* suburban railway with sleepers + station */}
      <path d={railway} stroke={rail} strokeWidth="2" fill="none" />
      <path d={railway} stroke={rail} strokeWidth="8" strokeDasharray="1.5 7" fill="none" />
      <rect x="292" y="236" width="30" height="16" rx="4" fill={road} stroke={rail} strokeWidth="1.5" />

      {/* labels */}
      <text {...label} fill="#8f957f" fontSize="10" letterSpacing="1.5" dy="3.5">
        <textPath href="#map-gst-road" startOffset="20%">
          GST ROAD
        </textPath>
      </text>
      <text x="282" y="249" textAnchor="end" {...label}>
        Chromepet Station
      </text>
      <text x="480" y="186" textAnchor="middle" {...label} fill="#9aa18f" fontSize="15" letterSpacing="4">
        CHROMEPET
      </text>
      <text x="515" y="82" textAnchor="middle" {...label}>
        Hasthinapuram
      </text>
      <text x="62" y="150" {...label}>
        Radha Nagar
      </text>
    </svg>
  );
}
