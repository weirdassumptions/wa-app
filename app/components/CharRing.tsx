"use client";

export function CharRing({ count, max }: { count: number; max: number }) {
  const r = 11;
  const circ = 2 * Math.PI * r;
  const left = max - count;
  const color = left < 20 ? "#b83232" : left < 60 ? "#c4823a" : "#b0a898";

  return (
    <div className="cring">
      <svg width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r={r} fill="none" stroke="#d8d0c2" strokeWidth="2.5" />
        <circle
          cx="15" cy="15" r={r}
          fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - count / max)}
          strokeLinecap="round"
          transform="rotate(-90 15 15)"
          style={{ transition: "stroke-dashoffset 0.2s, stroke 0.2s" }}
        />
      </svg>
      {left <= 20 && (
        <span className="cring-n" style={{ color }}>{left}</span>
      )}
    </div>
  );
}