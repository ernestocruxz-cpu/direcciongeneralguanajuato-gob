const form = document.querySelector("#vehicle-form");
const message = document.querySelector("#save-message");
const previewNodes = document.querySelectorAll("[data-preview]");
const apiBase = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "4000"
  ? "http://localhost:4000"
  : "";
const token = sessionStorage.getItem("adminToken");

if (!token) {
  window.location.href = "login.html";
}

function formatDate(value) {
  if (!value) return "--/--/----";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
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

function updatePreview() {
  const values = getFormData();

  previewNodes.forEach((node) => {
    const key = node.dataset.preview;
    const value = key.includes("Fecha") || key.startsWith("fecha") ? formatDate(values[key]) : values[key];
    node.textContent = value || "---";
  });
}

form.addEventListener("input", updatePreview);

form.addEventListener("reset", () => {
  window.setTimeout(() => {
    updatePreview();
    message.textContent = "";
  }, 0);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const record = getFormData();

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
    form.reset();
  } catch (error) {
    message.textContent = error.message;
  }
});

updatePreview();
