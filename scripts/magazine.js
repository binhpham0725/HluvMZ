document.addEventListener('DOMContentLoaded', async () => {
    const coverEl = document.getElementById('magazine-cover');
    const picksEl = document.getElementById('editor-picks');
    const sectionsEl = document.getElementById('magazine-sections');

    function openArticle(id) {
        window.location.href = `article.html?id=${encodeURIComponent(id)}`;
    }

    function coverMarkup(post) {
        const image = post.image_url || HLUV_CONFIG.placeholderImage;
        return `
            <article class="magazine-cover-card" data-id="${HluvUI.escapeHtml(post.id)}">
                <img src="${HluvUI.escapeHtml(image)}" alt="${HluvUI.escapeHtml(post.title || '')}" onerror="this.src='${HLUV_CONFIG.placeholderImage}'">
                <div>
                    <p class="story-meta">${HluvUI.escapeHtml(post.category || 'Tin tức')}</p>
                    <h3>${HluvUI.escapeHtml(post.title || 'Không có tiêu đề')}</h3>
                    <p>${HluvUI.escapeHtml(post.excerpt || HluvUI.truncate(post.content, 220))}</p>
                    <button class="btn primary" type="button">Đọc bài cover</button>
                </div>
            </article>
        `;
    }

    function pickMarkup(post, index) {
        return `
            <button class="editor-pick" type="button" data-id="${HluvUI.escapeHtml(post.id)}">
                <span>${String(index + 1).padStart(2, '0')}</span>
                <strong>${HluvUI.escapeHtml(post.title || 'Không có tiêu đề')}</strong>
            </button>
        `;
    }

    function sectionMarkup(category, posts) {
        return `
            <section class="magazine-section">
                <div class="section-heading">
                    <div>
                        <p class="story-meta">${HluvUI.escapeHtml(category)}</p>
                        <h3>${HluvUI.escapeHtml(category)}</h3>
                    </div>
                    <a class="chip" href="category.html?id=${encodeURIComponent(HLUV_CONFIG.categories.find((item) => item.name === category)?.id || '0')}">Xem chuyên mục</a>
                </div>
                <div class="related-grid">
                    ${posts.map((post) => HluvUI.renderPostCard(post, { className: 'cardsmall', compact: true }).outerHTML).join('')}
                </div>
            </section>
        `;
    }

    HluvUI.renderState(coverEl, 'Đang dàn trang magazine...');
    HluvUI.renderState(picksEl, 'Đang tải lựa chọn...');
    HluvUI.renderState(sectionsEl, 'Đang tải chuyên mục...');

    try {
        const posts = await HluvPostService.list();
        if (!posts.length) {
            HluvUI.renderState(coverEl, HLUV_MESSAGES.emptyPosts);
            HluvUI.renderState(picksEl, 'Chưa có lựa chọn.');
            HluvUI.renderState(sectionsEl, 'Chưa có chuyên mục.');
            return;
        }

        coverEl.innerHTML = coverMarkup(posts[0]);
        picksEl.innerHTML = posts.slice(1, 5).map(pickMarkup).join('') || '<p class="ui-state">Chưa có bài phụ.</p>';

        const sectionHtml = HLUV_CONFIG.categories
            .filter((category) => category.name !== 'Tất cả')
            .map((category) => {
                const items = posts.filter((post) => post.category === category.name).slice(0, 4);
                return items.length ? sectionMarkup(category.name, items) : '';
            })
            .filter(Boolean)
            .join('');
        sectionsEl.innerHTML = sectionHtml || '<p class="ui-state">Chưa có dữ liệu chuyên mục.</p>';

        document.querySelectorAll('[data-id]').forEach((item) => {
            item.addEventListener('click', () => openArticle(item.dataset.id));
        });
    } catch (error) {
        HluvUI.renderState(coverEl, error.message || HLUV_MESSAGES.loadPostsError, 'error');
        HluvUI.renderState(picksEl, 'Không tải được lựa chọn.', 'error');
        HluvUI.renderState(sectionsEl, 'Không tải được chuyên mục.', 'error');
        HluvUI.handleError(error, HLUV_MESSAGES.loadPostsError);
    }
});
