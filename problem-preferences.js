// ===============================
// Problem Preferences Exercise JS
// ===============================

// --- 1. Data model ---

// Part 1 domains (exact text from your prompt)
const DOMAINS = [
  "Design of appraisal and reward systems",
  "Employee morale",
  "Equity/fairness",
  "Management of financial risk",
  "Budgeting",
  "Cost-consciousness",
  "Product positioning",
  "Relationships with customers",
  "Organizational customer focus",
  "Product or service quality",
  "Relationships with distributors and suppliers",
  "Continuous improvement",
  "Project management systems",
  "Relationships among R&D, marketing, and operations",
  "Cross-functional cooperation"
];

// Matrix rows (functions) and columns (spheres)
const FUNCTIONS = [
  "Human Resources",
  "Finance",
  "Marketing",
  "Operations",
  "Research and development"
];

const SPHERES = ["Technical", "Political", "Cultural"];

// Simple storage key if you want to persist later
const STORAGE_KEY_PREFS = "acm_problem_prefs_v1";


// --- 2. Mapping from each domain -> (function, sphere)
// NOTE: This is a *plausible* mapping for the exercise. You can adjust later
// if you want to align it exactly to how you and Paul want to teach it.

const DOMAIN_MAPPING = [
  // index, function, sphere
  { index: 0, fn: "Human Resources", sphere: "Technical" },  // Design of appraisal and reward systems
  { index: 1, fn: "Human Resources", sphere: "Cultural" },   // Employee morale
  { index: 2, fn: "Human Resources", sphere: "Cultural" },   // Equity/fairness

  { index: 3, fn: "Finance", sphere: "Technical" },          // Management of financial risk
  { index: 4, fn: "Finance", sphere: "Technical" },          // Budgeting
  { index: 5, fn: "Finance", sphere: "Cultural" },           // Cost-consciousness

  { index: 6, fn: "Marketing", sphere: "Technical" },        // Product positioning
  { index: 7, fn: "Marketing", sphere: "Political" },        // Relationships with customers
  { index: 8, fn: "Marketing", sphere: "Cultural" },         // Organizational customer focus

  { index: 9, fn: "Operations", sphere: "Technical" },       // Product or service quality
  { index: 10, fn: "Operations", sphere: "Political" },      // Relationships with distributors/suppliers
  { index: 11, fn: "Operations", sphere: "Cultural" },       // Continuous improvement
  { index: 12, fn: "Operations", sphere: "Technical" },      // Project management systems

  { index: 13, fn: "Research and development", sphere: "Political" }, // Relationships among R&D, mktg, ops
  { index: 14, fn: "Research and development", sphere: "Cultural" }   // Cross-functional cooperation
];


// --- 3. Helpers to find the correct <tbody> elements ---
// These are forgiving: they look for either an explicit ID OR
// just “the first tbody under the table”.

function getDomainTbody() {
  return (
    document.getElementById("domainTableBody") ||
    document.querySelector("#domainTable tbody") ||
    document.querySelector('[data-role="domain-tbody"]') ||
    document.querySelector("#domainTableBody") // last fallback
  );
}

function getMatrixTbody() {
  return (
    document.getElementById("matrixBody") ||
    document.querySelector("#matrixTable tbody") ||
    document.querySelector('[data-role="matrix-tbody"]') ||
    document.querySelector("#matrixBody")
  );
}


// --- 4. Render Part 1: Interest Ratings by Domain ---

function renderDomainRows() {
  const tbody = getDomainTbody();
  if (!tbody) {
    console.warn("Problem Prefs: domain tbody not found.");
    return;
  }
  tbody.innerHTML = "";

  DOMAINS.forEach((label, idx) => {
    const tr = document.createElement("tr");

    // Domain label
    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;

    // 1–10 input
    const tdInput = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "10";
    input.step = "1";
    input.id = `domain_${idx}`;
    input.style.width = "70px";
    tdInput.appendChild(input);

    tr.appendChild(tdLabel);
    tr.appendChild(tdInput);
    tbody.appendChild(tr);
  });
}


// --- 5. Render Part 2: Problem Preference Matrix ---

