(function () {
    function getJson(key, fallback = null) {
        try {
            return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
        } catch (error) {
            return fallback;
        }
    }

    function setJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    window.HluvStorage = {
        getJson,
        setJson,
        remove(key) {
            localStorage.removeItem(key);
        },
        getCurrentUser() {
            return getJson(HLUV_CONFIG.storageKeys.currentUser, null);
        },
        setCurrentUser(user) {
            setJson(HLUV_CONFIG.storageKeys.currentUser, user);
        },
        clearCurrentUser() {
            localStorage.removeItem(HLUV_CONFIG.storageKeys.currentUser);
        }
    };
})();
