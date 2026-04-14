(function () {
    const service = {
        list(params = {}) {
            return HluvApi.request('posts.php', { action: 'list', ...params });
        },
        get(id) {
            return HluvApi.request('posts.php', { action: 'get', id });
        },
        create(payload) {
            return HluvApi.request('posts.php', { action: 'create' }, { method: 'POST', body: payload });
        },
        update(payload) {
            return HluvApi.request('posts.php', { action: 'update' }, { method: 'PUT', body: payload });
        },
        delete(id, userId) {
            return HluvApi.request('posts.php', { action: 'delete', id, user_id: userId }, { method: 'DELETE' });
        }
    };

    window.HluvPostService = service;
    window.HluvApi.posts = service;
})();