function renderMatrixRows() {
  const tbody = getMatrixTbody();
  if (!tbody) {
    console.warn("Problem Prefs: matrix tbody not found.");
    return;
  }
  tbody.innerHTML = "";

  // One row for each function
  FUNCTIONS.forEach(fnName => {
    const tr = document.createElement("tr");

    // Row label (function)
    const tdLabel = document.createElement("td");
    tdLabel.textContent = fnName;
    tr.appendChild(tdLabel);

    // 3 spheres + total cell
    SPHERES.forEach(sphereName => {
      const td = document.createElement("td");
      td.id = `cell_${fnName}_${sphereName}`.replace(/\s+/g, "_");
      td.textContent = "0";
      tr.appendChild(td);
    });

    // Row total
    const tdTotal = document.createElement("td");
    tdTotal.id = `rowTotal_${fnName}`.replace(/\s+/g, "_");
    tdTotal.textContent = "0";
    tr.appendChild(tdTotal);

    tbody.appendChild(tr);
  });

  // Last "Total" row (for column totals + grand total)
  const totalRow = document.createElement("tr");

  const totalLabel = document.createElement("td");
  totalLabel.textContent = "Total";
  totalRow.appendChild(totalLabel);

  SPHERES.forEach(sphereName => {
    const td = document.createElement("td");
    td.id = `colTotal_${sphereName}`;
    td.textContent = "0";
    totalRow.appendChild(td);
  });

  const grand = document.createElement("td");
  grand.id = "grandTotal";
  grand.textContent = "0";
  totalRow.appendChild(grand);

  tbody.appendChild(totalRow);
}


// --- 6. Calculate the matrix from ratings ---

function calculateMatrix() {
  // Read ratings
  const ratings = DOMAINS.map((_, idx) => {
    const el = document.getElementById(`domain_${idx}`);
    if (!el) return 0;
    const v = parseInt(el.value, 10);
    if (Number.isNaN(v)) return 0;
    return Math.min(10, Math.max(1, v)); // clamp to 1–10
  });

  // Initialize matrix structure
  const matrix = {};
  FUNCTIONS.forEach(fn => {
    matrix[fn] = {};
    SPHERES.forEach(s => (matrix[fn][s] = 0));
  });

  // Fill matrix based on mapping
  DOMAIN_MAPPING.forEach(({ index, fn, sphere }) => {
    const rating = ratings[index] || 0;
    if (matrix[fn] && sphere in matrix[fn]) {
      matrix[fn][sphere] += rating;
    }
  });

  // Update UI cells
  let grandTotal = 0;
  const colTotals = {};
  SPHERES.forEach(s => (colTotals[s] = 0));

  FUNCTIONS.forEach(fn => {
    let rowTotal = 0;
    SPHERES.forEach(sphere => {
      const val = matrix[fn][sphere];
      const cellId = `cell_${fn}_${sphere}`.replace(/\s+/g, "_");
      const cell = document.getElementById(cellId);
      if (cell) cell.textContent = String(val);
      rowTotal += val;
      colTotals[sphere] += val;
      grandTotal += val;
    });
    const rowCell = document.getElementById(`rowTotal_${fn}`.replace(/\s+/g, "_"));
    if (rowCell) rowCell.textContent = String(rowTotal);
  });

  SPHERES.forEach(sphere => {
    const colCell = document.getElementById(`colTotal_${sphere}`);
    if (colCell) colCell.textContent = String(colTotals[sphere]);
  });

  const grandCell = document.getElementById("grandTotal");
  if (grandCell) grandCell.textContent = String(grandTotal);
}


// --- 7. Clear all inputs and matrix ---

function clearPreferences() {
  // Clear ratings
  DOMAINS.forEach((_, idx) => {
    const el = document.getElementById(`domain_${idx}`);
    if (el) el.value = "";
  });

  // Clear matrix cells
  FUNCTIONS.forEach(fn => {
    SPHERES.forEach(sphere => {
      const cell = document.getElementById(
        `cell_${fn}_${sphere}`.replace(/\s+/g, "_")
      );
      if (cell) cell.textContent = "0";
    });
    const rowCell = document.getElementById(
      `rowTotal_${fn}`.replace(/\s+/g, "_")
    );
    if (rowCell) rowCell.textContent = "0";
  });

  SPHERES.forEach(sphere => {
    const colCell = document.getElementById(`colTotal_${sphere}`);
    if (colCell) colCell.textContent = "0";
  });

  const grandCell = document.getElementById("grandTotal");
  if (grandCell) grandCell.textContent = "0";
}


// --- 8. Wire everything on DOMContentLoaded ---

document.addEventListener("DOMContentLoaded", () => {
  // Draw tables
  renderDomainRows();
  renderMatrixRows();

  // Hook up buttons
  const calcBtn = document.getElementById("calcMatrix");
  if (calcBtn) {
    calcBtn.addEventListener("click", () => {
      calculateMatrix();
    });
  }

  const clearBtn = document.getElementById("clearPreferences");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearPreferences();
    });
  }
});
