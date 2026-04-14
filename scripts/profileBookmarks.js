document.addEventListener('DOMContentLoaded', async () => {
    const user = HluvUI.getCurrentUser();
    if (!user) {
        HluvUI.notify(HLUV_MESSAGES.loginRequired, 'error');
        window.location.href = 'login.html';
        return;
    }

    const list = document.getElementById('bookmark-list');
    HluvUI.renderState(list, 'Đang tải bookmark...');
    try {
        const bookmarks = await HluvBookmarkService.list(user.id);
        list.innerHTML = '';
        if (!bookmarks.length) {
            HluvUI.renderState(list, 'Bạn chưa lưu bài viết nào.');
            return;
        }
        bookmarks.forEach((post) => list.appendChild(HluvUI.renderPostCard(post)));
    } catch (error) {
        HluvUI.renderState(list, error.message || 'Không tải được bookmark.', 'error');
        HluvUI.handleError(error, 'Không tải được bookmark.');
    }
});
