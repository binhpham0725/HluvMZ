(function () {
    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function truncate(value, length = 140) {
        const text = String(value || '').trim();
        return text.length > length ? `${text.slice(0, length).trim()}...` : text;
    }

    function formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('vi-VN');
    }

    function renderState(target, message, type = 'muted') {
        if (!target) return;
        target.innerHTML = `<p class="ui-state ui-state-${escapeHtml(type)}">${escapeHtml(message)}</p>`;
    }

    function setButtonLoading(button, isLoading, loadingText = 'Đang xử lý...') {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
            button.disabled = true;
            return;
        }
        button.textContent = button.dataset.originalText || button.textContent;
        delete button.dataset.originalText;
        button.disabled = false;
    }

    function notify(message, type = 'info') {
        let toast = document.getElementById('app-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'app-toast';
            document.body.appendChild(toast);
        }
        toast.className = `app-toast app-toast-${type}`;
        toast.textContent = message;
        window.clearTimeout(toast._hideTimer);
        toast._hideTimer = window.setTimeout(() => {
            toast.className = 'app-toast';
            toast.textContent = '';
        }, 2800);
    }

    function handleError(error, fallbackMessage) {
        console.error(error);
        notify(error?.message || fallbackMessage || HLUV_MESSAGES.networkError, 'error');
    }

    function isAdminUser(user) {
        return Boolean(user && (
            String(user.role || '').toLowerCase() === 'admin'
            || String(user.email || '').toLowerCase() === 'admin@webtapchi.local'
        ));
    }

    const ranks = {
        'Vô Gia Cư': { icon: '👩‍🦽', label: 'Vô Gia Cư', minXp: 0 },
        'Bần Nông': { icon: '🌱', label: 'Bần Nông', minXp: 0 },
        'Thường Dân': { icon: '🧑‍🌾', label: 'Thường Dân', minXp: 20 },
        'Học Sĩ': { icon: '🎓', label: 'Học Sĩ', minXp: 50 },
        'Quý Tộc': { icon: '🏰', label: 'Quý Tộc', minXp: 100 },
        'Vương Giả': { icon: '👑', label: 'Vương Giả', minXp: 200 }
    };

    function rankFromXp(xp) {
        const value = Number(xp) || 0;
        if (value < 20) return 'Bần Nông';
        if (value < 50) return 'Thường Dân';
        if (value < 100) return 'Học Sĩ';
        if (value < 200) return 'Quý Tộc';
        return 'Vương Giả';
    }

    function getRankInfo(user) {
        if (isAdminUser(user)) return { icon: '', label: 'admin', className: 'rank-admin' };
        const name = user?.rank || rankFromXp(user?.xp || 0);
        return ranks[name] || ranks['Bần Nông'];
    }

    function rankBadgeMarkup(user, extraClass = '') {
        const info = getRankInfo(user);
        if (isAdminUser(user)) return '<span class="rank-badge rank-admin">admin</span>';
        return `<span class="rank-badge ${extraClass}">${escapeHtml(info.icon)} ${escapeHtml(info.label)}</span>`;
    }

    function applyTheme(theme) {
        const next = theme || localStorage.getItem(HLUV_CONFIG.storageKeys.theme) || 'light';
        document.documentElement.setAttribute('data-theme', next);
        document.querySelectorAll('#theme-toggle').forEach((button) => {
            button.textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
        });
    }

    function initThemeToggle() {
        applyTheme();
        document.querySelectorAll('#theme-toggle').forEach((button) => {
            button.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme') || 'light';
                const next = current === 'dark' ? 'light' : 'dark';
                localStorage.setItem(HLUV_CONFIG.storageKeys.theme, next);
                applyTheme(next);
            });
        });
    }

    function initBackTop() {
        const backTop = document.getElementById('back-top');
        const progress = document.getElementById('reading-progress');
        if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => {
            if (backTop) backTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
            if (progress) {
                const max = document.body.scrollHeight - window.innerHeight;
                const ratio = max > 0 ? window.scrollY / max : 0;
                progress.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
            }
        });
    }

    async function imageFileToDataUrl(file, maxSize = 640, quality = 0.82) {
        if (!file) return '';
        const raw = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        if (!String(file.type || '').startsWith('image/')) return raw;

        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = raw;
        });
        const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', quality);
    }

    function renderBubbles(container, count = 35) {
        const target = typeof container === 'string' ? document.querySelector(container) : container;
        if (!target) return;
        target.innerHTML = '';
        for (let i = 0; i < count; i += 1) {
            const bubble = document.createElement('span');
            const size = Math.random() * 80 + 20;
            bubble.className = 'bubble';
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${Math.random() * 100}%`;
            bubble.style.animationDuration = `${15 + Math.random() * 15}s`;
            bubble.style.animationDelay = `${Math.random() * 10}s`;
            target.appendChild(bubble);
        }
    }

    window.HluvHelpers = {
        escapeHtml,
        truncate,
        formatDate,
        renderState,
        setButtonLoading,
        notify,
        handleError,
        isAdminUser,
        ranks,
        rankFromXp,
        getRankInfo,
        rankBadgeMarkup,
        applyTheme,
        initThemeToggle,
        initBackTop,
        imageFileToDataUrl,
        renderBubbles
    };

    window.HluvUI = {
        getCurrentUser: () => HluvStorage.getCurrentUser(),
        setCurrentUser: (user) => HluvStorage.setCurrentUser(user),
        clearCurrentUser: () => HluvStorage.clearCurrentUser(),
        escapeHtml,
        truncate,
        formatDate,
        renderPostCard: (post, options) => window.HluvArticleCard.render(post, options),
        renderState,
        setButtonLoading,
        notify,
        handleError,
        isAdminUser,
        ranks,
        rankFromXp,
        getRankInfo,
        rankBadgeMarkup,
        renderBubbles,
        validateRequired: (values) => HluvValidators.required(values),
        isEmail: (value) => HluvValidators.email(value),
        isAccountName: (value) => HluvValidators.accountName(value),
        applyTheme,
        imageFileToDataUrl
    };

    document.addEventListener('DOMContentLoaded', () => {
        initThemeToggle();
        initBackTop();
    });
})();
