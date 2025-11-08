// results.js
const STORAGE_KEY = "acm_tra_v1";
const INIT_KEY = "acm_init_v1"; // consent + links + JD (from index.html)

function loadTRA() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function loadInit() {
  try { return JSON.parse(localStorage.getItem(INIT_KEY)) || {}; }
  catch { return {}; }
}

function computeScore(out) {
  // out is {0:{relevance, difficulty, notes}, 1:{...}, ..., journal:"..."}
  let total = 0;
  const rows = [];
  Object.keys(out).forEach(k => {
    if (k === "journal") return;
    const i = Number(k);
    const r = out[k];
    if (!isNaN(i)) {
      const row = { idx: i, relevance: !!r.relevance, difficulty: Number(r.difficulty ?? NaN), notes: r.notes || "" };
      rows.push(row);
      if (row.relevance && Number.isFinite(row.difficulty)) total += row.difficulty;
    }
  });

  let bucket = "Low";
  let guidance = "Risks appear manageable; prioritize quick wins and stakeholder mapping.";
  if (total > 60) { bucket = "High"; guidance = "Sequence learning, limit scope, and tighten check-ins with sponsor."; }
  else if (total > 30) { bucket = "Moderate"; guidance = "Target 2–3 risk clusters; time-box learning and secure early allies."; }

  // Derive top 3 relevant items by difficulty (we don’t know action labels here; recompute from tra.js list):
  const ACTIONS = [
    "Moving to a new industry or profession",
    "Joining a new company",
    "Moving to a new unit or group in the same company",
    "Being promoted to a higher level",
    "Leading former peers (assuming you have been promoted)",
    "Moving from one function to another (e.g., sales to marketing)",
    "Taking on a cross-functional leadership role for the first time",
    "Moving geographically",
    "Entering a new national or ethnic culture",
    "Having to do two jobs at the same time (finishing old role while starting new one)",
    "Taking on a newly created role (as opposed to an existing role)",
    "Entering an organization in which major change already is going on"
  ];

  const relevant = rows
    .filter(r => r.relevance && Number.isFinite(r.difficulty))
    .sort((a,b) => b.difficulty - a.difficulty)
    .slice(0, 3)
    .map(r => ({ action: ACTIONS[r.idx] || `Action ${r.idx+1}`, difficulty: r.difficulty, notes: r.notes }));

  return { total, bucket, guidance, top: relevant, rows, journal: (out.journal || "") };
}

function render() {
  const out = loadTRA();
  const init = loadInit();
  const { total, bucket, guidance, top, journal } = computeScore(out);

  // Score + bucket
  document.getElementById("score").textContent = total;
  const bucketEl = document.getElementById("bucket");
  bucketEl.textContent = bucket;
  bucketEl.className = "badge " + (bucket === "Low" ? "low" : bucket === "Moderate" ? "mod" : "high");
  document.getElementById("guidance").textContent = guidance;

  // Top risks
  const ul = document.getElementById("topRisks");
  ul.innerHTML = "";
  if (top.length === 0) {
    ul.innerHTML = "<li>No relevant items rated yet.</li>";
  } else {
    top.forEach(t => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${t.action}</strong> — difficulty ${t.difficulty}${t.notes ? ` <span class="muted">(notes: ${t.notes})</span>` : ""}`;
      ul.appendChild(li);
    });
  }

  // Recommendations by bucket
  const recs = document.getElementById("recs");
  recs.innerHTML = "";
  const recMap = {
    Low: [
      "Lock in 1–2 early wins tied to your mandate.",
      "Complete stakeholder map; book 1:1s to understand success criteria.",
      "Draft your break-even plan: how quickly the role ‘pays back’ the organization."
    ],
    Moderate: [
      "Choose 2–3 risk clusters to attack first; deliberately defer the rest.",
      "Time-box structured learning (people, technical, cultural).",
      "Align expectations with your boss; confirm success metrics and review cadence."
    ],
    High: [
      "Aggressively sequence learning and narrow scope; reduce in-flight commitments.",
      "Establish weekly sponsor check-ins; negotiate resourcing trade-offs.",
      "Build a small coalition early to unblock critical paths and signal momentum."
    ]
  };
  (recMap[bucket] || []).forEach(r => {
    const li = document.createElement("li"); li.textContent = r; recs.appendChild(li);
  });

  // Journal
  document.getElementById("journal").value = journal || "";
}

function saveJournal() {
  const out = loadTRA();
  out.journal = document.getElementById("journal").value.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
}

function toCsv(rows) {
  const header = ["action_index","relevance","difficulty","notes"];
  const lines = [header.join(",")];
  rows.forEach(r => {
    const line = [r.idx+1, r.relevance, Number.isFinite(r.difficulty)?r.difficulty:"", `"${(r.notes||"").replaceAll('"','""')}"`];
    lines.push(line.join(","));
  });
  return lines.join("\n");
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function buildSummaryText(score, bucket, guidance, top, init) {
  const lines = [];
  lines.push("Advanced Career Mastery — Transition Risk Summary");
  lines.push(`Score: ${score}  |  Bucket: ${bucket}`);
  lines.push(guidance);
  if (top.length) {
    lines.push("");
    lines.push("Top Risks:");
    top.forEach(t => lines.push(`• ${t.action} — difficulty ${t.difficulty}${t.notes ? ` (notes: ${t.notes})` : ""}`));
  }
  if (init?.day90_outcomes) {
    const o = typeof init.day90_outcomes === "string" ? init.day90_outcomes : (init.day90_outcomes || []).join("; ");
    if (o) { lines.push(""); lines.push("Day-90 Outcomes (learner): " + o); }
  }
  return lines.join("\n");
}

document.addEventListener("DOMContentLoaded", () => {
  render();

  document.getElementById("saveJournal").addEventListener("click", saveJournal);

  document.getElementById("copy").addEventListener("click", () => {
    const out = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const init = loadInit();
    const comp = computeScore(out);
    const txt = buildSummaryText(comp.total, comp.bucket, comp.guidance, comp.top, init);
    navigator.clipboard.writeText(txt).then(() => {
      alert("Summary copied to clipboard.");
    });
  });

  document.getElementById("downloadJson").addEventListener("click", () => {
    const payload = {
      init: loadInit(),
      tra: JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
      computed: computeScore(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"))
    };
    download("acm_tra_summary.json", JSON.stringify(payload, null, 2), "application/json");
  });

  document.getElementById("downloadCsv").addEventListener("click", () => {
    const out = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const rows = computeScore(out).rows;
    download("acm_tra_rows.csv", toCsv(rows), "text/csv");
  });

  document.getElementById("print").addEventListener("click", () => window.print());
});
