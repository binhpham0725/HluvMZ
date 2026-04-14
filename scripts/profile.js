document.addEventListener('DOMContentLoaded', async () => {
    let user = HluvUI.getCurrentUser();
    if (!user) {
        HluvUI.notify(HLUV_MESSAGES.loginRequired, 'error');
        window.location.href = 'login.html';
        return;
    }

    const els = {
        fullname: document.getElementById('fullname'),
        email: document.getElementById('email'),
        profileExtra: document.getElementById('profile-extra'),
        avatar: document.getElementById('avatar'),
        bookmarkCount: document.getElementById('bookmark-count'),
        postCount: document.getElementById('post-count'),
        readCount: document.getElementById('read-count'),
        editProfileBtn: document.getElementById('edit-profile-btn'),
        modal: document.getElementById('edit-profile-modal'),
        editProfileForm: document.getElementById('edit-profile-form'),
        editName: document.getElementById('edit-name'),
        editGender: document.getElementById('edit-gender'),
        editBirthdate: document.getElementById('edit-birthdate'),
        editAvatar: document.getElementById('edit-avatar'),
        editAvatarFile: document.getElementById('edit-avatar-file'),
        editAvatarPreview: document.getElementById('edit-avatar-preview'),
        securityBtn: document.getElementById('security-btn'),
        securityModal: document.getElementById('security-modal'),
        securityCloseBtn: document.getElementById('security-close-btn'),
        securityVerifyForm: document.getElementById('security-verify-form'),
        securityCurrentPassword: document.getElementById('security-current-password'),
        changePasswordForm: document.getElementById('change-password-form'),
        newPassword: document.getElementById('new-password'),
        confirmNewPassword: document.getElementById('confirm-new-password'),
        logoutBtn: document.getElementById('logout-btn')
    };

    let verifiedPassword = '';

    function avatarUrl() {
        return user.avatar || `${HLUV_CONFIG.defaultAvatar}?u=${encodeURIComponent(user.email || user.name || 'guest')}`;
    }

    function renderUser() {
        els.fullname.textContent = user.name || 'Người dùng';
        els.email.textContent = user.email || '';
        const extras = [];
        if (user.gender) extras.push(`Giới tính: ${user.gender}`);
        if (user.birthdate) extras.push(`Ngày sinh: ${HluvUI.formatDate(user.birthdate)}`);
        els.profileExtra.textContent = extras.join(' · ');
        els.avatar.src = avatarUrl();
        els.avatar.onerror = () => {
            els.avatar.src = `${HLUV_CONFIG.defaultAvatar}?u=${encodeURIComponent(user.email || user.name || 'guest')}`;
        };

        const headerAvatar = document.querySelector('.user-area img');
        const headerName = document.querySelector('.user-name');
        if (headerAvatar) headerAvatar.src = els.avatar.src;
        if (headerName) headerName.textContent = user.name || user.email || 'Người dùng';
    }

    async function renderCounts() {
        try {
            const [bookmarks, posts] = await Promise.all([
                HluvBookmarkService.list(user.id),
                HluvPostService.list({ user_id: user.id })
            ]);
            els.bookmarkCount.textContent = bookmarks.length;
            els.postCount.textContent = posts.length;
        } catch (error) {
            HluvUI.handleError(error, 'Không tải được thống kê hồ sơ.');
        }

        const progress = HluvStorage.getJson(HLUV_CONFIG.storageKeys.readProgress, {});
        els.readCount.textContent = Object.keys(progress).length;
    }

    async function updateProfile(event) {
        event.preventDefault();
        const submitBtn = els.editProfileForm.querySelector('button[type="submit"]');
        const payload = {
            id: user.id,
            name: els.editName.value.trim(),
            gender: els.editGender.value.trim(),
            birthdate: els.editBirthdate.value.trim(),
            bio: user.bio || '',
            avatar: els.editAvatar.value.trim() || user.avatar || ''
        };
        if (!payload.name) {
            HluvUI.notify('Tên không được để trống.', 'error');
            return;
        }

        HluvUI.setButtonLoading(submitBtn, true, 'Đang lưu...');
        try {
            const data = await HluvUserService.update(payload);
            user = data.user || { ...user, ...payload };
            HluvUI.setCurrentUser(user);
            renderUser();
            els.modal.classList.remove('active');
            HluvUI.notify(HLUV_MESSAGES.saveProfileSuccess, 'success');
        } catch (error) {
            HluvUI.handleError(error, 'Không cập nhật được hồ sơ.');
        } finally {
            HluvUI.setButtonLoading(submitBtn, false);
        }
    }

    function resetSecurityModal() {
        verifiedPassword = '';
        els.securityVerifyForm.reset();
        els.changePasswordForm.reset();
        els.securityVerifyForm.hidden = false;
        els.changePasswordForm.hidden = true;
    }

    async function verifyCurrentPassword(event) {
        event.preventDefault();
        const password = els.securityCurrentPassword.value.trim();
        const submitBtn = els.securityVerifyForm.querySelector('button[type="submit"]');
        if (!password) {
            HluvUI.notify('Vui lòng nhập mật khẩu hiện tại.', 'error');
            return;
        }

        HluvUI.setButtonLoading(submitBtn, true, 'Đang xác minh...');
        try {
            await HluvUserService.verifyPassword(user.id, password);
            verifiedPassword = password;
            els.securityVerifyForm.hidden = true;
            els.changePasswordForm.hidden = false;
            els.newPassword.focus();
            HluvUI.notify(HLUV_MESSAGES.passwordVerified, 'success');
        } catch (error) {
            HluvUI.handleError(error, 'Mật khẩu hiện tại không đúng.');
        } finally {
            HluvUI.setButtonLoading(submitBtn, false);
        }
    }

    async function changePassword(event) {
        event.preventDefault();
        const newPassword = els.newPassword.value.trim();
        const confirmNewPassword = els.confirmNewPassword.value.trim();
        const submitBtn = els.changePasswordForm.querySelector('button[type="submit"]');

        if (!verifiedPassword) {
            HluvUI.notify('Vui lòng xác minh mật khẩu hiện tại trước.', 'error');
            resetSecurityModal();
            return;
        }
        if (newPassword.length < 6) {
            HluvUI.notify('Mật khẩu mới tối thiểu 6 ký tự.', 'error');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            HluvUI.notify(HLUV_MESSAGES.passwordMismatch, 'error');
            return;
        }

        HluvUI.setButtonLoading(submitBtn, true, 'Đang cập nhật...');
        try {
            await HluvUserService.changePassword(user.id, verifiedPassword, newPassword);
            els.securityModal.classList.remove('active');
            resetSecurityModal();
            HluvUI.notify(HLUV_MESSAGES.passwordChangeSuccess, 'success');
        } catch (error) {
            HluvUI.handleError(error, HLUV_MESSAGES.passwordChangeFailed);
        } finally {
            HluvUI.setButtonLoading(submitBtn, false);
        }
    }

    els.editProfileBtn.addEventListener('click', () => {
        els.editName.value = user.name || '';
        els.editGender.value = user.gender || '';
        els.editBirthdate.value = user.birthdate || '';
        els.editAvatar.value = user.avatar || '';
        els.editAvatarPreview.src = avatarUrl();
        els.editAvatarPreview.style.display = 'block';
        els.modal.classList.add('active');
    });

    els.editAvatar.addEventListener('input', () => {
        els.editAvatarPreview.src = els.editAvatar.value.trim() || avatarUrl();
        els.editAvatarPreview.style.display = 'block';
    });

    els.editAvatarFile.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const dataUrl = await HluvUI.imageFileToDataUrl(file, 420, 0.82);
        els.editAvatar.value = dataUrl;
        els.editAvatarPreview.src = dataUrl;
        els.editAvatarPreview.style.display = 'block';
    });

    els.editProfileForm.addEventListener('submit', updateProfile);
    els.securityBtn.addEventListener('click', () => {
        resetSecurityModal();
        els.securityModal.classList.add('active');
        els.securityCurrentPassword.focus();
    });
    els.securityCloseBtn.addEventListener('click', () => {
        els.securityModal.classList.remove('active');
        resetSecurityModal();
    });
    els.securityVerifyForm.addEventListener('submit', verifyCurrentPassword);
    els.changePasswordForm.addEventListener('submit', changePassword);
    els.logoutBtn.addEventListener('click', () => {
        if (!confirm(HLUV_MESSAGES.confirmLogout)) return;
        HluvUI.clearCurrentUser();
        window.location.href = 'login.html';
    });

    window.setGravatarAvatar = function setGravatarAvatar() {
        const avatar = `${HLUV_CONFIG.defaultAvatar}?u=${encodeURIComponent(user.email || user.id)}`;
        els.editAvatar.value = avatar;
        els.editAvatarPreview.src = avatar;
        els.editAvatarPreview.style.display = 'block';
    };

    renderUser();
    renderCounts();
});
