document.addEventListener('DOMContentLoaded', async () => {
    const user = HluvUI.getCurrentUser();
    if (!user) {
        HluvUI.notify(HLUV_MESSAGES.loginRequired, 'error');
        window.location.href = 'login.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const editId = Number(params.get('id') || 0);
    const els = {
        title: document.getElementById('post-form-title'),
        form: document.getElementById('post-form'),
        postTitle: document.getElementById('post-title'),
        category: document.getElementById('post-category'),
        imageFile: document.getElementById('post-image-file'),
        imageUrl: document.getElementById('post-image-url'),
        imagePreview: document.getElementById('image-preview'),
        content: document.getElementById('post-content')
    };

    async function loadPostForEdit() {
        if (!editId) return;
        els.title.textContent = 'Cập nhật bài viết';
        const submitBtn = els.form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Cập nhật bài';

        try {
            const post = await HluvPostService.get(editId);
            if (Number(post.user_id) !== Number(user.id)) {
                HluvUI.notify('Bạn chỉ có thể sửa bài viết của mình.', 'error');
                window.location.href = 'profile-posts.html';
                return;
            }
            els.postTitle.value = post.title || '';
            els.category.value = post.category || '';
            els.imageUrl.value = post.image_url || '';
            els.content.value = post.content || '';
            if (post.image_url) {
                els.imagePreview.src = post.image_url;
                els.imagePreview.style.display = 'block';
            }
        } catch (error) {
            HluvUI.handleError(error, 'Không tải được bài viết cần sửa.');
        }
    }

    els.imageFile.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const dataUrl = await HluvUI.imageFileToDataUrl(file, 1200, 0.82);
        els.imageUrl.value = dataUrl;
        els.imagePreview.src = dataUrl;
        els.imagePreview.style.display = 'block';
    });

    els.imageUrl.addEventListener('input', () => {
        const url = els.imageUrl.value.trim();
        els.imagePreview.src = url;
        els.imagePreview.style.display = url ? 'block' : 'none';
    });

    els.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitBtn = els.form.querySelector('button[type="submit"]');
        const payload = {
            id: editId,
            user_id: user.id,
            title: els.postTitle.value.trim(),
            category: els.category.value.trim(),
            image_url: els.imageUrl.value.trim(),
            content: els.content.value.trim()
        };

        if (!HluvUI.validateRequired([payload.title, payload.category, payload.content])) {
            HluvUI.notify(HLUV_MESSAGES.requiredFields, 'error');
            return;
        }

        HluvUI.setButtonLoading(submitBtn, true, editId ? 'Đang cập nhật...' : 'Đang đăng...');
        try {
            if (editId) {
                await HluvPostService.update(payload);
                HluvUI.notify(HLUV_MESSAGES.updatePostSuccess, 'success');
            } else {
                await HluvPostService.create(payload);
                HluvUI.notify(HLUV_MESSAGES.createPostSuccess, 'success');
            }
            window.location.href = 'profile-posts.html';
        } catch (error) {
            HluvUI.handleError(error, editId ? 'Không cập nhật được bài viết.' : 'Không đăng được bài viết.');
        } finally {
            HluvUI.setButtonLoading(submitBtn, false);
        }
    });

    loadPostForEdit();
});
