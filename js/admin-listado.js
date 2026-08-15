const recordsBody = document.querySelector("#records-body");
const emptyState = document.querySelector("#empty-state");
const recordCount = document.querySelector("#record-count");
const userNameNode = document.querySelector("[data-user-name]");
const userInitialNode = document.querySelector("[data-user-initial]");
const searchInput = document.querySelector("#search-records");
const createdDateFilter = document.querySelector("#created-date-filter");
const pageSizeSelect = document.querySelector("#page-size");
const clearSearch = document.querySelector("#clear-search");
const prevPageButton = document.querySelector("#prev-page");
const nextPageButton = document.querySelector("#next-page");
const pageStatus = document.querySelector("#page-status");
const logoutButton = document.querySelector("[data-logout]");
const apiBase = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "4000"
  ? "http://localhost:4000"
  : "";
const token = sessionStorage.getItem("adminToken");
let records = [];
let currentPage = 1;
let pagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};
let searchTimer = null;

if (!token) {
  window.location.href = "login.html";
}

try {
  const adminUser = JSON.parse(sessionStorage.getItem("adminUser") || "{}");
  const displayName = adminUser.name || adminUser.email || "Usuario";
  userNameNode.textContent = displayName;
  userInitialNode.textContent = displayName.trim().charAt(0).toUpperCase() || "U";
} catch {
  userNameNode.textContent = "Usuario";
  userInitialNode.textContent = "U";
}

logoutButton?.addEventListener("click", () => {
  sessionStorage.removeItem("adminToken");
  sessionStorage.removeItem("adminUser");
  window.location.href = "login.html";
});

function formatDate(value) {
  if (!value) return "--/--/----";
  const [year, month, day] = value.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

function renderStatus(status) {
  const normalized = String(status || "").toLowerCase();
  const label = normalized === "activo" ? "Activo" : "Inactivo";
  return `<span class="status-pill ${normalized === "activo" ? "is-active" : "is-inactive"}">${label}</span>`;
}

function renderRecords() {
  recordsBody.innerHTML = "";
  records.forEach((record) => {
    const row = document.createElement("tr");
    const cells = [
      record.folio,
      formatDate(record.created_at),
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

    const statusCell = document.createElement("td");
    statusCell.innerHTML = renderStatus(record.validity_status);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");
    const pdfButton = document.createElement("button");
    pdfButton.className = "table-button";
    pdfButton.type = "button";
    pdfButton.textContent = "PDF";
    pdfButton.addEventListener("click", () => confirmAndDownloadPdf(record));
    actionCell.appendChild(pdfButton);
    row.appendChild(actionCell);

    const editCell = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.className = "table-button table-button-light";
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => {
      window.location.href = `alta.html?folio=${encodeURIComponent(record.folio)}`;
    });
    editCell.appendChild(editButton);
    row.appendChild(editCell);

    const deleteCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.className = "table-button table-button-danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Eliminar";
    deleteButton.addEventListener("click", () => confirmAndDeleteRecord(record));
    deleteCell.appendChild(deleteButton);
    row.appendChild(deleteCell);

    recordsBody.appendChild(row);
  });

  recordCount.textContent = `${pagination.total} autos dados de alta.`;
  pageStatus.textContent = `Pagina ${pagination.page} de ${pagination.totalPages}`;
  prevPageButton.disabled = pagination.page <= 1;
  nextPageButton.disabled = pagination.page >= pagination.totalPages;
  emptyState.hidden = records.length > 0;
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

async function confirmAndDeleteRecord(record) {
  const confirmed = await showModal({
    title: "Eliminar registro",
    body: `
      <p>Confirma que deseas eliminar este registro del listado.</p>
      <dl class="modal-summary">
        <dt>Folio</dt><dd>${escapeHtml(record.folio)}</dd>
        <dt>Marca</dt><dd>${escapeHtml(record.brand)}</dd>
        <dt>Propietario</dt><dd>${escapeHtml(record.owner_name)}</dd>
      </dl>
    `,
    confirmText: "Eliminar",
    cancelText: "Cancelar",
  });

  if (!confirmed) return;

  try {
    const response = await fetch(`${apiBase}/api/vehicles/${record.folio}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No fue posible eliminar el registro.");
    }

    await showModal({
      title: "Registro eliminado",
      body: `<p>El folio <strong>${escapeHtml(record.folio)}</strong> fue eliminado del listado.</p>`,
      confirmText: "Aceptar",
      showCancel: false,
    });
    loadRecords();
  } catch (error) {
    await showModal({
      title: "No fue posible eliminar",
      body: `<p>${escapeHtml(error.message)}</p>`,
      confirmText: "Aceptar",
      showCancel: false,
    });
  }
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
    const params = new URLSearchParams({
      page: String(currentPage),
      pageSize: pageSizeSelect.value,
    });
    const search = searchInput.value.trim();
    const createdDate = createdDateFilter.value;

    if (search) params.set("search", search);
    if (createdDate) params.set("createdDate", createdDate);

    const response = await fetch(`${apiBase}/api/vehicles?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No fue posible cargar el listado.");
    }

    records = result.vehicles || [];
    pagination = result.pagination || {
      page: currentPage,
      pageSize: Number(pageSizeSelect.value),
      total: records.length,
      totalPages: 1,
    };
    currentPage = pagination.page;
    renderRecords();
  } catch (error) {
    recordsBody.innerHTML = "";
    recordCount.textContent = error.message;
    emptyState.hidden = false;
    emptyState.textContent = "Inicia sesion nuevamente o revisa que el backend este activo.";
  }
}

function reloadFromFirstPage() {
  currentPage = 1;
  loadRecords();
}

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(reloadFromFirstPage, 300);
});
createdDateFilter.addEventListener("change", reloadFromFirstPage);
pageSizeSelect.addEventListener("change", reloadFromFirstPage);
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  createdDateFilter.value = "";
  reloadFromFirstPage();
});
prevPageButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    loadRecords();
  }
});
nextPageButton.addEventListener("click", () => {
  if (currentPage < pagination.totalPages) {
    currentPage += 1;
    loadRecords();
  }
});

loadRecords();
