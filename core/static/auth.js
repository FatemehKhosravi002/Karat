if (Auth.isLoggedIn()) {
  window.location.href = "/";
}

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const errorBox = document.getElementById("authError");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function showLogin() {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  clearError();
}

function showRegister() {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  clearError();
}

loginTab.addEventListener("click", showLogin);
registerTab.addEventListener("click", showRegister);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const btn = loginForm.querySelector("button[type=submit]");
  btn.disabled = true;

  try {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    await Auth.login(username, password);
    window.location.href = "/";
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const btn = registerForm.querySelector("button[type=submit]");
  btn.disabled = true;

  try {
    const name = document.getElementById("registerName").value.trim();
    const username = document.getElementById("registerUsername").value.trim();
    const password = document.getElementById("registerPassword").value;
    await Auth.register(name, username, password);
    await Auth.login(username, password);
    window.location.href = "/";
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
  }
});
