document.addEventListener('DOMContentLoaded', async () => {
    const admin = HluvUI.getCurrentUser();
    const list = document.getElementById('rank-admin-list');
    const rankOptions = ['auto', 'Vô Gia Cư', 'Bần Nông', 'Thường Dân', 'Học Sĩ', 'Quý Tộc', 'Vương Giả'];

    if (!admin || !HluvUI.isAdminUser(admin)) {
        HluvUI.notify('Chỉ admin mới được vào trang quản lý cấp bậc.', 'error');
        window.location.href = 'profile.html';
        return;
    }

    function optionLabel(rank) {
        if (rank === 'auto') return 'Tự động theo XP';
        const info = HluvUI.ranks[rank] || { icon: '', label: rank };
        return `${info.icon} ${info.label}`;
    }

    function renderUserRow(user) {
        const isAdminRow = HluvUI.isAdminUser(user);
        const row = document.createElement('article');
        row.className = 'rank-admin-row';
        const avatar = user.avatar || `${HLUV_CONFIG.defaultAvatar}?u=${encodeURIComponent(user.email || user.id)}`;
        const rankInfo = HluvUI.getRankInfo(user);
        row.innerHTML = `
            <img src="${HluvUI.escapeHtml(avatar)}" alt="" onerror="this.src='${HLUV_CONFIG.defaultAvatar}'">
            <div class="rank-admin-copy">
                <strong>${HluvUI.escapeHtml(user.name || user.email || 'Người dùng')}</strong>
                <small>${HluvUI.escapeHtml(user.email || '')}</small>
                <span class="rank-badge">${isAdminRow ? 'admin' : `${HluvUI.escapeHtml(rankInfo.icon)} ${HluvUI.escapeHtml(rankInfo.label)}`}</span>
            </div>
            <div class="rank-admin-meta">
                <span>${Number(user.xp || 0)} XP</span>
                <span>${Number(user.rank_manual || 0) ? 'Admin đặt tay' : 'Tự động'}</span>
            </div>
            <form class="rank-admin-form">
                <select ${isAdminRow ? 'disabled' : ''}>
                    ${rankOptions.map((rank) => `<option value="${HluvUI.escapeHtml(rank)}" ${rank === (Number(user.rank_manual || 0) ? user.rank : 'auto') ? 'selected' : ''}>${HluvUI.escapeHtml(optionLabel(rank))}</option>`).join('')}
                </select>
                <button class="btn btn-small" type="submit" ${isAdminRow ? 'disabled' : ''}>Lưu</button>
            </form>
        `;

        row.querySelector('form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = row.querySelector('button');
            const rank = row.querySelector('select').value;
            HluvUI.setButtonLoading(button, true, 'Đang lưu...');
            try {
                await HluvUserService.updateRank(admin.id, user.id, rank);
                HluvUI.notify('Đã cập nhật cấp bậc.', 'success');
                await loadUsers();
            } catch (error) {
                HluvUI.handleError(error, 'Không cập nhật được cấp bậc.');
            } finally {
                HluvUI.setButtonLoading(button, false);
            }
        });

        return row;
    }

    async function loadUsers() {
        HluvUI.renderState(list, 'Đang tải danh sách tài khoản...');
        try {
            const users = await HluvUserService.list(admin.id);
            list.innerHTML = '';
            users.forEach((user) => list.appendChild(renderUserRow(user)));
        } catch (error) {
            HluvUI.renderState(list, 'Không tải được danh sách tài khoản.', 'error');
            HluvUI.handleError(error, 'Không tải được danh sách tài khoản.');
        }
    }

    loadUsers();
});
