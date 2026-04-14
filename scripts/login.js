import { login, register } from "../services/authService.js";
import { setCurrentUser } from "../utils/storage.js";
import { validateLogin, validateRegister } from "../utils/validators.js";

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.style.display = "block";
  registerForm.style.display = "none";
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.style.display = "block";
  loginForm.style.display = "none";
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  const validationMessage = validateLogin(email, password);
  if (validationMessage) {
    alert(validationMessage);
    return;
  }

  try {
    const result = await login({ email, password });
    setCurrentUser(result.user);
    alert("Đăng nhập thành công.");
    window.location.href = "index.html";
  } catch (error) {
    alert(error.message || "Đăng nhập thất bại.");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const confirmPassword = document.getElementById("register-confirm-password").value.trim();

  const validationMessage = validateRegister(name, email, password, confirmPassword);
  if (validationMessage) {
    alert(validationMessage);
    return;
  }

  try {
    await register({ name, email, password, avatar: "" });
    alert("Đăng ký thành công. Hãy đăng nhập.");
    tabLogin.click();
    registerForm.reset();
  } catch (error) {
    alert(error.message || "Đăng ký thất bại.");
  }
});