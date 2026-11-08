// Hairline wordmark: S V Λ Y Λ M . Λ I, drawn as strokes so it stays crisp at any size.
const S = "M39 9.5C35 5.7 29 4 21.5 4C11.5 4 4.5 7 4.5 12.2C4.5 17.8 12 19 21.5 20C31 21 39.5 22.4 39.5 28C39.5 33.2 32 36 21.5 36C12.5 36 5.5 34 2 30";
const V = "M0 4L21 36L42 4";
const A = "M0 36L21 4L42 36";
const Y = "M0 4L21 20L42 4M21 20V36";
const M = "M1.5 36V4L21 27L40.5 4V36";
const I = "M1.6 4V36";

// [path, x offset] — letters sit on a 63-unit pitch; the ".ai" is set tighter.
const glyphs: [string, number][] = [
  [S, 0],
  [V, 63],
  [A, 126],
  [Y, 189],
  [A, 252],
  [M, 315],
  [A, 390],
  [I, 450],
];
const DOT = { x: 371, size: 4.4 };
const WIDTH = 455;

export function Logo() {
  return (
    <svg
      className="logo__mark"
      viewBox={`-2 0 ${WIDTH + 4} 40`}
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {glyphs.map(([d, x], i) => (
        <path key={i} d={d} transform={`translate(${x} 0)`} />
      ))}
      <rect x={DOT.x} y={36 - DOT.size + 1.6} width={DOT.size} height={DOT.size} fill="currentColor" stroke="none" />
    </svg>
  );
}
