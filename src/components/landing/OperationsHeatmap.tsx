import { useEffect, useReducer, useRef, type MutableRefObject } from "react";

type HeatBlob = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  amp: number;
  phase: number;
  pulse: number;
};

type HeatTrailPoint = {
  x: number;
  y: number;
  life: number;
  born: number;
};

type HeatIncident = {
  id: number;
  x: number;
  y: number;
  born: number;
  life: number;
  strength: number;
};

const WARM_STOPS = [
  { t: 0, c: [245, 239, 230] },
  { t: 0.28, c: [248, 230, 195] },
  { t: 0.52, c: [246, 200, 142] },
  { t: 0.72, c: [240, 152, 108] },
  { t: 0.88, c: [220, 92, 70] },
  { t: 1, c: [185, 50, 45] },
] as const;

const HEAT_SEED: Omit<HeatBlob, "phase" | "pulse">[] = [
  { x: 0.15, y: 0.2, r: 0.28, vx: 0.022, vy: 0.018, amp: 0.75 },
  { x: 0.7, y: 0.18, r: 0.24, vx: -0.018, vy: 0.02, amp: 0.85 },
  { x: 0.92, y: 0.55, r: 0.3, vx: -0.025, vy: -0.012, amp: 0.65 },
  { x: 0.45, y: 0.5, r: 0.26, vx: 0.014, vy: -0.02, amp: 0.45 },
  { x: 0.2, y: 0.78, r: 0.26, vx: 0.02, vy: -0.022, amp: 0.55 },
  { x: 0.78, y: 0.88, r: 0.28, vx: -0.022, vy: 0.014, amp: 0.8 },
  { x: 0.05, y: 0.5, r: 0.22, vx: 0.024, vy: 0.016, amp: 0.5 },
];

function sampleStops(t: number): readonly number[] {
  if (t <= WARM_STOPS[0].t) return WARM_STOPS[0].c;
  if (t >= WARM_STOPS[WARM_STOPS.length - 1].t) return WARM_STOPS[WARM_STOPS.length - 1].c;

  for (let i = 0; i < WARM_STOPS.length - 1; i++) {
    const a = WARM_STOPS[i]!;
    const b = WARM_STOPS[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const u = (t - a.t) / (b.t - a.t);
      return [
        a.c[0] + (b.c[0] - a.c[0]) * u,
        a.c[1] + (b.c[1] - a.c[1]) * u,
        a.c[2] + (b.c[2] - a.c[2]) * u,
      ];
    }
  }

  return WARM_STOPS[WARM_STOPS.length - 1].c;
}

export function OperationsHeatmap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const blobsRef = useRef<HeatBlob[]>(
    HEAT_SEED.map((blob, index) => ({
      ...blob,
      phase: index * 0.7,
      pulse: 0.0008 + (index % 3) * 0.0002,
    })),
  );
  const trailRef = useRef<HeatTrailPoint[]>([]);
  const incidentsRef = useRef<HeatIncident[]>([]);
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;

      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h, dpr };
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (wrapRef.current) observer.observe(wrapRef.current);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const last = trailRef.current[trailRef.current.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 14) {
        trailRef.current.push({ x, y, life: 1, born: performance.now() });
        if (trailRef.current.length > 40) trailRef.current.shift();
      }
    };

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  useEffect(() => {
    let id = 0;
    let timer = 0;

    const spawn = () => {
      const { w, h } = sizeRef.current;
      incidentsRef.current.push({
        id: id++,
        x: Math.random() * w,
        y: Math.random() * h,
        born: performance.now(),
        life: 2200 + Math.random() * 1800,
        strength: 0.55 + Math.random() * 0.5,
      });
      timer = window.setTimeout(spawn, 700 + Math.random() * 1800);
    };

    timer = window.setTimeout(spawn, 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const { w, h, dpr } = sizeRef.current;
      if (w <= 0 || h <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#f5efe6";
      ctx.fillRect(0, 0, w, h);

      for (const blob of blobsRef.current) {
        blob.x += blob.vx * dt * 0.001;
        blob.y += blob.vy * dt * 0.001;
        if (blob.x < -0.2) blob.x = 1.2;
        if (blob.x > 1.2) blob.x = -0.2;
        if (blob.y < -0.2) blob.y = 1.2;
        if (blob.y > 1.2) blob.y = -0.2;
        blob.phase += blob.pulse * dt;
      }

      incidentsRef.current = incidentsRef.current.filter((incident) => now - incident.born < incident.life);

      for (let i = trailRef.current.length - 1; i >= 0; i--) {
        const trail = trailRef.current[i]!;
        trail.life = Math.max(0, 1 - (now - trail.born) / 1400);
        if (trail.life <= 0) trailRef.current.splice(i, 1);
      }

      const cellSize = 28;
      const cols = Math.ceil(w / cellSize) + 1;
      const rows = Math.ceil(h / cellSize) + 1;
      const aspect = w / h;

      const sampleAt = (px: number, py: number) => {
        const nx = px / w;
        const ny = py / h;
        let value = 0;

        for (const blob of blobsRef.current) {
          const dx = (nx - blob.x) * aspect;
          const dy = ny - blob.y;
          const d2 = dx * dx + dy * dy;
          const r2 = blob.r * blob.r;
          const contribution = blob.amp * Math.exp(-d2 / (2 * r2)) * (0.85 + 0.15 * Math.sin(blob.phase));
          if (contribution > value) value = contribution;
        }

        for (const trail of trailRef.current) {
          const dx = px - trail.x;
          const dy = py - trail.y;
          value += 0.6 * trail.life * Math.exp(-(dx * dx + dy * dy) / (2 * 110 * 110));
        }

        for (const incident of incidentsRef.current) {
          const age = (now - incident.born) / incident.life;
          const envelope = Math.sin(age * Math.PI);
          const dx = px - incident.x;
          const dy = py - incident.y;
          const radius = 60 + age * 80;
          value += incident.strength * 0.5 * envelope * Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
        }

        return Math.min(1, value);
      };

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = x * cellSize + cellSize / 2;
          const py = y * cellSize + cellSize / 2;
          const color = sampleStops(sampleAt(px, py));
          ctx.fillStyle = `rgb(${color[0] | 0},${color[1] | 0},${color[2] | 0})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.5, cellSize + 0.5);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div ref={wrapRef} className="landing-heatmap-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="landing-heatmap-canvas" />
      <IncidentPings incidentsRef={incidentsRef} />
    </div>
  );
}

function IncidentPings({ incidentsRef }: { incidentsRef: MutableRefObject<HeatIncident[]> }) {
  const [, force] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      force();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const now = performance.now();

  return (
    <svg className="landing-incident-pings" aria-hidden="true">
      {incidentsRef.current.map((incident) => {
        const age = (now - incident.born) / incident.life;
        if (age < 0 || age > 1) return null;
        const envelope = Math.sin(age * Math.PI);
        return (
          <g key={incident.id} transform={`translate(${incident.x},${incident.y})`}>
            <circle r={6 + age * 90} fill="none" stroke="rgba(200,64,52,0.55)" strokeWidth={1.5} opacity={0.5 * envelope} />
            <circle r={4} fill="rgba(200,64,52,0.9)" opacity={Math.min(1, envelope * 1.4)} />
            <circle r={2} fill="white" opacity={Math.min(1, envelope * 1.4)} />
          </g>
        );
      })}
    </svg>
  );
}
