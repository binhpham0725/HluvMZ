document.addEventListener('DOMContentLoaded', async () => {
    const articlesEl = document.getElementById('articles');
    const postCountEl = document.getElementById('home-post-count');
    const categoryCountEl = document.getElementById('home-category-count');

    HluvUI.renderState(articlesEl, 'Đang tải bài mới...');
    try {
        const posts = await HluvPostService.list();
        postCountEl.textContent = posts.length;
        categoryCountEl.textContent = Math.max(0, HLUV_CONFIG.categories.length - 1);
        articlesEl.innerHTML = '';

        if (!posts.length) {
            HluvUI.renderState(articlesEl, HLUV_MESSAGES.emptyPosts);
            return;
        }

        posts.slice(0, 3).forEach((post) => articlesEl.appendChild(HluvUI.renderPostCard(post)));
    } catch (error) {
        HluvUI.renderState(articlesEl, error.message || HLUV_MESSAGES.loadPostsError, 'error');
        HluvUI.handleError(error, HLUV_MESSAGES.loadPostsError);
    }
});
