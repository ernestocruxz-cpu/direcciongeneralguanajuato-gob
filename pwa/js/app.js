const app = document.querySelector("#app");
const apiBase = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "4000"
  ? "http://localhost:4000"
  : "";

const storage = {
  get token() {
    return localStorage.getItem("pwaToken");
  },
  set token(value) {
    localStorage.setItem("pwaToken", value);
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem("pwaUser") || "{}");
    } catch {
      return {};
    }
  },
  set user(value) {
    localStorage.setItem("pwaUser", JSON.stringify(value));
  },
  clear() {
    localStorage.removeItem("pwaToken");
    localStorage.removeItem("pwaUser");
  },
};

const vehicleBrands = [
  "ABARTH", "ACURA", "ALFA ROMEO", "ASTON MARTIN", "AUDI", "BAIC", "BENTLEY", "BMW", "BUICK", "BYD",
  "CADILLAC", "CHANGAN", "CHERY", "CHEVROLET", "CHIREY", "CHRYSLER", "CITROEN", "CUPRA", "DACIA",
  "DODGE", "FERRARI", "FIAT", "FORD", "FOTON", "GAC", "GEELY", "GMC", "GREAT WALL", "HONDA",
  "HUMMER", "HYUNDAI", "INFINITI", "ISUZU", "JAC", "JAGUAR", "JEEP", "JETOUR", "KIA", "LAMBORGHINI",
  "LAND ROVER", "LEXUS", "LINCOLN", "MASERATI", "MAZDA", "MCLAREN", "MERCEDES-BENZ", "MG", "MINI",
  "MITSUBISHI", "NISSAN", "OPEL", "PEUGEOT", "PORSCHE", "RAM", "RENAULT", "ROLLS-ROYCE", "SEAT",
  "SMART", "SUBARU", "SUZUKI", "TESLA", "TOYOTA", "VOLKSWAGEN", "VOLVO"
].sort((a, b) => a.localeCompare(b, "es"));

let view = "alta";
let statusFilter = "activo";
let currentPage = 1;
let pageSize = 10;
let editingFolio = "";
let records = [];
let pagination = { page: 1, totalPages: 1, total: 0 };

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value == null ? "" : String(value);
  return span.innerHTML;
}

function formatDate(value) {
  if (!value) return "--/--/----";
  const [year, month, day] = String(value).split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

function toInputDate(value) {
  return value ? String(value).split("T")[0] : "";
}

function getNextDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function showModal({ title, body, confirmText = "Aceptar", cancelText = "Cancelar", showCancel = false }) {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "modal-backdrop";
    root.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true">
        <h2>${escapeHtml(title)}</h2>
        <p>${body}</p>
        <div class="modal-actions">
          ${showCancel ? `<button class="secondary" type="button" data-cancel>${escapeHtml(cancelText)}</button>` : ""}
          <button class="primary" type="button" data-confirm>${escapeHtml(confirmText)}</button>
        </div>
      </section>
    `;

    const close = (value) => {
      root.remove();
      resolve(value);
    };

    root.querySelector("[data-confirm]").addEventListener("click", () => close(true));
    root.querySelector("[data-cancel]")?.addEventListener("click", () => close(false));
    document.body.appendChild(root);
    root.querySelector("[data-confirm]").focus();
  });
}

async function api(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(storage.token ? { Authorization: `Bearer ${storage.token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json") ? await response.json() : await response.blob();

  if (!response.ok) {
    throw new Error(result.message || "No fue posible completar la operacion.");
  }

  return result;
}

function renderLogin() {
  app.innerHTML = `
    <section class="login-screen">
      <form class="login-card" id="login-form">
        <div class="app-brand">
          <span class="app-mark" aria-hidden="true"><span></span></span>
          <div>
            <p class="kicker">Acceso interno</p>
            <h1>Control vehicular</h1>
          </div>
        </div>
        <label class="field">
          Correo
          <input name="email" type="email" autocomplete="username" required />
        </label>
        <label class="field">
          Contrasena
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <button class="primary full" type="submit">Ingresar</button>
        <p class="message" id="login-message" aria-live="polite"></p>
      </form>
    </section>
  `;

  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = document.querySelector("#login-message");
    message.textContent = "Validando acceso...";

    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") || "").trim(),
          password: String(form.get("password") || "").trim(),
        }),
      });
      storage.token = result.token;
      storage.user = result.user;
      renderApp();
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

