document.addEventListener('DOMContentLoaded', () => {
    const user = HluvUI.getCurrentUser();
    if (!user) {
        HluvUI.notify(HLUV_MESSAGES.loginRequired, 'error');
        window.location.href = 'login.html';
        return;
    }

    const list = document.getElementById('read-list');
    const progress = HluvStorage.getJson(HLUV_CONFIG.storageKeys.readProgress, {});
    const reads = Object.entries(progress)
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => new Date(b.readAt || 0) - new Date(a.readAt || 0));

    list.innerHTML = '';
    if (!reads.length) {
        HluvUI.renderState(list, 'Bạn chưa đọc bài viết nào.');
        return;
    }

    reads.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'story-card';
        card.tabIndex = 0;
        card.innerHTML = `
            <img src="${HLUV_CONFIG.placeholderImage}" alt="">
            <div class="story-body">
                <p class="story-meta">Đã đọc</p>
                <h3 class="story-title">${HluvUI.escapeHtml(item.title || `Bài viết #${item.id}`)}</h3>
                <small class="story-date">${HluvUI.escapeHtml(HluvUI.formatDate(item.readAt))}</small>
            </div>
        `;
        const open = () => {
            window.location.href = `article.html?id=${encodeURIComponent(item.id)}`;
        };
        card.addEventListener('click', open);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') open();
        });
        list.appendChild(card);
    });
});
