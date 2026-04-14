document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('magazine-list');
    const categorySelect = document.getElementById('magazine-category');
    const sortSelect = document.getElementById('magazine-sort');
    const loadMoreBtn = document.getElementById('magazine-load-more');
    const countEl = document.getElementById('magazine-count');
    let posts = [];
    let page = 1;
    const pageSize = 6;

    function renderCategoryOptions() {
        HLUV_CONFIG.categories
            .filter((category) => category.name !== 'Tất cả')
            .forEach((category) => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
    }

    function sortedPosts() {
        const category = categorySelect.value;
        const filtered = posts.filter((post) => category === 'Tất cả' || post.category === category);
        return filtered.sort((a, b) => {
            if (sortSelect.value === 'popular') return Number(b.views || 0) - Number(a.views || 0);
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
    }

    function renderList(append = false) {
        const items = sortedPosts();
        const visible = items.slice(0, page * pageSize);
        countEl.textContent = `${items.length} bài viết`;
        if (!append) listEl.innerHTML = '';
        if (!visible.length) {
            HluvUI.renderState(listEl, 'Không có bài viết phù hợp.');
            loadMoreBtn.style.display = 'none';
            return;
        }

        listEl.innerHTML = '';
        visible.forEach((post) => listEl.appendChild(HluvUI.renderPostCard(post, { className: 'magazine-card' })));
        loadMoreBtn.style.display = items.length > visible.length ? 'inline-flex' : 'none';
    }

    function resetAndRender() {
        page = 1;
        renderList(false);
    }

    renderCategoryOptions();
    HluvUI.renderState(listEl, 'Đang tải toàn bộ bài viết...');
    loadMoreBtn.style.display = 'none';

    try {
        posts = await HluvPostService.list();
        resetAndRender();
    } catch (error) {
        countEl.textContent = '';
        HluvUI.renderState(listEl, error.message || HLUV_MESSAGES.loadPostsError, 'error');
        HluvUI.handleError(error, HLUV_MESSAGES.loadPostsError);
    }

    categorySelect.addEventListener('change', resetAndRender);
    sortSelect.addEventListener('change', resetAndRender);
    loadMoreBtn.addEventListener('click', () => {
        page += 1;
        renderList(true);
    });
});