function renderShell(content) {
  const user = storage.user;
  const displayName = user.name || user.email || "Usuario";
  app.innerHTML = `
    <header class="topbar">
      <div class="topbar-main">
        <div class="topbar-brand">
          <span class="app-mark small" aria-hidden="true"><span></span></span>
          <strong>Vehiculos</strong>
        </div>
        <div class="user-menu">
          <button class="avatar-button" type="button" data-user-menu>
            <span class="avatar">${escapeHtml(displayName.trim().charAt(0).toUpperCase() || "U")}</span>
            <span class="chevron" aria-hidden="true"></span>
          </button>
          <div class="dropdown" data-dropdown>
            <strong>${escapeHtml(displayName)}</strong>
            <button class="danger" type="button" data-logout>Cerrar sesion</button>
          </div>
        </div>
      </div>
      <nav class="tabs" aria-label="Navegacion PWA">
        <button class="${view === "alta" ? "active" : ""}" type="button" data-view="alta">
          <span class="ios-symbol symbol-plus" aria-hidden="true"></span>
          <span>Alta</span>
        </button>
        <button class="${view === "activos" ? "active" : ""}" type="button" data-view="activos">
          <span class="ios-symbol symbol-check" aria-hidden="true"></span>
          <span>Activos</span>
        </button>
        <button class="${view === "inactivos" ? "active" : ""}" type="button" data-view="inactivos">
          <span class="ios-symbol symbol-clock" aria-hidden="true"></span>
          <span>Inactivos</span>
        </button>
      </nav>
    </header>
    <section class="view">${content}</section>
  `;

  document.querySelector("[data-user-menu]").addEventListener("click", () => {
    document.querySelector("[data-dropdown]").classList.toggle("open");
  });
  document.querySelector("[data-logout]").addEventListener("click", () => {
    storage.clear();
    renderLogin();
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      view = button.dataset.view;
      if (view === "activos") statusFilter = "activo";
      if (view === "inactivos") statusFilter = "inactivo";
      currentPage = 1;
      editingFolio = "";
      renderApp();
    });
  });
}

function vehicleFormTemplate(vehicle = {}) {
  const brandOptions = ['<option value="">Selecciona una marca</option>']
    .concat(vehicleBrands.map((brand) => `<option value="${brand}" ${vehicle.brand === brand ? "selected" : ""}>${brand}</option>`))
    .join("");

  return `
    <article class="panel">
      <h1>${editingFolio ? "Editar vehiculo" : "Alta de vehiculo"}</h1>
      <p>${editingFolio ? `Folio ${escapeHtml(editingFolio)}` : "Captura la informacion para generar folio y PDF."}</p>
      <form id="vehicle-form" class="form-grid">
        <label class="field">Fecha de expedicion
          <input name="issueDate" type="date" value="${toInputDate(vehicle.issue_date)}" required />
        </label>
        <label class="field">Fecha de vencimiento
          <input name="expirationDate" type="date" value="${toInputDate(vehicle.expiration_date)}" required />
        </label>
        <label class="field">Marca
          <select name="brand" required>${brandOptions}</select>
        </label>
        <label class="field">Modelo
          <input name="line" type="text" maxlength="80" value="${escapeHtml(vehicle.line || "")}" required />
        </label>
        <label class="field">Ano
          <input name="modelYear" type="text" inputmode="numeric" maxlength="4" value="${escapeHtml(vehicle.model_year || "")}" required />
        </label>
        <label class="field">Color
          <input name="color" type="text" maxlength="60" value="${escapeHtml(vehicle.color || "")}" required />
        </label>
        <label class="field">Propietario
          <input name="ownerName" type="text" maxlength="160" value="${escapeHtml(vehicle.owner_name || "")}" required />
        </label>
        <label class="field">Numero de serie
          <input name="serialNumber" type="text" maxlength="17" value="${escapeHtml(vehicle.serial_number || "")}" required />
        </label>
        <label class="field">Numero de motor
          <input name="engineNumber" type="text" maxlength="40" value="${escapeHtml(vehicle.engine_number || "")}" required />
        </label>
        <div class="actions">
          <button class="secondary" type="reset">
            <span class="ios-symbol symbol-reset" aria-hidden="true"></span>
            <span>Limpiar</span>
          </button>
          <button class="primary" type="submit">
            <span class="ios-symbol symbol-save" aria-hidden="true"></span>
            <span>${editingFolio ? "Guardar" : "Crear alta"}</span>
          </button>
        </div>
      </form>
      <p class="message" id="form-message" aria-live="polite"></p>
    </article>
  `;
}

function getVehiclePayload(form) {
  const data = new FormData(form);
  return {
    issueDate: data.get("issueDate"),
    expirationDate: data.get("expirationDate"),
    brand: String(data.get("brand") || "").trim().toUpperCase(),
    line: String(data.get("line") || "").trim().toUpperCase(),
    modelYear: String(data.get("modelYear") || "").trim(),
    color: String(data.get("color") || "").trim().toUpperCase(),
    ownerName: String(data.get("ownerName") || "").trim().toUpperCase(),
    serialNumber: String(data.get("serialNumber") || "").trim().toUpperCase(),
    engineNumber: String(data.get("engineNumber") || "").trim().toUpperCase(),
  };
}

