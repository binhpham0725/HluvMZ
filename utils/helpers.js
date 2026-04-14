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

    window.HluvHelpers = {
        escapeHtml,
        truncate,
        formatDate,
        renderState,
        setButtonLoading,
        notify,
        handleError,
        applyTheme,
        initThemeToggle,
        initBackTop,
        imageFileToDataUrl
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
        validateRequired: (values) => HluvValidators.required(values),
        isEmail: (value) => HluvValidators.email(value),
        applyTheme,
        imageFileToDataUrl
    };

    document.addEventListener('DOMContentLoaded', () => {
        initThemeToggle();
        initBackTop();
    });
})();
