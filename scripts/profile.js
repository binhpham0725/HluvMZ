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
        avatarWrap: document.getElementById('profile-avatar-wrap'),
        avatar: document.getElementById('avatar'),
        adminBadge: document.getElementById('profile-admin-badge'),
        rankBadge: document.getElementById('profile-rank-badge'),
        rankSummary: document.getElementById('rank-summary'),
        rankProgressBar: document.getElementById('rank-progress-bar'),
        rankProgressText: document.getElementById('rank-progress-text'),
        rankMissions: document.getElementById('rank-missions'),
        rankPanel: document.getElementById('rank-panel'),
        adminRankLink: document.getElementById('admin-rank-link'),
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

    function userReadProgress() {
        return HluvStorage.getJson(HLUV_CONFIG.storageKeys.readProgress, {});
    }

    function userActivityDays() {
        const days = HluvStorage.getJson(`${HLUV_CONFIG.storageKeys.currentUser}-${user.id}-activity-days`, []);
        return Array.isArray(days) ? days.length : 0;
    }

    function readCategories(progress) {
        return new Set(Object.values(progress).map((item) => item?.category).filter(Boolean)).size;
    }

    function missionItem(done, text) {
        return `<li class="${done ? 'done' : ''}"><span>${done ? '✓' : '•'}</span>${HluvUI.escapeHtml(text)}</li>`;
    }

    function renderRankMissions(stats, readCount) {
        if (!els.rankMissions) return;
        const progress = userReadProgress();
        const categories = readCategories(progress);
        const searches = Number(localStorage.getItem(`${HLUV_CONFIG.storageKeys.currentUser}-${user.id}-search-count`) || 0);
        const edited = Number(localStorage.getItem(`${HLUV_CONFIG.storageKeys.currentUser}-${user.id}-edited-post`) || 0);
        const activeDays = userActivityDays();
        const levels = [
            {
                title: '🌱 Bần Nông',
                desc: 'Người mới bước vào thế giới tri thức',
                items: [
                    [true, 'Đăng nhập lần đầu'],
                    [readCount >= 3, `Đọc 3 bài bất kỳ (${readCount}/3)`],
                    [searches >= 1, `Tìm kiếm 1 lần (${searches}/1)`],
                ]
            },
            {
                title: '🧑‍🌾 Thường Dân',
                desc: 'Bắt đầu quan tâm nội dung',
                items: [
                    [stats.bookmarks >= 3, `Bookmark 3 bài (${stats.bookmarks}/3)`],
                    [categories >= 2, `Đọc bài thuộc ≥ 2 chuyên mục (${categories}/2)`],
                    [stats.likes >= 5, `Like 5 bài (${stats.likes}/5)`],
                ]
            },
            {
                title: '🎓 Học Sĩ',
                desc: 'Người bắt đầu tạo giá trị',
                items: [
                    [stats.posts >= 1, `Đăng bài đầu tiên (${stats.posts}/1)`],
                    [edited >= 1, `Sửa bài viết (${edited}/1)`],
                    [stats.max_post_views >= 5, `Đạt ≥ 5 lượt xem bài (${stats.max_post_views}/5)`],
                ]
            },
            {
                title: '🏰 Quý Tộc',
                desc: 'Người có ảnh hưởng',
                items: [
                    [stats.posts >= 5, `Đăng 5 bài (${stats.posts}/5)`],
                    [stats.max_post_views >= 10, `1 bài được ≥ 10 lượt xem (${stats.max_post_views}/10)`],
                    [stats.received_bookmarks >= 1, `Có người bookmark bài của mình (${stats.received_bookmarks}/1)`],
                ]
            },
            {
                title: '👑 Vương Giả',
                desc: 'Top creator của hệ thống',
                items: [
                    [stats.posts >= 10, `Đăng 10 bài (${stats.posts}/10)`],
                    [stats.max_post_views >= 10, `1 bài trending (${stats.max_post_views}/10 views)`],
                    [activeDays >= 7, `Hoạt động ≥ 7 ngày (${activeDays}/7)`],
                ]
            }
        ];

        els.rankMissions.innerHTML = levels.map((level) => `
            <article class="mission-card">
                <h4>${HluvUI.escapeHtml(level.title)}</h4>
                <p>${HluvUI.escapeHtml(level.desc)}</p>
                <ul>${level.items.map(([done, text]) => missionItem(done, text)).join('')}</ul>
            </article>
        `).join('');
    }

    function renderRankSummary(stats = {}) {
        const isAdmin = HluvUI.isAdminUser(user);
        const rankInfo = HluvUI.getRankInfo(user);
        if (els.adminRankLink) els.adminRankLink.hidden = !isAdmin;
        if (els.rankBadge) {
            els.rankBadge.hidden = isAdmin;
            els.rankBadge.innerHTML = isAdmin ? '' : `${HluvUI.escapeHtml(rankInfo.icon)} ${HluvUI.escapeHtml(rankInfo.label)}`;
        }
        if (els.rankPanel) els.rankPanel.hidden = isAdmin;
        if (isAdmin) return;

        const xp = Number(user.xp || 0);
        const nextMap = { 'Bần Nông': 20, 'Thường Dân': 50, 'Học Sĩ': 100, 'Quý Tộc': 200, 'Vương Giả': 200, 'Vô Gia Cư': 20, 'Lọ Vương': 200 };
        const next = nextMap[rankInfo.label] || 20;
        const pct = ['Vương Giả', 'Lọ Vương'].includes(rankInfo.label) ? 100 : Math.min(100, Math.round((xp / next) * 100));
        if (els.rankSummary) els.rankSummary.innerHTML = `${HluvUI.escapeHtml(rankInfo.icon)} ${HluvUI.escapeHtml(rankInfo.label)}`;
        if (els.rankProgressBar) els.rankProgressBar.style.width = `${pct}%`;
        if (els.rankProgressText) {
            els.rankProgressText.textContent = user.rank_manual ? `${xp} XP · cấp do admin thiết lập` : `${xp} XP · mốc tiếp theo ${next} XP`;
        }
        const readCount = Object.keys(userReadProgress()).length;
        renderRankMissions(stats, readCount);
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
        const isAdmin = HluvUI.isAdminUser(user);
        els.avatarWrap?.classList.toggle('admin-avatar', isAdmin);
        if (els.adminBadge) els.adminBadge.hidden = !isAdmin;
        renderRankSummary();

        const headerArea = document.querySelector('.user-area');
        const headerAvatarFrame = document.querySelector('.user-area .avatar-frame');
        const headerAvatar = document.querySelector('.user-area img');
        const headerName = document.querySelector('.user-name');
        const headerRank = document.querySelector('.user-area .rank-badge');
        headerArea?.classList.toggle('admin-user', isAdmin);
        headerAvatarFrame?.classList.toggle('admin-avatar', isAdmin);
        if (headerAvatar) headerAvatar.src = els.avatar.src;
        if (headerName) headerName.textContent = user.name || user.email || 'Người dùng';
        if (headerRank && !isAdmin) headerRank.innerHTML = HluvUI.rankBadgeMarkup(user).replace(/<[^>]*>/g, '');
    }

    async function renderCounts() {
        try {
            const [bookmarks, posts] = await Promise.all([
                HluvBookmarkService.list(user.id),
                HluvPostService.list({ user_id: user.id })
            ]);
            els.bookmarkCount.textContent = bookmarks.length;
            els.postCount.textContent = posts.length;
            const stats = await HluvUserService.stats(user.id);
            renderRankSummary(stats);
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
        if (!HluvUI.isAccountName(payload.name)) {
            HluvUI.notify(HLUV_MESSAGES.invalidAccountName, 'error');
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
    els.logoutBtn.addEventListener('click', async () => {
        if (!confirm(HLUV_MESSAGES.confirmLogout)) return;
        await HluvAuthService.logout();
    });

    window.setGravatarAvatar = function setGravatarAvatar() {
        const avatar = `${HLUV_CONFIG.defaultAvatar}?u=${encodeURIComponent(user.email || user.id)}`;
        els.editAvatar.value = avatar;
        els.editAvatarPreview.src = avatar;
        els.editAvatarPreview.style.display = 'block';
    };

    try {
        user = await HluvUserService.profile(user.id);
        HluvUI.setCurrentUser(user);
    } catch (error) {
        HluvUI.handleError(error, 'Không tải được cấp bậc mới nhất.');
    }
    renderUser();
    renderCounts();
});
