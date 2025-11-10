// ===== Config =====
const BACKEND = () => localStorage.getItem("acm_backend_base") || "http://localhost:3000";
const STORAGE_KEY = "acm_tra_v1";

// ===== Data =====
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

// ===== Helpers =====
function renderTable() {
  const tbody = document.querySelector("#traTable tbody");
  tbody.innerHTML = "";
  const saved = load() || {};
  ACTIONS.forEach((action, idx) => {
    const tr = document.createElement("tr");

    const tdAction = document.createElement("td");
    tdAction.textContent = action;

    const tdRel = document.createElement("td");
    const rel = document.createElement("input");
    rel.type = "checkbox";
    rel.id = `rel_${idx}`;
    rel.checked = saved[idx]?.relevance ?? false;
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

    tr.appendChild(tdAction);
    tr.appendChild(tdRel);
    tr.appendChild(tdDiff);
    tr.appendChild(tdNotes);
    tbody.appendChild(tr);
  });

  const j = document.getElementById("journal");
  if (j) j.value = saved.journal || "";
}

function collect() {
  const rows = ACTIONS.map((action, idx) => {
    const relevance = document.getElementById(`rel_${idx}`).checked;
    const raw = document.getElementById(`diff_${idx}`).value.trim();
    const notes = document.getElementById(`note_${idx}`).value.trim();
    const difficulty = raw === "" ? null : Number(raw);
    return { action, relevance, difficulty, notes };
  });
  const journal = (document.getElementById("journal")?.value || "").trim();
  return { rows, journal };
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
  payload.rows.forEach((r, i) => out[i] = { relevance: r.relevance, difficulty: r.difficulty, notes: r.notes });
  out.journal = payload.journal;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

async function postCoach(prompt, profile) {
  const res = await fetch(`${BACKEND()}/api/coach`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ prompt, profile })
  });
  if (!res.ok) throw new Error(`Coach API ${res.status}`);
  return res.json();
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded", () => {
  renderTable();

  document.getElementById("calc").addEventListener("click", () => {
    const { total, bucket, guidance } = score(collect());
    document.getElementById("result").innerHTML =
      `Transition Risk Index: <strong>${total}</strong>
       &nbsp; <span class="badge ${bucket === 'Low' ? 'low' : bucket === 'Moderate' ? 'mod' : 'high'}">${bucket}</span>
       <br>${guidance}`;
  });

  document.getElementById("save").addEventListener("click", () => {
    save(collect());
    document.getElementById("result").textContent = "Progress saved locally on this device.";
  });

  document.getElementById("clear").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderTable();
    document.getElementById("result").textContent = "";
  });

  // Coaching button
  const btn = document.getElementById("getFeedback");
  const replyBox = document.getElementById("coachReply");

  btn.addEventListener("click", async () => {
    replyBox.textContent = "Thinking…";

    const payload = collect();
    const { total, bucket } = score(payload);
    const journalText = payload.journal || "(no journal entry provided)";

    // load learner profile from welcome page
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem("acm_init_v1") || "{}"); } catch {}

    const prompt = [
      "Provide concise coaching feedback (3-5 bullets) for a new executive in first 90 days.",
      `Transition Risk Index: ${total} (${bucket})`,
      `Journal: ${journalText}`,
      "End with 3 clear actions for the next 7 days."
    ].join("\n");

    try {
      const data = await postCoach(prompt, profile);
      replyBox.textContent = data.reply || data.note || "(no response)";
    } catch (e) {
      console.error(e);
      replyBox.textContent = "ACM TA could not respond.";
    }
  });
});
