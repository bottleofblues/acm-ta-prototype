// ACM TA — Assessment of Problem Preferences

// -------------
// DOMAIN SETUP
// -------------

// Each domain is mapped to a function (row) and sphere (column).
// This mapping is my best approximation of Watkins' intent; you can tweak later if desired.
const DOMAINS = [
  {
    label: "Design of appraisal and reward systems",
    row: "HR",
    col: "Cultural"
  },
  {
    label: "Employee morale",
    row: "HR",
    col: "Cultural"
  },
  {
    label: "Equity/fairness",
    row: "HR",
    col: "Political"
  },
  {
    label: "Management of financial risk",
    row: "Finance",
    col: "Technical"
  },
  {
    label: "Budgeting",
    row: "Finance",
    col: "Technical"
  },
  {
    label: "Cost-consciousness",
    row: "Finance",
    col: "Cultural"
  },
  {
    label: "Product positioning",
    row: "Marketing",
    col: "Technical"
  },
  {
    label: "Relationships with customers",
    row: "Marketing",
    col: "Cultural"
  },
  {
    label: "Organizational customer focus",
    row: "Marketing",
    col: "Cultural"
  },
  {
    label: "Product or service quality",
    row: "Operations",
    col: "Technical"
  },
  {
    label: "Relationships with distributors and suppliers",
    row: "Operations",
    col: "Political"
  },
  {
    label: "Continuous improvement",
    row: "Operations",
    col: "Cultural"
  },
  {
    label: "Project management systems",
    row: "Operations",
    col: "Technical"
  },
  {
    label: "Relationships among R&D, marketing, and operations",
    row: "R&D",
    col: "Political"
  },
  {
    label: "Cross-functional cooperation",
    row: "R&D",
    col: "Cultural"
  }
];

const PREFS_STORAGE_KEY = "acm_problem_prefs_v1";

// -------------
// HELPER: COACH POST
// -------------

