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
                ${isAdmin ? '' : HluvHelpers.rankBadgeMarkup(user, 'rank-header')}
                <span class="user-name">${HluvHelpers.escapeHtml(user.name || user.email || 'Người dùng')}</span>
            </button>
        `;
    }

    async function refreshCurrentUser() {
        const user = HluvStorage.getCurrentUser();
        if (!user?.id || !window.HluvUserService?.profile) return user;
        try {
            const fresh = await HluvUserService.profile(user.id);
            if (!fresh) return user;
            const merged = { ...user, ...fresh };
            HluvStorage.setCurrentUser(merged);
            return merged;
        } catch (error) {
            console.warn('Không cập nhật được thông tin user cho header.', error);
            return user;
        }
    }

    function notificationMarkup() {
        const user = HluvStorage.getCurrentUser();
        if (!user) return '';
        const isAdmin = HluvHelpers.isAdminUser(user);
        return `
            <div class="notification-wrap">
                <button class="notification-bell" id="notification-toggle" type="button" aria-expanded="false" aria-label="Mở thông báo">
                    <span>🔔</span>
                    <strong id="notification-count" hidden>0</strong>
                </button>
                <section class="notification-panel" id="notification-panel" hidden>
                    <div class="notification-head">
                        <strong>Thông báo</strong>
                        <button type="button" id="notification-close" aria-label="Đóng thông báo">×</button>
                    </div>
                    ${isAdmin ? `
                        <form class="admin-notify-form" id="admin-notify-form">
                            <label for="admin-notify-message">Thông báo từ admin</label>
                            <textarea id="admin-notify-message" rows="2" maxlength="300" placeholder="Nhập tin nhắn gửi toàn hệ thống..."></textarea>
                            <button class="btn btn-small" type="submit">Gửi thông báo</button>
                        </form>
                    ` : ''}
                    <div class="notification-list" id="notification-list">
                        <p class="state">Đang tải thông báo...</p>
                    </div>
                </section>
            </div>
        `;
    }

    function notificationIcon(type) {
        if (type === 'reply') return '↩';
        if (type === 'comment' || type === 'reply_on_post') return '💬';
        if (type === 'like') return '❤';
        if (type === 'admin') return '📣';
        return '🔔';
    }

    function broadcastReadKey(userId) {
        return `${HLUV_CONFIG.storageKeys.currentUser}-${userId}-read-broadcasts`;
    }

    function readBroadcastIds(userId) {
        try {
            return JSON.parse(localStorage.getItem(broadcastReadKey(userId)) || '[]');
        } catch (error) {
            return [];
        }
    }

    function saveBroadcastIds(userId, ids) {
        localStorage.setItem(broadcastReadKey(userId), JSON.stringify([...new Set(ids.map(String).filter(Boolean))]));
    }

    function renderNotificationList(list, user) {
        const box = document.getElementById('notification-list');
        if (!box) return;
        if (!list.length) {
            box.innerHTML = '<p class="state">Chưa có thông báo mới.</p>';
            return;
        }
        box.innerHTML = list.map((item) => {
            const href = item.post_id ? `article.html?id=${encodeURIComponent(item.post_id)}` : '#';
            const linkAttrs = item.post_id ? `href="${href}"` : 'href="#" aria-disabled="true"';
            const readIds = readBroadcastIds(user.id).map(String);
            const unread = !readIds.includes(String(item.id)) && (!item.user_id || !item.is_read);
            return `
                <a class="notification-item ${unread ? 'unread' : ''}" ${linkAttrs}>
                    <span class="notification-icon">${notificationIcon(item.type)}</span>
                    <span>
                        <strong>${HluvHelpers.escapeHtml(item.actor_name || (item.type === 'admin' ? 'Admin' : 'Thông báo'))}</strong>
                        <small>${HluvHelpers.escapeHtml(item.message || 'Bạn có thông báo mới.')}</small>
                        <em>${HluvHelpers.formatDate(item.created_at)}</em>
                    </span>
                </a>
            `;
        }).join('');
    }

    async function loadNotifications(markRead = false) {
        const user = HluvStorage.getCurrentUser();
        const count = document.getElementById('notification-count');
        const box = document.getElementById('notification-list');
        if (!user || !window.HluvApi?.notifications) return;
        try {
            const list = await HluvApi.notifications.list(user.id);
            const readBroadcasts = readBroadcastIds(user.id).map(String);
            const unread = list.filter((item) => {
                if (readBroadcasts.includes(String(item.id))) return false;
                return !item.user_id || !item.is_read;
            }).length;
            if (count) {
                count.hidden = unread <= 0;
                count.textContent = unread > 9 ? '9+' : String(unread);
            }
            renderNotificationList(list, user);
            if (markRead && list.length) {
                const readIds = list.map((item) => String(item.id));
                saveBroadcastIds(user.id, readBroadcasts.concat(readIds));
                await HluvApi.notifications.markRead(user.id).catch((error) => console.warn('Không đánh dấu đã đọc.', error));
                if (count) count.hidden = true;
            }
        } catch (error) {
            if (box) box.innerHTML = '<p class="state error">Không tải được thông báo. Hãy kiểm tra migration Supabase.</p>';
        }
    }

    function initNotifications(header) {
        const user = HluvStorage.getCurrentUser();
        const toggle = header.querySelector('#notification-toggle');
        const panel = header.querySelector('#notification-panel');
        if (!user || !toggle || !panel) return;

        toggle.addEventListener('click', async (event) => {
            event.stopPropagation();
            const nextOpen = panel.hidden;
            panel.hidden = !nextOpen;
            toggle.setAttribute('aria-expanded', String(nextOpen));
            if (nextOpen) await loadNotifications(true);
        });
        header.querySelector('#notification-close')?.addEventListener('click', () => {
            panel.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
        });
        document.addEventListener('click', (event) => {
            if (!panel.hidden && !panel.contains(event.target) && !toggle.contains(event.target)) {
                panel.hidden = true;
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        header.querySelector('#admin-notify-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const textarea = header.querySelector('#admin-notify-message');
            const button = event.currentTarget.querySelector('button[type="submit"]');
            const message = textarea.value.trim();
            if (!message) {
                HluvHelpers.notify('Vui lòng nhập nội dung thông báo.', 'error');
                return;
            }
            HluvHelpers.setButtonLoading(button, true, 'Đang gửi...');
            try {
                await HluvApi.notifications.broadcast(user.id, message);
                textarea.value = '';
                HluvHelpers.notify('Đã gửi thông báo hệ thống.', 'success');
                await loadNotifications(false);
            } catch (error) {
                HluvHelpers.handleError(error, 'Không gửi được thông báo.');
            } finally {
                HluvHelpers.setButtonLoading(button, false);
            }
        });

        loadNotifications(false);
    }

    async function renderHeader() {
        const header = document.querySelector('.site-header') || document.getElementById('site-header');
        if (!header || document.body.classList.contains('auth-page')) return;
        await refreshCurrentUser();
        if (!document.querySelector('.page-bubbles')) {
            header.insertAdjacentHTML('beforebegin', `
                <div class="bubble-container page-bubbles" aria-hidden="true"></div>
            `);
            HluvHelpers.renderBubbles('.page-bubbles', 35);
        }

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
                            ${notificationMarkup()}
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
        initNotifications(header);
        HluvHelpers.initThemeToggle();
    }

    window.HluvHeader = { render: renderHeader };
    document.addEventListener('DOMContentLoaded', renderHeader);
})();
