import { getCurrentUser, clearCurrentUser, getTheme, setTheme } from "../utils/storage.js";

export function renderHeader(active = "") {
  const user = getCurrentUser();

  return `
    <header class="site-header">
      <div class="site-nav container">
        <a class="brand" href="index.html">
          <img src="../assets/images/hluv-logo.png" alt="Logo" class="site-logo">
          <span>Tạp chí ĐH Hoa Lư</span>
        </a>

        <button class="menu-toggle" id="menu-toggle">☰</button>

        <nav class="nav-links" id="nav-links">
          <a href="index.html" class="${active === "index" ? "active" : ""}">Home</a>
          <a href="magazine.html" class="${active === "magazine" ? "active" : ""}">Magazine</a>
          <a href="category.html?id=0" class="${active === "category" ? "active" : ""}">Chuyên mục</a>
          <a href="search.html" class="${active === "search" ? "active" : ""}">Tìm kiếm</a>
          <a href="about.html" class="${active === "about" ? "active" : ""}">Giới thiệu</a>
        </nav>

        <div class="actions">
          <button class="chip" id="theme-toggle">
            ${getTheme() === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          ${
            user
              ? `
            <a href="profile.html" class="user-box">
              <img src="${user.avatar || `https://i.pravatar.cc/100?u=${encodeURIComponent(user.email)}`}" alt="Avatar">
              <span>${user.name || user.email}</span>
            </a>
            <button class="chip danger" id="logout-btn">Đăng xuất</button>
          `
              : `
            <a href="login.html" class="chip primary-link">Đăng nhập</a>
          `
          }
        </div>
      </div>
    </header>
  `;
}

export function initHeader() {
  document.documentElement.setAttribute("data-theme", getTheme());

  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");
  const themeToggle = document.getElementById("theme-toggle");
  const logoutBtn = document.getElementById("logout-btn");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = getTheme();
      const next = current === "dark" ? "light" : "dark";
      setTheme(next);
      document.documentElement.setAttribute("data-theme", next);
      themeToggle.textContent = next === "dark" ? "Light Mode" : "Dark Mode";
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearCurrentUser();
      window.location.href = "index.html";
    });
  }
}