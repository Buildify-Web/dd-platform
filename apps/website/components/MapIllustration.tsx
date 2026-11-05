/** Stylised street map around the institute (static SVG — no third-party map embeds or trackers). */
export function MapIllustration() {
  const road = "#fffdf4";
  const minor = "#f8f7e6";
  const label = { fill: "#7a8270", fontSize: 11, fontFamily: "inherit" } as const;
  return (
    <svg
      viewBox="0 0 720 330"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="720" height="330" fill="#ecf0cf" />
      {/* parks */}
      <path d="M470 20h110l40 40-30 60h-90z" fill="#dfe8bd" />
      <rect x="40" y="250" width="90" height="60" rx="6" fill="#e1e9c2" />
      {/* minor grid */}
      <g stroke={minor} strokeWidth="5" fill="none">
        {[60, 105, 150, 230, 275, 360, 400, 440].map((x) => (
          <path key={`v${x}`} d={`M${x} 0V330`} />
        ))}
        {[40, 80, 130, 175, 260, 300].map((y) => (
          <path key={`h${y}`} d={`M0 ${y}H720`} />
        ))}
        <path d="M520 0 720 150M600 330l120-90M440 330 720 110" />
      </g>
      {/* major roads */}
      <g stroke={road} strokeWidth="12" strokeLinecap="round" fill="none">
        <path d="M190 -10V340" />
        <path d="M-10 215H720" />
        <path d="M330 -10 720 300" />
        <path d="M-10 60C120 70 220 40 330 70" />
      </g>
      <g stroke="#f3e9b8" strokeWidth="2">
        <path d="M190 -10V340" />
      </g>
      {/* labels */}
      <text x="120" y="52" {...label}>86th Street</text>
      <text x="580" y="16" {...label}>13th St</text>
      <text x="487" y="62" {...label}>SDAT Cricket</text>
      <text x="500" y="76" {...label}>Ground</text>
      <text x="630" y="90" {...label}>20th St</text>
      <text x="640" y="126" {...label}>22nd St</text>
      <text x="345" y="208" {...label}>86th St</text>
      <text x="520" y="150" {...label} fill="#9aa18f" fontSize="14" letterSpacing="3">ASHOK</text>
      <text x="520" y="170" {...label} fill="#9aa18f" fontSize="14" letterSpacing="3">NAGAR</text>
      <text x="610" y="270" {...label}>Murthy St Ext</text>
      <text x="420" y="300" {...label}>7th Avenue</text>
      <text transform="translate(206 140) rotate(90)" {...label}>Jawaharlal Nehru Road</text>
      <text transform="translate(165 40) rotate(90)" {...label}>19th Avenue</text>
      <text transform="translate(48 150) rotate(-80)" {...label}>Kamarajar Salai</text>
      <text transform="translate(92 120) rotate(90)" {...label}>88th Street</text>
      <text x="60" y="110" {...label}>Nirmala</text>
      <text x="56" y="124" {...label}>Girls HSS</text>
    </svg>
  );
}
