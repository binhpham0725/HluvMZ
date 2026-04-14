document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    function showTab(tab) {
        const isLogin = tab === 'login';
        tabLogin.classList.toggle('active', isLogin);
        tabRegister.classList.toggle('active', !isLogin);
        loginForm.style.display = isLogin ? 'block' : 'none';
        registerForm.style.display = isLogin ? 'none' : 'block';
    }

    tabLogin.addEventListener('click', () => showTab('login'));
    tabRegister.addEventListener('click', () => showTab('register'));
    HluvUI.renderBubbles('.bubble-container', 30);

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const email = document.getElementById('email-login').value.trim();
        const password = document.getElementById('password-login').value.trim();

        if (!HluvUI.validateRequired([email, password])) return HluvUI.notify(HLUV_MESSAGES.requiredFields, 'error');
        if (!HluvUI.isEmail(email)) return HluvUI.notify(HLUV_MESSAGES.invalidEmail, 'error');

        HluvUI.setButtonLoading(submitBtn, true, 'Đang đăng nhập...');
        try {
            const data = await HluvApi.users.login(email, password);
            HluvUI.setCurrentUser(data.user);
            HluvUI.notify(HLUV_MESSAGES.loginSuccess, 'success');
            window.location.href = 'profile.html';
        } catch (error) {
            HluvUI.handleError(error, HLUV_MESSAGES.loginFailed);
        } finally {
            HluvUI.setButtonLoading(submitBtn, false);
        }
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const name = document.getElementById('name-register').value.trim();
        const email = document.getElementById('email-register').value.trim();
        const gender = document.getElementById('gender-register').value.trim();
        const birthdate = document.getElementById('birthdate-register').value.trim();
        const password = document.getElementById('password-register').value.trim();
        const confirm = document.getElementById('confirm-password-register').value.trim();

        if (!HluvUI.validateRequired([name, email, gender, birthdate, password, confirm])) return HluvUI.notify(HLUV_MESSAGES.requiredFields, 'error');
        if (!HluvUI.isAccountName(name)) return HluvUI.notify(HLUV_MESSAGES.invalidAccountName, 'error');
        if (!HluvUI.isEmail(email)) return HluvUI.notify(HLUV_MESSAGES.invalidEmail, 'error');
        if (password !== confirm) return HluvUI.notify(HLUV_MESSAGES.passwordMismatch, 'error');

        HluvUI.setButtonLoading(submitBtn, true, 'Đang đăng ký...');
        try {
            await HluvApi.users.register({
                name,
                email,
                password,
                gender,
                birthdate,
                avatar: `${HLUV_CONFIG.defaultAvatar}?u=${encodeURIComponent(email)}`
            });
            const loginData = await HluvApi.users.login(email, password);
            HluvUI.setCurrentUser(loginData.user);
            HluvUI.notify(HLUV_MESSAGES.registerSuccess, 'success');
            window.location.href = 'profile.html';
        } catch (error) {
            HluvUI.handleError(error, HLUV_MESSAGES.registerFailed);
        } finally {
            HluvUI.setButtonLoading(submitBtn, false);
        }
    });

    if (HluvUI.getCurrentUser()) {
        window.location.href = 'profile.html';
    }
});
