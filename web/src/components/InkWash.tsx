// Faint flowing-water current, full-bleed behind the app. Layered streams that
// drift across the canvas — purely atmospheric, very low contrast so it never
// competes with the cards. Echoes 沢 (a mountain stream).
const STREAMS = [
  { y: 120, amp: 26, stroke: "#E9E2D3", opacity: 0.05, w: 2.5 },
  { y: 190, amp: 18, stroke: "#C96442", opacity: 0.05, w: 2 },
  { y: 270, amp: 32, stroke: "#E9E2D3", opacity: 0.04, w: 2.5 },
  { y: 350, amp: 22, stroke: "#B8915A", opacity: 0.05, w: 2 },
  { y: 430, amp: 30, stroke: "#E9E2D3", opacity: 0.045, w: 2.5 },
  { y: 510, amp: 20, stroke: "#C96442", opacity: 0.05, w: 2 },
  { y: 590, amp: 34, stroke: "#E9E2D3", opacity: 0.04, w: 2.5 },
  { y: 670, amp: 24, stroke: "#B8915A", opacity: 0.045, w: 2 },
  { y: 740, amp: 28, stroke: "#E9E2D3", opacity: 0.04, w: 2.5 },
];

// Smooth wave across the full width at height `y` with peak `amp`.
function wavePath(y: number, amp: number, phase: number): string {
  const seg = 100;
  let d = `M -20 ${y}`;
  for (let i = 0; i < 5; i++) {
    const cx = -20 + seg * i + seg / 2;
    const ex = -20 + seg * (i + 1);
    const dir = (i + phase) % 2 === 0 ? -1 : 1;
    d += ` Q ${cx} ${y + dir * amp} ${ex} ${y}`;
  }
  return d;
}

export function InkWash() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
    >
      {STREAMS.map((s, i) => (
        <path
          key={i}
          d={wavePath(s.y, s.amp, i)}
          stroke={s.stroke}
          strokeWidth={s.w}
          fill="none"
          opacity={s.opacity}
          strokeLinecap="round"
        />
      ))}
      {/* A gentle eddy to break the horizontals */}
      <circle cx="300" cy="330" r="46" fill="none" stroke="#E9E2D3" strokeWidth="2" opacity="0.03" />
      <circle cx="300" cy="330" r="28" fill="none" stroke="#C96442" strokeWidth="2" opacity="0.035" />
      <circle cx="100" cy="560" r="40" fill="none" stroke="#E9E2D3" strokeWidth="2" opacity="0.03" />
    </svg>
  );
}
