(function () {
    const service = {
        login(email, password) {
            return HluvApi.request('users.php', { action: 'login' }, { method: 'POST', body: { email, password } });
        },
        register(payload) {
            return HluvApi.request('users.php', { action: 'register' }, { method: 'POST', body: payload });
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
