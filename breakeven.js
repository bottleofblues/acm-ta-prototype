// Pure JS BEP visual — no external libraries
const STORAGE_KEY = "acm_bep_v1";

function lerp(a, b, t) { return a + (b - a) * t; }

function simulate(params) {
  const { horizon, dailyCost, dailyValue, daysTo100, initialPct } = params;
  const pts = [];
  let cumCost = 0, cumValue = 0, bepIndex = -1;

  for (let d = 0; d <= horizon; d++) {
    const rampT = Math.min(1, d / daysTo100);
    const eff = Math.max(0, Math.min(1, lerp(initialPct / 100, 1, rampT)));
    const valueToday = eff * dailyValue;
    cumCost += dailyCost;
    cumValue += valueToday;

    if (bepIndex === -1 && cumValue >= cumCost) bepIndex = d;
    pts.push({ d, cumCost, cumValue, eff });
  }

  return { pts, bepIndex };
}

function fmtCurrency(n) {
  try { return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }
  catch { return "$" + Math.round(n).toString(); }
}

function drawChart(canvas, sim) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const margin = { l: 60, r: 16, t: 16, b: 32 };
  const plotW = W - margin.l - margin.r;
  const plotH = H - margin.t - margin.b;

  // Scales
  const maxY = Math.max(...sim.pts.map(p => Math.max(p.cumCost, p.cumValue))) * 1.1;
  const maxX = Math.max(...sim.pts.map(p => p.d));
  const xScale = d => margin.l + (d / maxX) * plotW;
  const yScale = v => margin.t + plotH - (v / maxY) * plotH;

  // Axes
  const axisColor = "#e5e7eb";
  const gridColor = "#f3f4f6";
  const labelColor = "#6b7280";

  const ctxLine = (sx, sy, ex, ey, color) => {
    ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  };

  ctx.lineWidth = 1;
  ctxLine(margin.l, margin.t, margin.l, margin.t + plotH, axisColor);
  ctxLine(margin.l, margin.t + plotH, margin.l + plotW, margin.t + plotH, axisColor);

  // Gridlines + labels (y)
  ctx.fillStyle = labelColor;
  ctx.font = "12px system-ui";
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const v = (i / yTicks) * maxY;
    const y = yScale(v);
    ctx.strokeStyle = gridColor;
    ctxLine(margin.l, y, margin.l + plotW, y, gridColor);
    ctx.fillText(fmtCurrency(v), 8, y + 4);
  }
  // X ticks (every 15 days)
  for (let d = 0; d <= maxX; d += 15) {
    const x = xScale(d);
    ctx.strokeStyle = gridColor;
    ctxLine(x, margin.t, x, margin.t + plotH, gridColor);
    ctx.fillText(d + "d", x - 8, margin.t + plotH + 16);
  }

  // Lines
  function drawLine(data, accessor, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((p, i) => {
      const x = xScale(p.d), y = yScale(accessor(p));
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }
  drawLine(sim.pts, p => p.cumCost, "#9aa5b1");  // consumed
  drawLine(sim.pts, p => p.cumValue, "#3b82f6"); // created

  // Break-even marker
  if (sim.bepIndex >= 0) {
    const p = sim.pts[sim.bepIndex];
    const x = xScale(p.d);
    const y = yScale(p.cumValue);
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
    // dashed guide
    ctx.setLineDash([4,4]);
    ctx.beginPath();
    ctx.moveTo(x, margin.t);
    ctx.lineTo(x, margin.t + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function saveSnapshot(params, sim) {
  const payload = { params, bepIndex: sim.bepIndex, savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadSnapshot() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function main() {
  const startDate = document.getElementById("startDate");
  const dailyCost = document.getElementById("dailyCost");
  const dailyValue = document.getElementById("dailyValue");
  const daysTo100 = document.getElementById("daysTo100");
  const initialPct = document.getElementById("initialPct");
  const horizon = document.getElementById("horizon");
  const chart = document.getElementById("chart");
  const bepText = document.getElementById("bepText");
  const journal = document.getElementById("journal");
  const journalSaved = document.getElementById("journalSaved");

  // Load prior snapshot
  const snap = loadSnapshot();
  if (snap?.params) {
    dailyCost.value = snap.params.dailyCost;
    dailyValue.value = snap.params.dailyValue;
    daysTo100.value = snap.params.daysTo100;
    initialPct.value = snap.params.initialPct;
    horizon.value = snap.params.horizon;
    if (snap.params.startDate) startDate.value = snap.params.startDate;
  }

  function run() {
    const params = {
      startDate: startDate.value || null,
      dailyCost: Number(dailyCost.value),
      dailyValue: Number(dailyValue.value),
      daysTo100: Number(daysTo100.value),
      initialPct: Number(initialPct.value),
      horizon: Number(horizon.value)
    };
    const sim = simulate(params);
    drawChart(chart, sim);

    let bepLabel = "No break‑even within horizon.";
    if (sim.bepIndex >= 0) {
      let dateStr = "";
      if (params.startDate) {
        const dt = new Date(params.startDate);
        dt.setDate(dt.getDate() + sim.bepIndex);
        dateStr = " (" + dt.toLocaleDateString() + ")";
      }
      bepLabel = `Break‑Even at ~Day ${sim.bepIndex}${dateStr}.`;
    }
    bepText.textContent = `${bepLabel}  Cumulative curves compare value consumed vs. value created as you ramp.`;
    return { params, sim };
  }

  // Buttons
  document.getElementById("simulate").addEventListener("click", () => {
    run();
  });

  document.getElementById("quick").addEventListener("click", () => {
    // Rough defaults often cited by executives
    dailyCost.value = 600;
    dailyValue.value = 950;
    daysTo100.value = 75;
    initialPct.value = 15;
    horizon.value = 120;
    run();
  });

  document.getElementById("save").addEventListener("click", () => {
    const { params, sim } = run();
    saveSnapshot(params, sim);
    bepText.textContent += "  Snapshot saved locally.";
  });

  document.getElementById("saveJournal").addEventListener("click", () => {
    const existing = loadSnapshot() || {};
    existing.journal = journal.value;
    existing.journalSavedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    journalSaved.textContent = "Journal saved locally.";
    setTimeout(() => journalSaved.textContent = "", 2500);
  });

  // First draw
  run();
}

document.addEventListener("DOMContentLoaded", main);
