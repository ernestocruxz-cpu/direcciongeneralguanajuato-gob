const recordsBody = document.querySelector("#records-body");
const emptyState = document.querySelector("#empty-state");
const recordCount = document.querySelector("#record-count");
const searchInput = document.querySelector("#search-records");
const clearSearch = document.querySelector("#clear-search");
const apiBase = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "4000"
  ? "http://localhost:4000"
  : "";
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
    button.addEventListener("click", () => confirmAndDownloadPdf(record));
    actionCell.appendChild(button);
    row.appendChild(actionCell);

    recordsBody.appendChild(row);
  });

  recordCount.textContent = `${filtered.length} de ${records.length} autos dados de alta.`;
  emptyState.hidden = filtered.length > 0;
}

function getModalRoot() {
  let root = document.querySelector("#app-modal-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "app-modal-root";
    document.body.appendChild(root);
  }
  return root;
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value == null ? "" : String(value);
  return span.innerHTML;
}

function showModal({ title, body, confirmText = "Aceptar", cancelText = "Cancelar", showCancel = true }) {
  return new Promise((resolve) => {
    const root = getModalRoot();
    root.innerHTML = `
      <div class="app-modal-backdrop" role="presentation">
        <section class="app-modal" role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
          <h2 id="app-modal-title">${title}</h2>
          <div class="app-modal-body">${body}</div>
          <div class="app-modal-actions">
            ${showCancel ? `<button class="secondary-button" type="button" data-modal-cancel>${cancelText}</button>` : ""}
            <button class="primary-button" type="button" data-modal-confirm>${confirmText}</button>
          </div>
        </section>
      </div>
    `;

    const close = (value) => {
      root.innerHTML = "";
      resolve(value);
    };

    root.querySelector("[data-modal-confirm]").focus();
    root.querySelector("[data-modal-confirm]").addEventListener("click", () => close(true));
    root.querySelector("[data-modal-cancel]")?.addEventListener("click", () => close(false));
  });
}

async function confirmAndDownloadPdf(record) {
  const confirmed = await showModal({
    title: "Descargar formato",
    body: `
      <p>Confirma que deseas descargar el formato PDF de este folio.</p>
      <dl class="modal-summary">
        <dt>Folio</dt><dd>${escapeHtml(record.folio)}</dd>
        <dt>Marca</dt><dd>${escapeHtml(record.brand)}</dd>
        <dt>Linea</dt><dd>${escapeHtml(record.line)}</dd>
        <dt>Serie</dt><dd>${escapeHtml(record.serial_number)}</dd>
      </dl>
    `,
    confirmText: "Descargar",
    cancelText: "Cancelar",
  });

  if (confirmed) {
    await downloadPdf(record.folio);
  }
}

async function downloadPdf(folio) {
  try {
    const response = await fetch(`${apiBase}/api/vehicles/${folio}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const result = await response.json();
      await showModal({
        title: "No fue posible descargar",
        body: `<p>${escapeHtml(result.message || "No fue posible generar el PDF.")}</p>`,
        confirmText: "Aceptar",
        showCancel: false,
      });
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `permiso-${folio}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch {
    await showModal({
      title: "No fue posible descargar",
      body: "<p>Revisa tu conexion o intenta nuevamente.</p>",
      confirmText: "Aceptar",
      showCancel: false,
    });
  }
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
