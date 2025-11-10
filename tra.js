// ---- CONFIG ----
const BACKEND_KEY = "acm_backend_base"; // e.g., "http://localhost:3000"
const STORAGE_KEY = "acm_tra_v1";

// ---- API helper ----
async function postCoach(prompt, profile) {
  const base = localStorage.getItem(BACKEND_KEY) || "http://localhost:3000";
  const res = await fetch(`${base}/api/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, profile })
  });
  if (!res.ok) throw new Error(`Coach API ${res.status}`);
  return res.json();
}

// ---- TRA table ----
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

function renderTable() {
  const tbody = document.querySelector("#traTable tbody");
  tbody.innerHTML = "";
  const saved = load() || {};
  ACTIONS.forEach((action, idx) => {
    const row = document.createElement("tr");

    const tdAction = document.createElement("td");
    tdAction.textContent = action;

    const tdRel = document.createElement("td");
    const rel = document.createElement("input");
    rel.type = "checkbox";
    rel.id = `rel_${idx}`;
    rel.checked = !!(saved[idx]?.relevance);
    tdRel.appendChild(rel);

    const tdDiff = document.createElement("td");
    const diff = document.createElement("input");
    diff.type = "number";
    diff.min = "1";
    diff.max = "10";
    diff.value = saved[idx]?.difficulty ?? "";
    diff.id = `diff_${idx}`;
    tdDiff.appendChild(diff);

    const tdNotes = document.createElement("td");
    const notes = document.createElement("input");
    notes.type = "text";
    notes.placeholder = "optional";
    notes.value = saved[idx]?.notes ?? "";
    notes.id = `note_${idx}`;
    tdNotes.appendChild(notes);

    row.appendChild(tdAction);
    row.appendChild(tdRel);
    row.appendChild(tdDiff);
    row.appendChild(tdNotes);

    tbody.appendChild(row);
  });

  const journalEl = document.getElementById("journal");
  if (journalEl) journalEl.value = (saved.journal || "");
}

function collect() {
  const data = [];
  ACTIONS.forEach((action, idx) => {
    const relevance = document.getElementById(`rel_${idx}`).checked;
    const difficultyRaw = document.getElementById(`diff_${idx}`).value.trim();
    const notes = document.getElementById(`note_${idx}`).value.trim();
    const difficulty = difficultyRaw === "" ? null : Number(difficultyRaw);
    data.push({ action, relevance, difficulty, notes });
  });
  const journal = (document.getElementById("journal")?.value || "").trim();
  return { rows: data, journal };
}

function score(payload) {
  let total = 0;
  payload.rows.forEach(r => {
    if (r.relevance && typeof r.difficulty === "number") total += r.difficulty;
  });
  let bucket = "Low", guidance = "Risks appear manageable; prioritize quick wins and stakeholder mapping.";
  if (total > 60) { bucket = "High"; guidance = "Sequence learning, limit scope, and tighten check-ins with sponsor."; }
  else if (total > 30) { bucket = "Moderate"; guidance = "Target 2–3 risk clusters; time-box learning and secure early allies."; }
  return { total, bucket, guidance };
}

function save(payload) {
  const out = {};
  payload.rows.forEach((r, idx) => { out[idx] = { relevance: r.relevance, difficulty: r.difficulty, notes: r.notes }; });
  out.journal = payload.journal;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
  renderTable();
  document.getElementById("result").textContent = "";
}

// ---- Wire up UI once ----
document.addEventListener("DOMContentLoaded", () => {
  renderTable();

  // Calculate
  document.getElementById("calc").addEventListener("click", () => {
    const payload = collect();
    const { total, bucket, guidance } = score(payload);
    document.getElementById("result").innerHTML = `
      Transition Risk Index: <strong>${total}</strong>
      &nbsp; <span class="badge ${bucket === 'Low' ? 'low' : bucket === 'Moderate' ? 'mod' : 'high'}">${bucket}</span>
      <br>${guidance}
    `;
  });

  // Save
  document.getElementById("save").addEventListener("click", () => {
    save(collect());
    document.getElementById("result").textContent = "Progress saved locally on this device.";
  });

  // Clear
  document.getElementById("clear").addEventListener("click", clearAll);

  // Get Feedback (single clean handler)
  const btn = document.getElementById("getFeedback");
  const out = document.getElementById("coachReply");
  if (btn && out) {
    btn.addEventListener("click", async () => {
      out.textContent = "Thinking…";
      const payload = collect();
      const { total, bucket } = score(payload);
      const journal = payload.journal || "(no journal entry provided)";

      // Profile from welcome page
      let profile = {};
      try { profile = JSON.parse(localStorage.getItem("acm_init_v1") || "{}"); } catch {}

      const prompt = [
        "Provide concise coaching feedback (3–5 bullets) for a new executive in first 90 days.",
        `Transition Risk Index: ${total} (${bucket})`,
        `Journal: ${journal}`
      ].join("\n");

      try {
        const data = await postCoach(prompt, profile);
        const reply = data.reply || data.note || "Feedback (stub).";
        out.textContent = reply;
      } catch (e) {
        console.error(e);
        out.textContent = "Could not reach the coach service.";
      }
    });
  }
});
