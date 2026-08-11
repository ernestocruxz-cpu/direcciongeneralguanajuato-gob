const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const apiBase = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "4000"
  ? "http://localhost:4000"
  : "";

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(loginForm);
  const email = String(data.get("email") || "").trim();
  const password = String(data.get("contrasena") || "").trim();

  try {
    loginMessage.textContent = "Validando acceso...";
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No fue posible iniciar sesion.");
    }

    sessionStorage.setItem("adminToken", result.token);
    sessionStorage.setItem("adminUser", JSON.stringify(result.user));
    loginMessage.textContent = "Acceso correcto. Redirigiendo...";
    window.setTimeout(() => {
      window.location.href = "alta.html";
    }, 600);
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});
