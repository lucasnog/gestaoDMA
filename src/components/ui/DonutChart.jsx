import React from 'react';

const RING_COLORS = {
  'Em Andamento':  { fill: '#3b82f6', stroke: '#2563eb', bg: '#eff6ff' },
  'Paralisado':    { fill: '#f59e0b', stroke: '#d97706', bg: '#fffbeb' },
  'Concluído':     { fill: '#6366f1', stroke: '#4f46e5', bg: '#eef2ff' },
  'Rescindido':    { fill: '#ef4444', stroke: '#dc2626', bg: '#fef2f2' },
  'Contratado':    { fill: '#06b6d4', stroke: '#0891b2', bg: '#ecfeff' },
  'Indefinido':    { fill: '#94a3b8', stroke: '#64748b', bg: '#f8fafc' },
  'TRP':           { fill: '#8b5cf6', stroke: '#7c3aed', bg: '#f5f3ff' },
  'TRD':           { fill: '#ec4899', stroke: '#db2777', bg: '#fdf2f8' },
};

/* ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― */

/**
 * PieChart – SVG pie (or donut) chart with polished, professional look.
 *
 * Props:
 *   size     – viewBox size (default 180)
 *   segments – [{ label, value, color? }]
 *   total    – denominator (auto‑computed from segments if omitted)
 *   center   – { label, value } shown in the middle (donut only)
 *   donut    – show as donut (default true)
 *   hole     – inner/outer ratio (0‑1, default 0.6)
 */
const PieChart = ({ size = 180, segments = [], total, center, donut = true, hole = 0.55 }) => {
  const CX = size / 2;
  const CY = size / 2;
  const R = size / 2 - 2;        // outer radius
  const IR = donut ? R * hole : 0; // inner radius

  const active = segments.filter(s => s.value > 0);
  if (active.length === 0) return null;

  const sum = active.reduce((s, x) => s + x.value, 0);

  // ── polar → cartesian ─────────────────────────────────────
  const pt = (rad, radius) => ({
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  });

  // ── SVG arc descriptor ────────────────────────────────────
  //   arc from rad1→rad2  (clockwise if sweep=1, ccw if sweep=0)
  const arc = (rad1, rad2, r, sweep) => {
    // angular travel along the sweep direction
    let travel = rad2 - rad1;
    if (sweep === 1) {
      // clockwise: angle increases
      travel = ((travel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    } else {
      // counter‑clockwise: angle decreases
      travel = ((-travel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }
    const large = travel > Math.PI ? 1 : 0;
    return `A ${r} ${r} 0 ${large} ${sweep}`;
  };

  // ── build slice path (pie or donut) ────────────────────────
  const slicePath = (pStart, pEnd) => {
    const a1 = pStart * Math.PI * 2;
    const a2 = pEnd * Math.PI * 2;
    const o  = pt(a1, R);
    const o2 = pt(a2, R);

    if (!donut) {
      // ── full pie wedge ──
      return [
        `M ${CX} ${CY}`,
        `L ${o.x} ${o.y}`,
        arc(a1, a2, R, 1),
        `${o2.x} ${o2.y}`,
        'Z',
      ].join(' ');
    }

    // ── donut ring slice ──
    const i  = pt(a2, IR);   // inner point at end
    const i2 = pt(a1, IR);   // inner point at start

    return [
      `M ${o.x} ${o.y}`,
      arc(a1, a2, R, 1),      // outer arc CW
      `${o2.x} ${o2.y}`,
      `L ${i.x} ${i.y}`,
      arc(a2, a1, IR, 0),     // inner arc CCW
      `${i2.x} ${i2.y}`,
      'Z',
    ].join(' ');
  };

  // ── distribute slices with gaps ────────────────────────────
  const GAP = 0.006; // 0.6 % gap
  const usable = 1 - GAP * active.length;
  let cursor = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {active.map((s, i) => {
          const pct = (s.value / sum) * usable;
          const c0 = cursor;
          const c1 = cursor + pct;
          cursor = c1 + GAP;

          const color = s.color || RING_COLORS[s.label]?.fill || '#94a3b8';

          return (
            <path
              key={i}
              d={slicePath(c0, c1)}
              fill={color}
            />
          );
        })}

        {donut && (
          <circle cx={CX} cy={CY} r={IR} fill="white" />
        )}
      </svg>

      {donut && center && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            {center.value}
          </span>
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
            {center.label}
          </span>
        </div>
      )}
    </div>
  );
};

export { RING_COLORS };
export default PieChart;
