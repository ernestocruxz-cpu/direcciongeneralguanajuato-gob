const recordsBody = document.querySelector("#records-body");
const emptyState = document.querySelector("#empty-state");
const recordCount = document.querySelector("#record-count");
const searchInput = document.querySelector("#search-records");
const clearSearch = document.querySelector("#clear-search");
const apiBase = window.location.port === "4000" ? "" : "http://localhost:4000";
const token = sessionStorage.getItem("adminToken");
let records = [];

if (!token) {
  window.location.href = "login.html";
}

function formatDate(value) {
  if (!value) return "--/--/----";
  const [year, month, day] = value.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

function matchesSearch(record, query) {
  if (!query) return true;
  const haystack = [
    record.folio,
    record.brand,
    record.line,
    record.model_year,
    record.color,
    record.owner_name,
    record.serial_number,
    record.engine_number,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function renderRecords() {
  const query = searchInput.value.trim();
  const filtered = records.filter((record) => matchesSearch(record, query));

  recordsBody.innerHTML = "";
  filtered.forEach((record) => {
    const row = document.createElement("tr");
    const cells = [
      record.folio,
      formatDate(record.issue_date),
      formatDate(record.expiration_date),
      record.brand,
      record.line,
      record.model_year,
      record.color,
      record.owner_name,
      record.serial_number,
      record.engine_number,
    ];

    cells.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "---";
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.className = "table-button";
    button.type = "button";
    button.textContent = "PDF";
    button.addEventListener("click", () => downloadPdf(record.folio));
    actionCell.appendChild(button);
    row.appendChild(actionCell);

    recordsBody.appendChild(row);
  });

  recordCount.textContent = `${filtered.length} de ${records.length} autos dados de alta.`;
  emptyState.hidden = filtered.length > 0;
}

async function downloadPdf(folio) {
  const response = await fetch(`${apiBase}/api/vehicles/${folio}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const result = await response.json();
    alert(result.message || "No fue posible generar el PDF.");
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function loadRecords() {
  try {
    recordCount.textContent = "Cargando autos...";
    const response = await fetch(`${apiBase}/api/vehicles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No fue posible cargar el listado.");
    }

    records = result.vehicles;
    renderRecords();
  } catch (error) {
    recordsBody.innerHTML = "";
    recordCount.textContent = error.message;
    emptyState.hidden = false;
    emptyState.textContent = "Inicia sesion nuevamente o revisa que el backend este activo.";
  }
}

searchInput.addEventListener("input", renderRecords);
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  renderRecords();
});

loadRecords();
