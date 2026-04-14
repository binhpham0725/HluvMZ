document.addEventListener('DOMContentLoaded', () => {
    const result = document.getElementById('search-result');
    const inputSearch = document.getElementById('input-search');
    const btnSearch = document.getElementById('btn-search');

    async function search() {
        const q = inputSearch.value.trim();
        if (!q) {
            HluvUI.renderState(result, 'Nhập từ khóa để bắt đầu tìm kiếm.');
            return;
        }

        HluvUI.renderState(result, 'Đang tìm kiếm...');
        HluvUI.setButtonLoading(btnSearch, true, 'Đang tìm...');
        try {
            const currentUser = HluvUI.getCurrentUser();
            if (currentUser) {
                const key = `${HLUV_CONFIG.storageKeys.currentUser}-${currentUser.id}-search-count`;
                localStorage.setItem(key, String(Number(localStorage.getItem(key) || 0) + 1));
            }
            const posts = await HluvApi.posts.list({ q });
            result.innerHTML = '';
            if (!posts.length) {
                HluvUI.renderState(result, HLUV_MESSAGES.emptySearch);
                return;
            }
            posts.forEach((post) => result.appendChild(HluvUI.renderPostCard(post)));
        } catch (error) {
            HluvUI.renderState(result, error.message || HLUV_MESSAGES.loadPostsError, 'error');
            HluvUI.handleError(error, HLUV_MESSAGES.loadPostsError);
        } finally {
            HluvUI.setButtonLoading(btnSearch, false);
        }
    }

    btnSearch.addEventListener('click', search);
    inputSearch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') search();
    });

    const initialQuery = new URLSearchParams(window.location.search).get('q');
    if (initialQuery) {
        inputSearch.value = initialQuery;
        search();
    } else {
        HluvUI.renderState(result, 'Nhập từ khóa để bắt đầu tìm kiếm.');
    }
});
