const form = document.querySelector("#vehicle-form");
const message = document.querySelector("#save-message");
const previewNodes = document.querySelectorAll("[data-preview]");
const brandSelect = form.elements.marca;
const issueDateInput = form.elements.fechaExpedicion;
const expirationDateInput = form.elements.fechaVencimiento;
const logoutButton = document.querySelector("[data-logout]");
const apiBase = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "4000"
  ? "http://localhost:4000"
  : "";
const token = sessionStorage.getItem("adminToken");
const vehicleBrands = [
  "ABARTH",
  "ACURA",
  "ALFA ROMEO",
  "ASTON MARTIN",
  "AUDI",
  "BAIC",
  "BENTLEY",
  "BMW",
  "BUICK",
  "BYD",
  "CADILLAC",
  "CHANGAN",
  "CHERY",
  "CHEVROLET",
  "CHIREY",
  "CHRYSLER",
  "CITROEN",
  "CUPRA",
  "DACIA",
  "DODGE",
  "FERRARI",
  "FIAT",
  "FORD",
  "FOTON",
  "GAC",
  "GEELY",
  "GMC",
  "GREAT WALL",
  "HONDA",
  "HUMMER",
  "HYUNDAI",
  "INFINITI",
  "ISUZU",
  "JAC",
  "JAGUAR",
  "JEEP",
  "JETOUR",
  "KIA",
  "LAMBORGHINI",
  "LAND ROVER",
  "LEXUS",
  "LINCOLN",
  "MASERATI",
  "MAZDA",
  "MCLAREN",
  "MERCEDES-BENZ",
  "MG",
  "MINI",
  "MITSUBISHI",
  "NISSAN",
  "OPEL",
  "PEUGEOT",
  "PORSCHE",
  "RAM",
  "RENAULT",
  "ROLLS-ROYCE",
  "SEAT",
  "SMART",
  "SUBARU",
  "SUZUKI",
  "TESLA",
  "TOYOTA",
  "VOLKSWAGEN",
  "VOLVO",
]
  .sort((a, b) => a.localeCompare(b, "es"));

if (!token) {
  window.location.href = "login.html";
}

logoutButton?.addEventListener("click", () => {
  sessionStorage.removeItem("adminToken");
  sessionStorage.removeItem("adminUser");
  window.location.href = "login.html";
});

function populateBrands() {
  vehicleBrands.forEach((brand) => {
    const option = document.createElement("option");
    option.value = brand;
    option.textContent = brand;
    brandSelect.appendChild(option);
  });
}

function formatDate(value) {
  if (!value) return "--/--/----";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getNextDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getFormData() {
  const data = new FormData(form);
  return {
    fechaExpedicion: data.get("fechaExpedicion"),
    fechaVencimiento: data.get("fechaVencimiento"),
    marca: String(data.get("marca") || "").trim().toUpperCase(),
    linea: String(data.get("linea") || "").trim().toUpperCase(),
    anio: String(data.get("anio") || "").trim(),
    color: String(data.get("color") || "").trim().toUpperCase(),
    propietario: String(data.get("propietario") || "").trim().toUpperCase(),
    numeroSerie: String(data.get("numeroSerie") || "").trim().toUpperCase(),
    numeroMotor: String(data.get("numeroMotor") || "").trim().toUpperCase(),
  };
}

function toApiPayload(record) {
  return {
    issueDate: record.fechaExpedicion,
    expirationDate: record.fechaVencimiento,
    brand: record.marca,
    line: record.linea,
    modelYear: record.anio,
    color: record.color,
    ownerName: record.propietario,
    serialNumber: record.numeroSerie,
    engineNumber: record.numeroMotor,
  };
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

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value == null ? "" : String(value);
  return span.innerHTML;
}

function validateRecord(record) {
  if (record.fechaVencimiento <= record.fechaExpedicion) {
    return "La fecha de vencimiento debe ser posterior a la fecha de expedicion.";
  }

  if (!/^\d{4}$/.test(record.anio)) {
    return "El ano debe tener exactamente 4 digitos.";
  }

  if (record.numeroSerie.length > 17) {
    return "El numero de serie no debe superar 17 caracteres.";
  }

  return "";
}

function syncExpirationMin() {
  const minExpirationDate = getNextDate(issueDateInput.value);
  expirationDateInput.min = minExpirationDate;

  if (expirationDateInput.value && minExpirationDate && expirationDateInput.value < minExpirationDate) {
    expirationDateInput.value = "";
  }
}

function buildConfirmSummary(record) {
  return `
    <dl class="modal-summary">
      <dt>Expedicion</dt><dd>${escapeHtml(formatDate(record.fechaExpedicion))}</dd>
      <dt>Vencimiento</dt><dd>${escapeHtml(formatDate(record.fechaVencimiento))}</dd>
      <dt>Marca</dt><dd>${escapeHtml(record.marca)}</dd>
      <dt>Linea</dt><dd>${escapeHtml(record.linea)}</dd>
      <dt>Ano</dt><dd>${escapeHtml(record.anio)}</dd>
      <dt>Serie</dt><dd>${escapeHtml(record.numeroSerie)}</dd>
      <dt>Propietario</dt><dd>${escapeHtml(record.propietario)}</dd>
    </dl>
  `;
}

function updatePreview() {
  const values = getFormData();

  previewNodes.forEach((node) => {
    const key = node.dataset.preview;
    const value = key.includes("Fecha") || key.startsWith("fecha") ? formatDate(values[key]) : values[key];
    node.textContent = value || "---";
  });
}

form.addEventListener("input", updatePreview);
issueDateInput.addEventListener("change", () => {
  syncExpirationMin();
  updatePreview();
});

form.addEventListener("reset", () => {
  window.setTimeout(() => {
    syncExpirationMin();
    updatePreview();
    message.textContent = "";
  }, 0);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const record = getFormData();
  const validationMessage = validateRecord(record);

  if (validationMessage) {
    message.textContent = validationMessage;
    await showModal({
      title: "Revisa los datos",
      body: `<p>${escapeHtml(validationMessage)}</p>`,
      confirmText: "Aceptar",
      showCancel: false,
    });
    return;
  }

  const confirmed = await showModal({
    title: "Confirmar alta",
    body: `<p>Confirma que deseas guardar esta alta vehicular.</p>${buildConfirmSummary(record)}`,
    confirmText: "Guardar alta",
    cancelText: "Cancelar",
  });

  if (!confirmed) {
    message.textContent = "Alta cancelada.";
    return;
  }

  try {
    message.textContent = "Guardando alta...";
    const response = await fetch(`${apiBase}/api/vehicles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(toApiPayload(record)),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No fue posible guardar el alta.");
    }

    message.textContent = `Alta guardada. Folio generado: ${result.vehicle.folio}.`;
    await showModal({
      title: "Alta guardada",
      body: `<p>El folio generado es <strong>${escapeHtml(result.vehicle.folio)}</strong>.</p>`,
      confirmText: "Aceptar",
      showCancel: false,
    });
    form.reset();
  } catch (error) {
    message.textContent = error.message;
  }
});

populateBrands();
syncExpirationMin();
updatePreview();
