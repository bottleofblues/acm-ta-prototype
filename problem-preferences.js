// ACM TA — Problem Preferences (Watkins)

// ---- Config ----

// Default backend: your Vercel API
const BACKEND_BASE =
  localStorage.getItem("acm_backend_base") ||
  "https://acm-ta-backend.vercel.app";

// Domains for Part 1, plus a mapping into function + sphere
const PP_DOMAINS = [
  {
    label: "Design of appraisal and reward systems",
    func: "Human Resources",
    sphere: "Cultural"
  },
  {
    label: "Employee morale",
    func: "Human Resources",
    sphere: "Cultural"
  },
  {
    label: "Equity / fairness",
    func: "Human Resources",
    sphere: "Political"
  },
  {
    label: "Management of financial risk",
    func: "Finance",
    sphere: "Technical"
  },
  {
    label: "Budgeting",
    func: "Finance",
    sphere: "Technical"
  },
  {
    label: "Cost-consciousness",
    func: "Finance",
    sphere: "Cultural"
  },
  {
    label: "Product positioning",
    func: "Marketing",
    sphere: "Technical"
  },
  {
    label: "Relationships with customers",
    func: "Marketing",
    sphere: "Political"
  },
  {
    label: "Organizational customer focus",
    func: "Marketing",
    sphere: "Cultural"
  },
  {
    label: "Product or service quality",
    func: "Operations",
    sphere: "Technical"
  },
  {
    label: "Relationships with distributors and suppliers",
    func: "Operations",
    sphere: "Political"
  },
  {
    label: "Continuous improvement",
    func: "Operations",
    sphere: "Cultural"
  },
  {
    label: "Project management systems",
    func: "R&D",
    sphere: "Technical"
  },
  {
    label: "Relationships among R&D, marketing, and operations",
    func: "R&D",
    sphere: "Political"
  },
  {
    label: "Cross-functional cooperation",
    func: "R&D",
    sphere: "Cultural"
  }
];

const FUNCTIONS = [
  "Human Resources",
  "Finance",
  "Marketing",
  "Operations",
  "R&D"
];

const SPHERES = ["Technical", "Political", "Cultural"];

// ---- Rendering Part 1: Domain table ----
function renderDomainRows() {
  const tbody = document.getElementById("ppDomainBody");
  tbody.innerHTML = "";

  PP_DOMAINS.forEach((d, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.func = d.func;
    tr.dataset.sphere = d.sphere;

    const tdLabel = document.createElement("td");
    tdLabel.textContent = d.label;

    const tdScore = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "10";
    input.step = "1";
    input.id = `ppScore_${idx}`;
    input.className = "ppScore";
    tdScore.appendChild(input);

    tr.appendChild(tdLabel);
    tr.appendChild(tdScore);
    tbody.appendChild(tr);
  });
}

// ---- Data collection ----
function collectRatings() {
  const rows = Array.from(
    document.querySelectorAll("#ppDomainBody tr")
  );

  return rows.map((tr, idx) => {
    const label = PP_DOMAINS[idx].label;
    const func = tr.dataset.func;
    const sphere = tr.dataset.sphere;
    const input = tr.querySelector("input");
    const raw = (input.value || "").trim();
    const score = raw === "" ? null : Number(raw);

    return { label, func, sphere, score };
  });
}

// ---- Part 2: Build matrix + summary ----
function calculateMatrix() {
  const ratings = collectRatings();

  // matrix[func][sphere] = sum of scores
  const matrix = {};
  FUNCTIONS.forEach(f => {
    matrix[f] = {};
    SPHERES.forEach(s => { matrix[f][s] = 0; });
  });

  ratings.forEach(r => {
    if (typeof r.score === "number" && !isNaN(r.score)) {
      matrix[r.func][r.sphere] += r.score;
    }
  });

  const tbody = document.getElementById("ppMatrixBody");
  tbody.innerHTML = "";

  let grandTotals = { Technical: 0, Political: 0, Cultural: 0 };
  let grandTotalAll = 0;

  FUNCTIONS.forEach(func => {
    const tr = document.createElement("tr");

    const tdFunc = document.createElement("td");
    tdFunc.textContent = func;
    tr.appendChild(tdFunc);

    let rowTotal = 0;

    SPHERES.forEach(sphere => {
      const v = matrix[func][sphere];
      const td = document.createElement("td");
      td.textContent = v ? v.toString() : "";
      tr.appendChild(td);
      rowTotal += v;
      grandTotals[sphere] += v;
      grandTotalAll += v;
    });

    const tdRowTotal = document.createElement("td");
    tdRowTotal.textContent = rowTotal ? rowTotal.toString() : "";
    tr.appendChild(tdRowTotal);

    tbody.appendChild(tr);
  });

  // Totals row
  const trTotal = document.createElement("tr");
  const tdLabel = document.createElement("td");
  tdLabel.textContent = "Total";
  trTotal.appendChild(tdLabel);

  let rowTotal = 0;
  SPHERES.forEach(sphere => {
    const v = grandTotals[sphere];
    const td = document.createElement("td");
    td.textContent = v ? v.toString() : "";
    trTotal.appendChild(td);
    rowTotal += v;
  });
  const tdAll = document.createElement("td");
  tdAll.textContent = rowTotal ? rowTotal.toString() : "";
  trTotal.appendChild(tdAll);

  tbody.appendChild(trTotal);

  // Simple narrative summary
  const summaryEl = document.getElementById("ppMatrixSummary");
  const mostSphere = SPHERES
    .map(s => ({ s, v: grandTotals[s] }))
    .sort((a, b) => b.v - a.v)[0];

  summaryEl.textContent =
    rowTotal === 0
      ? "Enter some interest ratings above, then recalculate to see your pattern."
      : `Your strongest overall interest appears in the ${mostSphere.s} sphere. Total interest points: ${rowTotal}.`;
}

