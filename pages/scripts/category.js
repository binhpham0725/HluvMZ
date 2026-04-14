document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('id') || '0';
    const selected = HLUV_CONFIG.categories.find((category) => category.id === categoryId)?.name || 'Tất cả';
    const title = document.getElementById('category-title');
    const count = document.getElementById('category-count');
    const section = document.getElementById('articles');
    const tabs = document.getElementById('category-tabs');

    function renderTabs() {
        tabs.innerHTML = '';
        HLUV_CONFIG.categories.forEach((category) => {
            const link = document.createElement('a');
            link.className = 'chip';
            link.href = `category.html?id=${encodeURIComponent(category.id)}`;
            link.textContent = category.name;
            link.classList.toggle('active', category.name === selected);
            tabs.appendChild(link);
        });
    }

    title.textContent = selected === 'Tất cả' ? 'Tất cả tin tức' : selected;
    renderTabs();
    HluvUI.renderState(section, 'Đang tải chuyên mục...');

    try {
        const posts = await HluvApi.posts.list(selected === 'Tất cả' ? {} : { category: selected });
        count.textContent = `${posts.length} bài viết`;
        section.innerHTML = '';
        if (!posts.length) {
            HluvUI.renderState(section, 'Chưa có bài viết trong chuyên mục này.');
            return;
        }
        posts.forEach((post) => section.appendChild(HluvUI.renderPostCard(post)));
    } catch (error) {
        count.textContent = '';
        HluvUI.renderState(section, error.message || HLUV_MESSAGES.loadPostsError, 'error');
        HluvUI.handleError(error, HLUV_MESSAGES.loadPostsError);
    }
});
