(function () {
    function currentPage() {
        return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    }

    function isActive(href) {
        return href.split('?')[0].toLowerCase() === currentPage();
    }

    function authMarkup() {
        const user = HluvStorage.getCurrentUser();
        if (!user) return '<a class="btn btn-primary rounded-pill px-3" href="login.html">Đăng nhập</a>';
        const avatar = user.avatar || `${HLUV_CONFIG.defaultAvatar}?u=${encodeURIComponent(user.email || user.name || 'guest')}`;
        const isAdmin = HluvHelpers.isAdminUser(user);
        return `
            <button type="button" class="user-area ${isAdmin ? 'admin-user' : ''}" id="profile-shortcut" title="Trang cá nhân">
                <span class="avatar-frame ${isAdmin ? 'admin-avatar' : ''}">
                    <img src="${HluvHelpers.escapeHtml(avatar)}" alt="${HluvHelpers.escapeHtml(user.name || 'Avatar')}" onerror="this.src='${HLUV_CONFIG.defaultAvatar}'">
                    ${isAdmin ? '<span class="admin-badge">admin</span>' : ''}
                </span>
                <span class="user-name">${HluvHelpers.escapeHtml(user.name || user.email || 'Người dùng')}</span>
            </button>
        `;
    }

    function renderHeader() {
        const header = document.querySelector('.site-header') || document.getElementById('site-header');
        if (!header || document.body.classList.contains('auth-page')) return;

        header.className = 'site-header';
        header.innerHTML = `
            <nav class="navbar navbar-expand-lg site-navbar">
                <div class="container">
                    <a class="navbar-brand brand" href="index.html">
                        <img class="site-logo" src="${HLUV_CONFIG.logoPath}" alt="Logo ĐH Hoa Lư" onerror="this.style.display='none'">
                        <span>Tạp chí ĐH Hoa Lư</span>
                    </a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Mở menu">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="mainNavbar">
                        <ul class="navbar-nav mx-lg-auto mb-2 mb-lg-0 nav-links">
                            ${HLUV_CONFIG.navItems.map((item) => `
                                <li class="nav-item">
                                    <a class="nav-link ${isActive(item.href) ? 'active' : ''}" href="${item.href}">${item.label}</a>
                                </li>
                            `).join('')}
                        </ul>
                        <div class="actions d-flex align-items-center gap-2">
                            <button class="chip" id="theme-toggle" type="button">Dark Mode</button>
                            <div class="auth-area">${authMarkup()}</div>
                        </div>
                    </div>
                </div>
            </nav>
        `;

        const shortcut = header.querySelector('#profile-shortcut');
        if (shortcut) {
            shortcut.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }
        HluvHelpers.initThemeToggle();
    }

    window.HluvHeader = { render: renderHeader };
    document.addEventListener('DOMContentLoaded', renderHeader);
})();
