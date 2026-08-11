const menuButton = document.querySelector(".menu-button");
const mainMenu = document.querySelector("#main-menu");
const form = document.querySelector(".folio-form");
const input = document.querySelector("#folio");
const message = document.querySelector(".form-message");
const apiBase = window.location.port === "4000" ? "" : "http://localhost:4000";

menuButton.addEventListener("click", () => {
  const isOpen = mainMenu.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const folio = input.value.trim();

  if (!/^\d{5}$/.test(folio)) {
    message.textContent = "Ingresa un folio valido de 5 digitos.";
    input.focus();
    return;
  }

  try {
    message.textContent = "Consultando folio...";
    const response = await fetch(`${apiBase}/api/public/folios/${folio}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No fue posible consultar el folio.");
    }

    message.textContent = `Folio ${folio}: ${result.vehicle.brand} ${result.vehicle.line} ${result.vehicle.model_year}.`;
  } catch (error) {
    message.textContent = error.message;
  }
});
