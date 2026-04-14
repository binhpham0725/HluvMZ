document.addEventListener('DOMContentLoaded', async () => {
    const user = HluvUI.getCurrentUser();
    if (!user) {
        HluvUI.notify(HLUV_MESSAGES.loginRequired, 'error');
        window.location.href = 'login.html';
        return;
    }

    const list = document.getElementById('my-posts');
    const isAdmin = HluvUI.isAdminUser(user);
    const title = document.querySelector('h1');
    if (isAdmin && title) title.textContent = 'Quản lý tất cả bài viết';

    function createPostCard(post) {
        const card = HluvUI.renderPostCard(post, { compact: true });
        const actions = document.createElement('div');
        actions.className = 'card-actions';
        const isOwner = Number(post.user_id) === Number(user.id);

        const editBtn = document.createElement('a');
        editBtn.className = 'btn btn-small btn-edit';
        editBtn.href = `post-editor.html?id=${encodeURIComponent(post.id)}`;
        editBtn.textContent = 'Sửa';
        editBtn.addEventListener('click', (event) => event.stopPropagation());

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-small btn-delete';
        deleteBtn.textContent = 'Xóa';
        deleteBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            if (!confirm(HLUV_MESSAGES.confirmDeletePost)) return;
            HluvUI.setButtonLoading(deleteBtn, true, 'Đang xóa...');
            try {
                const result = await HluvPostService.delete(post.id, user.id);
                if (!result.deleted) throw new Error('Không có bài viết nào được xóa.');
                HluvUI.notify(HLUV_MESSAGES.deletePostSuccess, 'success');
                loadPosts();
            } catch (error) {
                HluvUI.handleError(error, 'Không xóa được bài viết.');
            } finally {
                HluvUI.setButtonLoading(deleteBtn, false);
            }
        });

        if (isOwner) actions.appendChild(editBtn);
        if (isAdmin || isOwner) actions.appendChild(deleteBtn);
        card.querySelector('.story-body').appendChild(actions);
        return card;
    }

    async function loadPosts() {
        HluvUI.renderState(list, 'Đang tải bài viết...');
        try {
            const posts = await HluvPostService.list(isAdmin ? {} : { user_id: user.id });
            list.innerHTML = '';
            if (!posts.length) {
                HluvUI.renderState(list, isAdmin ? 'Chưa có bài viết nào để quản lý.' : 'Bạn chưa có bài đăng nào. Bấm “Đăng bài” để tạo bài mới.');
                return;
            }
            posts.forEach((post) => list.appendChild(createPostCard(post)));
        } catch (error) {
            HluvUI.renderState(list, error.message || 'Không tải được bài viết.', 'error');
            HluvUI.handleError(error, 'Không tải được bài viết.');
        }
    }

    loadPosts();
});