async function postCoach(prompt, profile) {
  // Use same pattern as TRA: base URL from localStorage, default to localhost for dev
  const base =
    localStorage.getItem("acm_backend_base") || "http://localhost:3000";

  const res = await fetch(`${base}/api/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, profile })
  });

  if (!res.ok) {
    throw new Error(`Coach API returned ${res.status}`);
  }

  return res.json();
}

// -------------
// RENDER / LOAD / SAVE
// -------------

function renderDomains() {
  const tbody = document.querySelector("#domainsTable tbody");
  tbody.innerHTML = "";

  const saved = loadPrefs() || {};

  DOMAINS.forEach((domain, idx) => {
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.textContent = domain.label;

    const tdInput = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "10";
    input.id = `pref_${idx}`;
    input.value =
      saved[idx]?.score !== undefined && saved[idx].score !== null
        ? saved[idx].score
        : "";
    tdInput.appendChild(input);

    tr.appendChild(tdLabel);
    tr.appendChild(tdInput);
    tbody.appendChild(tr);
  });

  // Restore journal if any
  const journalElm = document.getElementById("journal");
  if (journalElm && typeof saved.journal === "string") {
    journalElm.value = saved.journal;
  }
}

function collectPrefs() {
  const rows = [];

  DOMAINS.forEach((domain, idx) => {
    const raw = document.getElementById(`pref_${idx}`).value.trim();
    const score = raw === "" ? null : Number(raw);
    rows.push({
      label: domain.label,
      row: domain.row,
      col: domain.col,
      score
    });
  });

  const journal = (document.getElementById("journal").value || "").trim();

  return { rows, journal };
}

function savePrefs(payload) {
  const out = {};
  payload.rows.forEach((r, idx) => {
    out[idx] = { score: r.score };
  });
  out.journal = payload.journal;
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(out));
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY));
  } catch {
    return null;
  }
}

function clearPrefs() {
  localStorage.removeItem(PREFS_STORAGE_KEY);
  renderDomains();
  // Reset visible matrix and messages
  resetMatrixDisplay();
  const prefsResult = document.getElementById("prefsResult");
  if (prefsResult) prefsResult.textContent = "";
  const coachReply = document.getElementById("coachReply");
  if (coachReply) coachReply.textContent = "";
}

// -------------
// MATRIX CALC
// -------------

function emptyMatrix() {
  const rows = ["HR", "Finance", "Marketing", "Operations", "R&D"];
  const cols = ["Technical", "Political", "Cultural"];

  const matrix = {};
  rows.forEach((r) => {
    matrix[r] = {};
    cols.forEach((c) => {
      matrix[r][c] = 0;
    });
    matrix[r].Total = 0;
  });

  const totals = {
    Technical: 0,
    Political: 0,
    Cultural: 0,
    Grand_Total: 0
  };

  return { matrix, totals };
}

function calcMatrix(payload) {
  const { rows } = payload;
  const rowsList = ["HR", "Finance", "Marketing", "Operations", "R&D"];
  const colsList = ["Technical", "Political", "Cultural"];

  const { matrix, totals } = emptyMatrix();

  rows.forEach((r) => {
    if (r.score === null || isNaN(r.score)) return;
    if (!rowsList.includes(r.row) || !colsList.includes(r.col)) return;

    matrix[r.row][r.col] += r.score;
    matrix[r.row].Total += r.score;

    totals[r.col] += r.score;
    totals.Grand_Total += r.score;
  });

  return { matrix, totals };
}

function resetMatrixDisplay() {
  const rowIds = ["HR", "Finance", "Marketing", "Operations", "R&D"];
  const colIds = ["Technical", "Political", "Cultural"];

  rowIds.forEach((row) => {
    colIds.forEach((col) => {
      const cell = document.getElementById(`${row}_${col}`);
      if (cell) cell.textContent = "0";
    });
    const totalCell = document.getElementById(`${row}_Total`);
    if (totalCell) totalCell.textContent = "0";
  });

  const totalCols = ["Technical", "Political", "Cultural"];
  totalCols.forEach((col) => {
    const cell = document.getElementById(`Total_${col}`);
    if (cell) cell.textContent = "0";
  });
  const grand = document.getElementById("Grand_Total");
  if (grand) grand.textContent = "0";
}

function updateMatrixDisplay(matrix, totals) {
  // Row-level
  Object.keys(matrix).forEach((rowKey) => {
    const row = matrix[rowKey];
    ["Technical", "Political", "Cultural"].forEach((col) => {
      const cell = document.getElementById(`${rowKey}_${col}`);
      if (cell) cell.textContent = row[col].toString();
    });
    const totalCell = document.getElementById(`${rowKey}_Total`);
    if (totalCell) totalCell.textContent = row.Total.toString();
  });

  // Column totals + grand total
  ["Technical", "Political", "Cultural"].forEach((col) => {
    const cell = document.getElementById(`Total_${col}`);
    if (cell) cell.textContent = totals[col].toString();
  });
  const grand = document.getElementById("Grand_Total");
  if (grand) grand.textContent = totals.Grand_Total.toString();
}

// -------------
// INIT + EVENTS
// -------------

document.addEventListener("DOMContentLoaded", () => {
  renderDomains();

  const prefsResult = document.getElementById("prefsResult");

  // Calculate matrix
  document.getElementById("calcMatrix").addEventListener("click", () => {
    const payload = collectPrefs();
    const { matrix, totals } = calcMatrix(payload);
    updateMatrixDisplay(matrix, totals);

    if (prefsResult) {
      prefsResult.textContent =
        "Matrix calculated. Use it to reflect on where you most and least enjoy solving problems.";
    }
  });

  // Save locally
  document.getElementById("savePrefs").addEventListener("click", () => {
    const payload = collectPrefs();
    savePrefs(payload);
    if (prefsResult) {
      prefsResult.textContent = "Preferences and notes saved locally on this device.";
    }
  });

  // Clear
  document.getElementById("clearPrefs").addEventListener("click", () => {
    clearPrefs();
  });

  // Coaching feedback
  document
    .getElementById("getProblemFeedback")
    .addEventListener("click", async () => {
      const replyBox = document.getElementById("coachReply");
      if (replyBox) replyBox.textContent = "Thinking…";

      const payload = collectPrefs();
      const { matrix, totals } = calcMatrix(payload);

      // Build a compact summary string of the matrix for the coach
      function summarizeMatrix() {
        const rows = ["HR", "Finance", "Marketing", "Operations", "R&D"];
        const cols = ["Technical", "Political", "Cultural"];
        const lines = [];

        rows.forEach((r) => {
          const cells = cols
            .map((c) => `${c}: ${matrix[r][c]}`)
            .join(" | ");
          lines.push(`${r}: ${cells} | Total: ${matrix[r].Total}`);
        });

        lines.push(
          `Totals — Technical: ${totals.Technical}, Political: ${totals.Political}, Cultural: ${totals.Cultural}, Grand: ${totals.Grand_Total}`
        );

        return lines.join("\n");
      }

      const journalText =
        payload.journal || "(no reflection journal entry provided)";

      // Learner profile saved from index.html
      let profile = {};
      try {
        profile = JSON.parse(localStorage.getItem("acm_init_v1") || "{}");
      } catch {
        profile = {};
      }

      // Coaching prompt — explicitly Watkins/ACM flavored
      const prompt = `
You are the ACM TA, an onboarding coach for newly hired executives using Michael Watkins' "The First 90 Days" and the Advanced Career Mastery program.

The learner has just completed an Assessment of Problem Preferences.

Provide concise, practical guidance that helps them:
- See where they most and least enjoy solving problems (by function and by technical/political/cultural sphere).
- Anticipate vulnerabilities in their new role based on those preferences.
- Identify 3–5 specific actions for the next 7–14 days to balance their portfolio and avoid blind spots.

Learner profile (from welcome page — website, LinkedIn, job description) in JSON:
${JSON.stringify(profile, null, 2)}

Problem-preference matrix summary:
${summarizeMatrix()}

Reflection journal:
"${journalText}"

Keep the tone executive-level, direct, and supportive. Reference Watkins ideas where helpful (e.g., early wins, learning agenda, building relationships, avoiding transition traps), but do not lecture. Focus on next moves in their first 90 days.
      `.trim();

      try {
        const result = await postCoach(prompt, profile);
        const reply =
          result.reply ||
          result.note ||
          "Feedback ready, but the coach did not return a detailed message.";
        if (replyBox) replyBox.textContent = reply;
      } catch (err) {
        console.error(err);
        if (replyBox) {
          replyBox.textContent =
            "ACM TA could not respond. Please try again in a moment.";
        }
      }
    });
});