function validatePayload(payload) {
  if (payload.expirationDate <= payload.issueDate) return "La fecha de vencimiento debe ser posterior a la expedicion.";
  if (!/^\d{4}$/.test(payload.modelYear)) return "El ano debe tener 4 digitos.";
  if (payload.serialNumber.length > 17) return "El numero de serie no debe superar 17 caracteres.";
  return "";
}

function bindVehicleForm() {
  const form = document.querySelector("#vehicle-form");
  const message = document.querySelector("#form-message");
  const issueInput = form.elements.issueDate;
  const expirationInput = form.elements.expirationDate;

  const syncMin = () => {
    expirationInput.min = getNextDate(issueInput.value);
    if (expirationInput.value && expirationInput.min && expirationInput.value < expirationInput.min) {
      expirationInput.value = "";
    }
  };

  issueInput.addEventListener("change", syncMin);
  syncMin();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const payload = getVehiclePayload(form);
    const validation = validatePayload(payload);
    if (validation) {
      await showModal({ title: "Revisa los datos", body: escapeHtml(validation) });
      return;
    }

    const confirmed = await showModal({
      title: editingFolio ? "Confirmar cambios" : "Confirmar alta",
      body: editingFolio ? `Se actualizará el folio ${escapeHtml(editingFolio)}.` : "Se creara un nuevo folio aleatorio.",
      confirmText: editingFolio ? "Guardar" : "Crear",
      showCancel: true,
    });
    if (!confirmed) return;

    try {
      message.textContent = "Guardando...";
      const result = await api(`/api/vehicles${editingFolio ? `/${editingFolio}` : ""}`, {
        method: editingFolio ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const folio = result.vehicle?.folio || editingFolio;
      await showModal({ title: "Guardado", body: `Folio ${escapeHtml(folio)} guardado correctamente.` });
      editingFolio = "";
      form.reset();
      message.textContent = "";
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

async function renderFormView(vehicle = null) {
  renderShell(vehicleFormTemplate(vehicle || {}));
  bindVehicleForm();
}

function listTemplate() {
  const title = statusFilter === "activo" ? "Autos activos" : "Autos inactivos";
  return `
    <article class="panel">
      <h1>${title}</h1>
      <p id="list-count">Cargando registros...</p>
      <div class="list-tools">
        <label class="field">Buscar
          <input id="search" type="search" placeholder="Folio, marca, modelo, propietario" />
        </label>
        <label class="field">Fecha de registro
          <input id="created-date" type="date" />
        </label>
        <label class="field">Mostrar
          <select id="page-size">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
      </div>
      <div id="vehicle-list" class="vehicle-list"></div>
      <div class="pager">
        <button class="secondary" id="prev-page" type="button">Anterior</button>
        <span id="page-status">Pagina 1</span>
        <button class="secondary" id="next-page" type="button">Siguiente</button>
      </div>
    </article>
  `;
}

function renderCards() {
  const list = document.querySelector("#vehicle-list");
  const count = document.querySelector("#list-count");
  const prev = document.querySelector("#prev-page");
  const next = document.querySelector("#next-page");
  const pageStatus = document.querySelector("#page-status");

  count.textContent = `${pagination.total || 0} registros.`;
  pageStatus.textContent = `Pagina ${pagination.page || 1} de ${pagination.totalPages || 1}`;
  prev.disabled = (pagination.page || 1) <= 1;
  next.disabled = (pagination.page || 1) >= (pagination.totalPages || 1);

  if (!records.length) {
    list.innerHTML = `<div class="empty">No hay registros con estos filtros.</div>`;
    return;
  }

  list.innerHTML = records.map((record) => `
    <article class="vehicle-card">
      <div class="vehicle-head">
        <span class="folio">${escapeHtml(record.folio)}</span>
        <span class="status ${record.validity_status === "activo" ? "active" : "inactive"}">${escapeHtml(record.validity_status)}</span>
      </div>
      <dl>
        <dt>Registro</dt><dd>${escapeHtml(formatDate(record.created_at))}</dd>
        <dt>Marca</dt><dd>${escapeHtml(record.brand)}</dd>
        <dt>Modelo</dt><dd>${escapeHtml(record.line)}</dd>
        <dt>Ano</dt><dd>${escapeHtml(record.model_year)}</dd>
        <dt>Vence</dt><dd>${escapeHtml(formatDate(record.expiration_date))}</dd>
        <dt>Serie</dt><dd>${escapeHtml(record.serial_number)}</dd>
        <dt>Propietario</dt><dd>${escapeHtml(record.owner_name)}</dd>
      </dl>
      <div class="card-actions">
        <button class="primary icon-button" type="button" data-pdf="${escapeHtml(record.folio)}" aria-label="Abrir PDF">
          <span class="ios-symbol symbol-doc" aria-hidden="true"></span>
          <span>PDF</span>
        </button>
        <button class="secondary icon-button" type="button" data-edit="${escapeHtml(record.folio)}" aria-label="Editar">
          <span class="ios-symbol symbol-edit" aria-hidden="true"></span>
          <span>Editar</span>
        </button>
        <button class="danger icon-button" type="button" data-delete="${escapeHtml(record.folio)}" aria-label="Eliminar">
          <span class="ios-symbol symbol-trash" aria-hidden="true"></span>
          <span>Eliminar</span>
        </button>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-pdf]").forEach((button) => button.addEventListener("click", () => openPdf(button.dataset.pdf)));
  list.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => loadForEdit(button.dataset.edit)));
  list.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteRecord(button.dataset.delete)));
}

async function loadRecords() {
  const search = document.querySelector("#search")?.value.trim() || "";
  const createdDate = document.querySelector("#created-date")?.value || "";
  const params = new URLSearchParams({
    page: String(currentPage),
    pageSize: String(pageSize),
    validityStatus: statusFilter,
  });
  if (search) params.set("search", search);
  if (createdDate) params.set("createdDate", createdDate);

  try {
    const result = await api(`/api/vehicles?${params.toString()}`);
    records = result.vehicles || [];
    pagination = result.pagination || pagination;
    renderCards();
  } catch (error) {
    document.querySelector("#list-count").textContent = error.message;
    document.querySelector("#vehicle-list").innerHTML = `<div class="empty">No fue posible cargar el listado.</div>`;
  }
}

function bindList() {
  let timer = null;
  document.querySelector("#page-size").value = String(pageSize);
  document.querySelector("#search").addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      currentPage = 1;
      loadRecords();
    }, 300);
  });
  document.querySelector("#created-date").addEventListener("change", () => {
    currentPage = 1;
    loadRecords();
  });
  document.querySelector("#page-size").addEventListener("change", (event) => {
    pageSize = Number(event.target.value) || 10;
    currentPage = 1;
    loadRecords();
  });
  document.querySelector("#prev-page").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadRecords();
    }
  });
  document.querySelector("#next-page").addEventListener("click", () => {
    if (currentPage < pagination.totalPages) {
      currentPage += 1;
      loadRecords();
    }
  });
  loadRecords();
}

async function openPdf(folio) {
  const confirmed = await showModal({
    title: "Abrir PDF",
    body: `Se abrira el formato del folio ${escapeHtml(folio)}.`,
    confirmText: "Abrir",
    showCancel: true,
  });
  if (!confirmed) return;

  try {
    const response = await fetch(`${apiBase}/api/vehicles/${folio}/pdf`, {
      headers: { Authorization: `Bearer ${storage.token}` },
    });

    if (!response.ok) {
      throw new Error("No fue posible abrir el PDF.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, "_blank");

    if (!opened) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `permiso-${folio}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) {
    await showModal({ title: "No fue posible abrir", body: escapeHtml(error.message) });
  }
}

async function loadForEdit(folio) {
  try {
    const result = await api(`/api/vehicles/${folio}`);
    editingFolio = folio;
    view = "alta";
    await renderFormView(result.vehicle);
  } catch (error) {
    await showModal({ title: "No fue posible cargar", body: escapeHtml(error.message) });
  }
}

async function deleteRecord(folio) {
  const confirmed = await showModal({
    title: "Eliminar registro",
    body: `Confirma que deseas eliminar el folio ${escapeHtml(folio)}.`,
    confirmText: "Eliminar",
    showCancel: true,
  });
  if (!confirmed) return;

  try {
    await api(`/api/vehicles/${folio}`, { method: "DELETE" });
    await showModal({ title: "Eliminado", body: `Folio ${escapeHtml(folio)} eliminado.` });
    loadRecords();
  } catch (error) {
    await showModal({ title: "No fue posible eliminar", body: escapeHtml(error.message) });
  }
}

function renderListView(status) {
  statusFilter = status;
  renderShell(listTemplate());
  bindList();
}

function renderApp() {
  if (!storage.token) {
    renderLogin();
    return;
  }

  if (view === "activos") {
    renderListView("activo");
    return;
  }

  if (view === "inactivos") {
    renderListView("inactivo");
    return;
  }

  renderFormView();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/pwa/service-worker.js").catch(() => {});
  });
}

renderApp();
