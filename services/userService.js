(function () {
    const service = {
        login(email, password) {
            return HluvApi.request('users.php', { action: 'login' }, { method: 'POST', body: { email, password } });
        },
        register(payload) {
            return HluvApi.request('users.php', { action: 'register' }, { method: 'POST', body: payload });
        },
        profile(id) {
            return HluvApi.request('users.php', { action: 'profile', id });
        },
        list(adminId) {
            return HluvApi.request('users.php', { action: 'list', admin_id: adminId });
        },
        stats(userId) {
            return HluvApi.request('users.php', { action: 'stats', user_id: userId });
        },
        addXp(userId, xp) {
            return HluvApi.request('users.php', { action: 'add_xp' }, { method: 'POST', body: { user_id: userId, xp } });
        },
        updateRank(adminId, userId, rank) {
            return HluvApi.request('users.php', { action: 'update_rank' }, { method: 'POST', body: { admin_id: adminId, user_id: userId, rank } });
        },
        remove(adminId, userId) {
            return HluvApi.request('users.php', { action: 'delete', admin_id: adminId, user_id: userId }, { method: 'DELETE' });
        },
        rankCatalog() {
            return HluvApi.request('users.php', { action: 'rank-catalog' });
        },
        update(payload) {
            return HluvApi.request('users.php', { action: 'update' }, { method: 'PUT', body: payload });
        },
        verifyPassword(id, password) {
            return HluvApi.request('users.php', { action: 'verify-password' }, { method: 'POST', body: { id, password } });
        },
        changePassword(id, currentPassword, newPassword) {
            return HluvApi.request('users.php', { action: 'change-password' }, {
                method: 'PUT',
                body: { id, current_password: currentPassword, new_password: newPassword }
            });
        }
    };

    window.HluvUserService = service;
    window.HluvApi.users = service;
})();
