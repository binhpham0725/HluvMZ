(function () {
    const service = {
        list(postId) {
            return HluvApi.request('comments.php', { action: 'list', post_id: postId });
        },
        create(payload) {
            return HluvApi.request('comments.php', { action: 'create' }, { method: 'POST', body: payload });
        },
        delete(id, userId) {
            return HluvApi.request('comments.php', { action: 'delete', id, user_id: userId }, { method: 'DELETE' });
        }
    };

    window.HluvCommentService = service;
    window.HluvApi.comments = service;
})();
