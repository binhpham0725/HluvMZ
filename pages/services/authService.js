(function () {
    window.HluvAuthService = {
        getCurrentUser() {
            return HluvStorage.getCurrentUser();
        },
        setCurrentUser(user) {
            HluvStorage.setCurrentUser(user);
        },
        logout() {
            HluvStorage.clearCurrentUser();
            window.location.href = 'login.html';
        },
        async login(email, password) {
            const data = await HluvUserService.login(email, password);
            HluvStorage.setCurrentUser(data.user);
            return data.user;
        },
        async register(payload) {
            await HluvUserService.register(payload);
            return this.login(payload.email, payload.password);
        }
    };
})();
