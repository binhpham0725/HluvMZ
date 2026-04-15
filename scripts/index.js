document.addEventListener('DOMContentLoaded', async () => {
    const heroTitle = document.getElementById('home-hero-title');
    const heroDesc = document.getElementById('home-hero-desc');
    const heroLink = document.getElementById('home-hero-link');
    const latestEl = document.getElementById('latest-posts');
    const trendingEl = document.getElementById('trending-posts');
    const filtersEl = document.getElementById('home-category-filters');
    const postCountEl = document.getElementById('home-post-count');
    const categoryCountEl = document.getElementById('home-category-count');
    const searchInput = document.getElementById('home-search-input');
    const searchBtn = document.getElementById('home-search-btn');
    const postBtn = document.getElementById('home-post-btn');

    function renderQuickCategories() {
        filtersEl.innerHTML = '';
        HLUV_CONFIG.categories.forEach((category) => {
            const link = document.createElement('a');
            link.className = 'chip';
            link.href = `category.html?id=${encodeURIComponent(category.id)}`;
            link.textContent = category.name;
            filtersEl.appendChild(link);
        });
    }

    function renderHero(post) {
        if (!post) return;
        heroTitle.textContent = post.title || 'Website Tạp Chí Đại học Hoa Lư';
        heroDesc.textContent = post.excerpt || HluvUI.truncate(post.content, 180);
        heroLink.href = `article.html?id=${encodeURIComponent(post.id)}`;
    }

    function renderTrending(posts) {
        trendingEl.innerHTML = '';
        const trending = [...posts].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 5);
        if (!trending.length) {
            HluvUI.renderState(trendingEl, 'Chưa có xu hướng.');
            return;
        }
        trending.forEach((post, index) => {
            const item = document.createElement('a');
            item.className = 'trending-row';
            item.href = `article.html?id=${encodeURIComponent(post.id)}`;
            item.innerHTML = `
                <span class="trending-rank">${String(index + 1).padStart(2, '0')}</span>
                <div class="trending-copy">
                    <strong>${HluvUI.escapeHtml(post.title || 'Không có tiêu đề')}</strong>
                    <small>${HluvUI.escapeHtml(post.category || 'Tin tức')}</small>
                </div>
            `;
            trendingEl.appendChild(item);
        });
    }

    function doSearch() {
        const keyword = searchInput.value.trim();
        if (!keyword) return;
        window.location.href = `search.html?q=${encodeURIComponent(keyword)}`;
    }

    renderQuickCategories();
    if (postBtn && !HluvUI.getCurrentUser()) postBtn.href = 'login.html';
    HluvUI.renderState(latestEl, 'Đang tải bài mới...');
    HluvUI.renderState(trendingEl, 'Đang tải xu hướng...');

    try {
        const posts = await HluvPostService.list();
        postCountEl.textContent = posts.length;
        categoryCountEl.textContent = Math.max(0, HLUV_CONFIG.categories.length - 1);
        latestEl.innerHTML = '';

        if (!posts.length) {
            HluvUI.renderState(latestEl, HLUV_MESSAGES.emptyPosts);
            HluvUI.renderState(trendingEl, 'Chưa có xu hướng.');
            return;
        }

        renderHero(posts[0]);
        posts.slice(0, 6).forEach((post) => latestEl.appendChild(HluvUI.renderPostCard(post)));
        renderTrending(posts);
    } catch (error) {
        HluvUI.renderState(latestEl, error.message || HLUV_MESSAGES.loadPostsError, 'error');
        HluvUI.renderState(trendingEl, 'Không tải được xu hướng.', 'error');
        HluvUI.handleError(error, HLUV_MESSAGES.loadPostsError);
    }

    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') doSearch();
    });
});
