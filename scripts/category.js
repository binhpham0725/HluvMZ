document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('id') || '0';
    const selected = HLUV_CONFIG.categories.find((category) => category.id === categoryId)?.name || 'Tất cả';
    const title = document.getElementById('category-title');
    const count = document.getElementById('category-count');
    const section = document.getElementById('articles');

    title.textContent = selected;
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
