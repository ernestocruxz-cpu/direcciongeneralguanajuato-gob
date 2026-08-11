const menuButton = document.querySelector(".menu-button");
const mainMenu = document.querySelector("#main-menu");
const form = document.querySelector(".folio-form");
const input = document.querySelector("#folio");
const message = document.querySelector(".form-message");
const siteHeader = document.querySelector(".site-header");
const siteFooter = document.querySelector(".site-footer");
const heroSection = document.querySelector(".hero");
const folioSection = document.querySelector(".folio-section");
const resultSection = document.querySelector(".digital-result");
const resultContent = document.querySelector("#digital-result-content");
const apiBase = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "4000"
  ? "http://localhost:4000"
  : "";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function isExpired(value) {
  if (!value) return false;
  const today = new Date();
  const expiration = new Date(value);
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const expirationUtc = Date.UTC(
    expiration.getUTCFullYear(),
    expiration.getUTCMonth(),
    expiration.getUTCDate()
  );
  return expirationUtc < todayUtc;
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value == null ? "" : String(value);
  return span.innerHTML;
}

function showResultLayout() {
  document.body.classList.add("digital-result-page");
  siteHeader.hidden = true;
  siteFooter.hidden = true;
  heroSection.hidden = true;
  folioSection.hidden = true;
  resultSection.hidden = false;
}

function renderValidResult(vehicle) {
  const expired = isExpired(vehicle.expiration_date);
  const statusText = expired ? "VENCIDO" : "VIGENTE";

  resultContent.innerHTML = `
    <div class="digital-status ${expired ? "is-expired" : "is-active"}">
      FOLIO ${escapeHtml(vehicle.folio)} : ${statusText}
    </div>

    <article class="digital-card">
      <dl>
        <dt>FECHA DE EXPEDICIÓN:</dt>
        <dd>${escapeHtml(formatDate(vehicle.issue_date))}</dd>

        <dt>FECHA DE VENCIMIENTO:</dt>
        <dd>${escapeHtml(formatDate(vehicle.expiration_date))}</dd>

        <dt>MARCA:</dt>
        <dd>${escapeHtml(vehicle.brand)}</dd>

        <dt>LÍNEA:</dt>
        <dd>${escapeHtml(vehicle.line)}</dd>

        <dt>AÑO:</dt>
        <dd>${escapeHtml(vehicle.model_year)}</dd>

        <dt>NÚMERO DE SERIE:</dt>
        <dd>${escapeHtml(vehicle.serial_number)}</dd>

        <dt>NÚMERO DE MOTOR:</dt>
        <dd>${escapeHtml(vehicle.engine_number)}</dd>
      </dl>
    </article>

    <p class="digital-validity">DOCUMENTO DIGITAL VÁLIDO EN TODO MÉXICO</p>
    <a class="digital-back" href="/">Regresar</a>
  `;
}

function renderNotFoundResult(folio) {
  resultContent.innerHTML = `
    <div class="digital-status is-missing">
      FOLIO ${escapeHtml(folio)} : NO SE ENCUENTRA<br />REGISTRADO
    </div>

    <p class="digital-validity">DOCUMENTO DIGITAL VÁLIDO EN TODO MÉXICO</p>
    <a class="digital-back" href="/">Regresar</a>
  `;
}

async function loadDigitalResult(folio) {
  showResultLayout();

  if (!/^\d{6}$/.test(folio)) {
    renderNotFoundResult(folio);
    return;
  }

  try {
    resultContent.innerHTML = `<p class="digital-loading">Consultando folio...</p>`;
    const response = await fetch(`${apiBase}/api/public/folios/${folio}`);
    const result = await response.json();

    if (!response.ok || !result.vehicle) {
      renderNotFoundResult(folio);
      return;
    }

    renderValidResult(result.vehicle);
  } catch {
    renderNotFoundResult(folio);
  }
}

if (menuButton && mainMenu) {
  menuButton.addEventListener("click", () => {
    const isOpen = mainMenu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const folio = input.value.trim();

    if (!/^\d{6}$/.test(folio)) {
      message.textContent = "Ingresa un folio valido de 6 digitos.";
      input.focus();
      return;
    }

    window.location.href = `/?folio=${encodeURIComponent(folio)}`;
  });
}

const params = new URLSearchParams(window.location.search);
const folioFromUrl = params.get("folio");

if (folioFromUrl) {
  loadDigitalResult(folioFromUrl.trim());
}
