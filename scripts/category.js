document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('id') || '0';
    const selected = HLUV_CONFIG.categories.find((category) => category.id === categoryId)?.name || 'Tất cả';
    const title = document.getElementById('category-title');
    const count = document.getElementById('category-count');
    const section = document.getElementById('articles');
    const tabs = document.getElementById('category-tabs');
    const searchInput = document.getElementById('category-search');
    let posts = [];
    let currentCategory = selected;

    function renderTabs() {
        tabs.innerHTML = '';
        HLUV_CONFIG.categories.forEach((category) => {
            const link = document.createElement('a');
            link.className = 'chip';
            link.href = `category.html?id=${encodeURIComponent(category.id)}`;
            link.textContent = category.name;
            link.classList.toggle('active', category.name === currentCategory);
            tabs.appendChild(link);
        });
    }

    function visiblePosts() {
        const keyword = searchInput.value.trim().toLowerCase();
        return posts.filter((post) => {
            const matchCategory = currentCategory === 'Tất cả' || post.category === currentCategory;
            const haystack = `${post.title || ''} ${post.excerpt || ''} ${post.content || ''}`.toLowerCase();
            return matchCategory && (!keyword || haystack.includes(keyword));
        });
    }

    function renderPosts() {
        const items = visiblePosts();
        title.textContent = currentCategory === 'Tất cả' ? 'Tất cả tin tức' : currentCategory;
        count.textContent = `${items.length} bài viết`;
        section.innerHTML = '';
        if (!items.length) {
            HluvUI.renderState(section, 'Không có bài viết phù hợp.');
            return;
        }
        items.forEach((post) => section.appendChild(HluvUI.renderPostCard(post)));
    }

    renderTabs();
    HluvUI.renderState(section, 'Đang tải tin tức...');

    try {
        posts = await HluvApi.posts.list();
        renderPosts();
        searchInput.addEventListener('input', renderPosts);
    } catch (error) {
        count.textContent = '';
        HluvUI.renderState(section, error.message || HLUV_MESSAGES.loadPostsError, 'error');
        HluvUI.handleError(error, HLUV_MESSAGES.loadPostsError);
    }
});