// ---- Clear ----
function clearAll() {
  document
    .querySelectorAll("#ppDomainBody input.ppScore")
    .forEach(inp => { inp.value = ""; });
  document.getElementById("ppMatrixBody").innerHTML = "";
  document.getElementById("ppMatrixSummary").textContent = "";
  document.getElementById("ppJournal").value = "";
  document.getElementById("ppCoachReply").textContent = "";
}

// ---- Coach API helper ----
async function postCoach(prompt, profile) {
  const res = await fetch(`${BACKEND_BASE}/api/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, profile })
  });
  if (!res.ok) throw new Error(`Coach API ${res.status}`);
  return res.json();
}

// ---- Part 3: Reflect & Get Coaching ----
async function handleCoachingClick() {
  const replyEl = document.getElementById("ppCoachReply");
  replyEl.textContent = "Thinking…";

  const ratings = collectRatings();
  const filled = ratings.filter(r => typeof r.score === "number" && !isNaN(r.score));

  if (!filled.length) {
    replyEl.textContent = "Please enter at least a few interest ratings first.";
    return;
  }

  // Find top 3 and bottom 3 domains by interest
  const sorted = [...filled].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3);

  const journal = (
    document.getElementById("ppJournal").value || ""
  ).trim() || "(no journal reflection provided)";

  // Load learner profile from welcome page
  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem("acm_init_v1") || "{}");
  } catch {
    profile = {};
  }

  // Build Watkins/ACM flavored prompt
  const promptLines = [];

  promptLines.push(
    "You are ACM TA, coaching a newly hired executive in their first 90 days, using Michael Watkins’ 'The First 90 Days' and Paul Bickford Solutions’ Advanced Career Mastery program."
  );
  promptLines.push(
    "They have just completed a Problem Preferences exercise (technical/political/cultural across HR, Finance, Marketing, Operations, R&D)."
  );

  if (profile && Object.keys(profile).length > 0) {
    promptLines.push(
      "Learner profile (from onboarding form, not scraped): " +
      JSON.stringify(profile)
    );
  }

  promptLines.push("\nInterest ratings by domain (label: score, function, sphere):");
  filled.forEach(r => {
    promptLines.push(`- ${r.label} — ${r.score} (Func: ${r.func}, Sphere: ${r.sphere})`);
  });

  promptLines.push("\nTop 3 interest domains:");
  top3.forEach(r => {
    promptLines.push(`- ${r.label} — ${r.score}`);
  });

  promptLines.push("\nLowest 3 interest domains:");
  bottom3.forEach(r => {
    promptLines.push(`- ${r.label} — ${r.score}`);
  });

  promptLines.push("\nLearner's written reflection:");
  promptLines.push(journal);

  promptLines.push(`
Using Watkins’ lens (technical, political, cultural) and the first-90-days context:

1. Identify which spheres and functions the leader is most drawn to and which they may neglect.
2. Call out 2–3 specific vulnerabilities this pattern might create in their new role.
3. Offer 3–5 concrete, near-term moves (next 2–3 weeks) to:
   - Lean into strengths,
   - Intentionally address blind spots,
   - And avoid common transition traps (e.g., over-focusing on one sphere, ignoring culture, or neglecting key stakeholders).
Keep the tone practical, concise, and executive-ready.
  `.trim());

  const prompt = promptLines.join("\n");

  try {
    const data = await postCoach(prompt, profile);
    const reply = data.reply || data.note || "Feedback ready (stub).";
    replyEl.textContent = reply;
  } catch (err) {
    console.error(err);
    replyEl.textContent = "ACM TA could not respond. Please try again in a moment.";
  }
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  renderDomainRows();

  document
    .getElementById("ppCalcMatrix")
    .addEventListener("click", calculateMatrix);

  document
    .getElementById("ppClear")
    .addEventListener("click", clearAll);

  document
    .getElementById("ppGetFeedback")
    .addEventListener("click", handleCoachingClick);
});
