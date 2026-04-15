document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const postId = Number(params.get('id'));
    const currentUser = HluvUI.getCurrentUser();

    const els = {
        title: document.getElementById('article-title'),
        category: document.getElementById('article-category'),
        author: document.getElementById('article-author'),
        date: document.getElementById('article-date'),
        readtime: document.getElementById('article-readtime'),
        image: document.getElementById('article-image'),
        content: document.getElementById('article-content'),
        tags: document.getElementById('tag-list'),
        related: document.getElementById('related'),
        bookmarkBtn: document.getElementById('bookmark-btn'),
        likeBtn: document.getElementById('like-btn'),
        likeCount: document.getElementById('like-count'),
        shareBtn: document.getElementById('share-btn'),
        commentForm: document.getElementById('comment-form'),
        commentContent: document.getElementById('comment-content'),
        commentList: document.getElementById('comment-list'),
        commentCount: document.getElementById('comment-count')
    };

    let article = null;
    let replyTarget = null;

    function canManagePost(post) {
        return Boolean(currentUser && post && (
            HluvUI.isAdminUser(currentUser) || Number(currentUser.id) === Number(post.user_id)
        ));
    }

    function canManageComment(comment) {
        return Boolean(currentUser && comment && (
            HluvUI.isAdminUser(currentUser) || Number(currentUser.id) === Number(comment.user_id)
        ));
    }

    async function deleteArticle() {
        if (!article || !canManagePost(article)) return;
        if (!confirm(HLUV_MESSAGES.confirmDeletePost)) return;

        const deleteBtn = document.getElementById('delete-post-btn');
        HluvUI.setButtonLoading(deleteBtn, true, 'Đang xóa...');
        try {
            const result = await HluvPostService.delete(postId, currentUser.id);
            if (!result.deleted) throw new Error('Không có bài viết nào được xóa.');
            HluvUI.notify(HLUV_MESSAGES.deletePostSuccess, 'success');
            window.location.href = 'magazine.html';
        } catch (error) {
            HluvUI.handleError(error, 'Không xóa được bài viết.');
        } finally {
            HluvUI.setButtonLoading(deleteBtn, false);
        }
    }

    function syncArticleActions(post) {
        const existing = document.getElementById('delete-post-btn');
        if (!canManagePost(post)) {
            existing?.remove();
            return;
        }
        if (existing) return;

        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'delete-post-btn';
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-delete';
        deleteBtn.textContent = 'Xóa bài';
        deleteBtn.addEventListener('click', deleteArticle);
        els.shareBtn?.insertAdjacentElement('afterend', deleteBtn);
    }

    function renderArticle(post) {
        const words = String(post.content || '').trim().split(/\s+/).filter(Boolean).length;
        const readMinutes = Math.max(1, Math.ceil(words / 220));
        els.title.textContent = post.title || 'Không có tiêu đề';
        els.category.textContent = post.category || 'Tin tức';
        els.author.textContent = post.author_name || 'Ban biên tập';
        els.date.textContent = HluvUI.formatDate(post.created_at);
        els.readtime.textContent = `${readMinutes} phút đọc`;
        els.image.src = post.image_url || HLUV_CONFIG.placeholderImage;
        els.image.alt = post.title || '';
        syncArticleActions(post);

        const paragraphs = String(post.content || '')
            .split(/\n+/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph) => `<p>${HluvUI.escapeHtml(paragraph)}</p>`)
            .join('');
        els.content.innerHTML = paragraphs || '<p>Nội dung đang được cập nhật.</p>';

        els.tags.innerHTML = '';
        [post.category || 'Tin tức'].forEach((tag) => {
            const span = document.createElement('span');
            span.className = 'tag-pill';
            span.textContent = tag;
            els.tags.appendChild(span);
        });
    }

    async function renderRelated(category) {
        HluvUI.renderState(els.related, 'Đang tải bài liên quan...');
        try {
            const related = await HluvApi.posts.list({ category });
            const items = related.filter((item) => Number(item.id) !== postId).slice(0, 4);
            els.related.innerHTML = '';
            if (!items.length) {
                HluvUI.renderState(els.related, 'Chưa có bài viết liên quan.');
                return;
            }
            items.forEach((item) => els.related.appendChild(HluvUI.renderPostCard(item, { className: 'cardsmall', compact: true, showDate: false })));
        } catch (error) {
            HluvUI.renderState(els.related, 'Không tải được bài liên quan.', 'error');
        }
    }

    function syncCommentForm() {
        if (!els.commentForm || !els.commentContent) return;
        let replyNotice = document.getElementById('reply-notice');
        if (!replyNotice && currentUser) {
            replyNotice = document.createElement('div');
            replyNotice.id = 'reply-notice';
            replyNotice.className = 'reply-notice';
            els.commentForm.insertAdjacentElement('afterbegin', replyNotice);
        }
        if (currentUser) {
            els.commentContent.disabled = false;
            els.commentContent.placeholder = replyTarget ? `Trả lời ${replyTarget.author_name || 'bình luận'}...` : 'Viết bình luận của bạn...';
            els.commentForm.querySelector('button[type="submit"]').disabled = false;
            if (replyNotice) {
                replyNotice.hidden = !replyTarget;
                replyNotice.innerHTML = replyTarget ? `
                    <span>Đang trả lời <strong>${HluvUI.escapeHtml(replyTarget.author_name || 'Người dùng')}</strong></span>
                    <button type="button" class="reply-cancel">Hủy</button>
                ` : '';
                replyNotice.querySelector('.reply-cancel')?.addEventListener('click', () => {
                    replyTarget = null;
                    syncCommentForm();
                });
            }
            return;
        }
        els.commentContent.disabled = true;
        els.commentContent.placeholder = 'Đăng nhập để bình luận.';
        els.commentForm.querySelector('button[type="submit"]').disabled = true;
        replyNotice?.remove();
    }

    function setReplyTarget(comment) {
        replyTarget = comment;
        syncCommentForm();
        els.commentContent?.focus();
        els.commentForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function renderComments() {
        if (!els.commentList || !els.commentCount) return;
        HluvUI.renderState(els.commentList, 'Đang tải bình luận...');
        try {
            const comments = await HluvApi.comments.list(postId);
            els.commentCount.textContent = `${comments.length} bình luận`;
            els.commentList.innerHTML = '';
            if (!comments.length) {
                HluvUI.renderState(els.commentList, 'Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ ý kiến.');
                return;
            }

            const commentsByParent = new Map();
            const commentIds = new Set(comments.map((comment) => Number(comment.id)));
            comments.forEach((comment) => {
                const parentId = Number(comment.parent_id || 0);
                const key = parentId && commentIds.has(parentId) ? parentId : 0;
                if (!commentsByParent.has(key)) commentsByParent.set(key, []);
                commentsByParent.get(key).push(comment);
            });

            function renderComment(comment, level = 0) {
                const item = document.createElement('div');
                item.className = level ? 'comment-item comment-reply' : 'comment-item';
                const avatar = comment.author_avatar || `${HLUV_CONFIG.defaultAvatar}?u=${encodeURIComponent(comment.author_name || comment.user_id || 'guest')}`;
                const isCommentAdmin = String(comment.author_role || '').toLowerCase() === 'admin';
                const commentRankUser = {
                    role: comment.author_role,
                    xp: comment.author_xp,
                    rank: comment.author_rank,
                    rank_manual: comment.author_rank_manual
                };
                item.innerHTML = `
                    <span class="comment-avatar-wrap ${isCommentAdmin ? 'admin-avatar' : ''}">
                        <img class="comment-avatar" src="${HluvUI.escapeHtml(avatar)}" alt="">
                        ${isCommentAdmin ? '<span class="admin-badge">admin</span>' : ''}
                    </span>
                    <div class="comment-body">
                        <div class="comment-head">
                            <div class="comment-author">
                                <strong>${HluvUI.escapeHtml(comment.author_name || 'Người dùng')}</strong>
                                ${HluvUI.rankBadgeMarkup(commentRankUser, 'rank-comment')}
                            </div>
                            <small>${HluvUI.formatDate(comment.created_at)}</small>
                        </div>
                        <p>${HluvUI.escapeHtml(comment.content || '')}</p>
                    </div>
                `;
                const tools = document.createElement('div');
                tools.className = 'comment-tools';
                if (currentUser) {
                    const replyBtn = document.createElement('button');
                    replyBtn.type = 'button';
                    replyBtn.className = 'btn btn-small btn-reply';
                    replyBtn.textContent = 'Trả lời';
                    replyBtn.addEventListener('click', () => setReplyTarget(comment));
                    tools.appendChild(replyBtn);
                }
                if (canManageComment(comment)) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.type = 'button';
                    deleteBtn.className = 'btn btn-small btn-delete';
                    deleteBtn.textContent = 'Xóa bình luận';
                    deleteBtn.addEventListener('click', async () => {
                        if (!confirm(HLUV_MESSAGES.confirmDeleteComment)) return;
                        HluvUI.setButtonLoading(deleteBtn, true, 'Đang xóa...');
                        try {
                            const result = await HluvApi.comments.delete(comment.id, currentUser.id);
                            if (!result.deleted) throw new Error('Không có bình luận nào được xóa.');
                            HluvUI.notify(HLUV_MESSAGES.deleteCommentSuccess, 'success');
                            await renderComments();
                        } catch (error) {
                            HluvUI.handleError(error, 'Không xóa được bình luận.');
                        } finally {
                            HluvUI.setButtonLoading(deleteBtn, false);
                        }
                    });
                    tools.appendChild(deleteBtn);
                }
                if (tools.children.length) item.querySelector('.comment-body').appendChild(tools);

                const replies = commentsByParent.get(Number(comment.id)) || [];
                if (replies.length) {
                    const replyList = document.createElement('div');
                    replyList.className = 'comment-replies';
                    replies.forEach((reply) => replyList.appendChild(renderComment(reply, level + 1)));
                    item.querySelector('.comment-body').appendChild(replyList);
                }

                return item;
            }

            (commentsByParent.get(0) || []).forEach((comment) => {
                els.commentList.appendChild(renderComment(comment));
            });
        } catch (error) {
            HluvUI.renderState(els.commentList, 'Không tải được bình luận.', 'error');
        }
    }

    async function submitComment(event) {
        event.preventDefault();
        if (!currentUser) {
            HluvUI.notify(HLUV_MESSAGES.loginRequired, 'error');
            return;
        }
        const content = els.commentContent.value.trim();
        if (!content) {
            HluvUI.notify('Vui lòng nhập nội dung bình luận.', 'error');
            return;
        }

        const submitBtn = els.commentForm.querySelector('button[type="submit"]');
        HluvUI.setButtonLoading(submitBtn, true, 'Đang gửi...');
        try {
            const result = await HluvApi.comments.create({ post_id: postId, user_id: currentUser.id, content, parent_id: replyTarget?.id });
            els.commentContent.value = '';
            replyTarget = null;
            syncCommentForm();
            HluvUI.notify(result?.degradedReply ? 'Đã gửi trả lời. Chạy migration parent_id để hiển thị dạng luồng.' : HLUV_MESSAGES.commentCreateSuccess, 'success');
            await renderComments();
        } catch (error) {
            HluvUI.handleError(error, HLUV_MESSAGES.commentCreateFailed);
        } finally {
            HluvUI.setButtonLoading(submitBtn, false);
        }
    }

    async function refreshBookmarkButton() {
        if (!els.bookmarkBtn) return;
        if (!currentUser) {
            els.bookmarkBtn.textContent = 'Đăng nhập để lưu';
            return;
        }
        try {
            const data = await HluvApi.bookmarks.check(currentUser.id, postId);
            els.bookmarkBtn.textContent = data.bookmarked ? 'Đã lưu' : 'Lưu bài';
        } catch (error) {
            els.bookmarkBtn.textContent = 'Lưu bài';
        }
    }

    async function refreshLikeButton() {
        if (!els.likeBtn || !els.likeCount) return;
        try {
            const count = await HluvApi.likes.count(postId);
            els.likeCount.textContent = count.total || 0;
            if (currentUser) {
                const check = await HluvApi.likes.check(currentUser.id, postId);
                els.likeBtn.textContent = check.liked ? 'Đã thích' : 'Thích';
            }
        } catch (error) {
            els.likeCount.textContent = '0';
        }
    }

    async function toggleBookmark() {
        if (!currentUser) {
            HluvUI.notify(HLUV_MESSAGES.loginRequired, 'error');
            return;
        }
        HluvUI.setButtonLoading(els.bookmarkBtn, true);
        try {
            const result = await HluvApi.bookmarks.toggle(currentUser.id, postId);
            if (result.added) {
                const freshUser = await HluvUserService.profile(currentUser.id);
                HluvUI.setCurrentUser(freshUser);
            }
            HluvUI.notify(result.added ? HLUV_MESSAGES.bookmarkAdded : HLUV_MESSAGES.bookmarkRemoved, 'success');
            await refreshBookmarkButton();
        } catch (error) {
            HluvUI.handleError(error, 'Không cập nhật được bookmark.');
        } finally {
            HluvUI.setButtonLoading(els.bookmarkBtn, false);
            await refreshBookmarkButton();
        }
    }

    async function toggleLike() {
        if (!currentUser) {
            HluvUI.notify(HLUV_MESSAGES.loginRequired, 'error');
            return;
        }
        HluvUI.setButtonLoading(els.likeBtn, true);
        try {
            const result = await HluvApi.likes.toggle(currentUser.id, postId);
            if (result.liked) {
                const freshUser = await HluvUserService.profile(currentUser.id);
                HluvUI.setCurrentUser(freshUser);
            }
            els.likeBtn.textContent = result.liked ? 'Đã thích' : 'Thích';
            await refreshLikeButton();
        } catch (error) {
            HluvUI.handleError(error, 'Không cập nhật được lượt thích.');
        } finally {
            HluvUI.setButtonLoading(els.likeBtn, false);
            await refreshLikeButton();
        }
    }

    async function shareArticle() {
        const payload = {
            title: els.title.textContent,
            text: 'Hãy xem bài viết này trên Tạp chí ĐH Hoa Lư',
            url: window.location.href
        };
        if (navigator.share) {
            await navigator.share(payload);
            return;
        }
        await navigator.clipboard?.writeText(window.location.href);
        HluvUI.notify('Đã sao chép liên kết bài viết.', 'success');
    }

    async function markRead() {
        const key = HLUV_CONFIG.storageKeys.readProgress;
        const progress = JSON.parse(localStorage.getItem(key) || '{}');
        const isNewRead = !progress[postId];
        progress[postId] = { readAt: new Date().toISOString(), title: article?.title || '', category: article?.category || '' };
        localStorage.setItem(key, JSON.stringify(progress));
        if (currentUser && isNewRead) {
            const data = await HluvUserService.addXp(currentUser.id, 2);
            if (data?.user) HluvUI.setCurrentUser(data.user);
        }
    }

    if (!postId) {
        els.title.textContent = 'Bài viết không hợp lệ';
        return;
    }

    els.bookmarkBtn.addEventListener('click', toggleBookmark);
    els.likeBtn?.addEventListener('click', toggleLike);
    els.shareBtn.addEventListener('click', () => shareArticle().catch((error) => HluvUI.handleError(error, 'Không thể chia sẻ bài viết.')));
    els.commentForm?.addEventListener('submit', submitComment);
    syncCommentForm();

    try {
        article = await HluvApi.posts.get(postId);
        renderArticle(article);
        await markRead();
        await Promise.all([renderRelated(article.category), refreshBookmarkButton(), refreshLikeButton(), renderComments()]);
    } catch (error) {
        els.title.textContent = 'Bài viết không tìm thấy';
        els.content.innerHTML = '';
        HluvUI.handleError(error, HLUV_MESSAGES.loadPostError);
    }
});
