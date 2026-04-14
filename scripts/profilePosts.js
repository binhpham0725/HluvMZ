document.addEventListener('DOMContentLoaded', async () => {
    const user = HluvUI.getCurrentUser();
    if (!user) {
        HluvUI.notify(HLUV_MESSAGES.loginRequired, 'error');
        window.location.href = 'login.html';
        return;
    }

    const list = document.getElementById('my-posts');

    function createPostCard(post) {
        const card = HluvUI.renderPostCard(post, { compact: true });
        const actions = document.createElement('div');
        actions.className = 'card-actions';

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
            try {
                await HluvPostService.delete(post.id, user.id);
                HluvUI.notify(HLUV_MESSAGES.deletePostSuccess, 'success');
                loadPosts();
            } catch (error) {
                HluvUI.handleError(error, 'Không xóa được bài viết.');
            }
        });

        actions.append(editBtn, deleteBtn);
        card.querySelector('.story-body').appendChild(actions);
        return card;
    }

    async function loadPosts() {
        HluvUI.renderState(list, 'Đang tải bài viết...');
        try {
            const posts = await HluvPostService.list({ user_id: user.id });
            list.innerHTML = '';
            if (!posts.length) {
                HluvUI.renderState(list, 'Bạn chưa có bài đăng nào. Bấm “Đăng bài” để tạo bài mới.');
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
