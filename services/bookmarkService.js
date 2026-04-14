(function () {
    const service = {
        list(userId) {
            return HluvApi.request('bookmarks.php', { action: 'list', user_id: userId });
        },
        check(userId, postId) {
            return HluvApi.request('bookmarks.php', { action: 'check', user_id: userId, post_id: postId });
        },
        toggle(userId, postId) {
            return HluvApi.request('bookmarks.php', { action: 'toggle' }, { method: 'POST', body: { user_id: userId, post_id: postId } });
        }
    };

    window.HluvBookmarkService = service;
    window.HluvApi.bookmarks = service;
})();
