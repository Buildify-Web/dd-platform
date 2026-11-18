import Image from "next/image";

const COLS = 5;
const CENTER = Math.floor((COLS * COLS) / 2);

/**
 * The isometric field of rounded tiles in the top-right of the auth panel, with the yellow
 * logo tile raised and glowing in the middle. Pure CSS 3D (no perspective = isometric look):
 * the grid is laid flat with rotateX + rotateZ, and each tile's side is a second layer pushed
 * down with translateZ, which shows as thickness. A radial mask fades the field out.
 * Decorative only.
 */
export function TileField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-[-178px] top-[-84px] size-[600px] [mask-image:radial-gradient(closest-side,#000_40%,rgba(0,0,0,0.55)_70%,transparent_100%)]"
    >
      <div
        className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
        style={{ transform: "translate(-50%, -50%) rotateX(57deg) rotateZ(45deg)" }}
      >
        <div className="grid grid-cols-[repeat(5,98px)] gap-[26px] [transform-style:preserve-3d]">
          {Array.from({ length: COLS * COLS }, (_, i) => (i === CENTER ? <LogoTile key={i} /> : <Tile key={i} />))}
        </div>
      </div>
    </div>
  );
}

function Tile() {
  return (
    <div className="relative size-[98px] [transform-style:preserve-3d]">
      <span className="absolute inset-0 rounded-[24px] bg-[#e0e5d9]" style={{ transform: "translateZ(-13px)" }} />
      <span className="absolute inset-0 rounded-[24px] border border-white bg-[linear-gradient(135deg,#ffffff_0%,#f5f7f2_55%,#eaeee5_100%)]" />
    </div>
  );
}

function LogoTile() {
  return (
    <div className="relative size-[98px] [transform-style:preserve-3d]">
      {/* glow on the "floor" under the raised tile */}
      <span
        className="absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgba(246,201,14,0.55),rgba(246,201,14,0)_100%)]"
        style={{ transform: "translateZ(-14px)" }}
      />
      <div className="anim-bob absolute inset-0 [transform-style:preserve-3d]">
        <span className="absolute inset-0 rounded-[24px] bg-[#c99a05]" style={{ transform: "translateZ(-14px)" }} />
        <span className="absolute inset-0 rounded-[24px] bg-[#e0b209]" style={{ transform: "translateZ(-7px)" }} />
        <span className="absolute inset-0 grid place-items-center rounded-[24px] border border-[#ffe680] bg-[linear-gradient(135deg,#ffe066_0%,#f6c90e_55%,#eab90a_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <Image src="/logo-mark.png" alt="" width={336} height={331} className="w-[64px] -rotate-45" />
        </span>
      </div>
    </div>
  );
}
