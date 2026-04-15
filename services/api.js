(function () {
    class ApiError extends Error {
        constructor(message, status, details) {
            super(message);
            this.name = 'ApiError';
            this.status = status || 0;
            this.details = details || null;
        }
    }

    const publicUserFields = 'id,name,email,avatar,gender,birthdate,bio,role,xp,rank,rank_manual,created_at,updated_at';
    const rankCatalog = {
        'Vô Gia Cư': { icon: '👩‍🦽', min_xp: 0 },
        'Bần Nông': { icon: '🌱', min_xp: 0 },
        'Thường Dân': { icon: '🧑‍🌾', min_xp: 20 },
        'Học Sĩ': { icon: '🎓', min_xp: 50 },
        'Quý Tộc': { icon: '🏰', min_xp: 100 },
        'Vương Giả': { icon: '👑', min_xp: 200 }
    };

    function buildUrl(endpoint, params) {
        const url = new URL(`${HLUV_CONFIG.apiBase}/${endpoint}`, window.location.href);
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });
        return url.toString();
    }

    function isSupabaseEnabled() {
        const config = HLUV_CONFIG.supabase || {};
        return Boolean(config.enabled && config.url && config.key);
    }

    function rankFromXp(xp) {
        const value = Number(xp) || 0;
        if (value < 20) return 'Bần Nông';
        if (value < 50) return 'Thường Dân';
        if (value < 100) return 'Học Sĩ';
        if (value < 200) return 'Quý Tộc';
        return 'Vương Giả';
    }

    function normalizeRank(rank) {
        return Object.prototype.hasOwnProperty.call(rankCatalog, rank) ? rank : null;
    }

    function excerptFromContent(content) {
        return String(content || '').replace(/<[^>]*>/g, '').slice(0, 210);
    }

    function publicUser(user) {
        if (!user) return null;
        const { password, ...safeUser } = user;
        return safeUser;
    }

    function isAdminUser(user) {
        return Boolean(user && (
            String(user.role || '').toLowerCase() === 'admin'
            || String(user.email || '').toLowerCase() === 'admin@webtapchi.local'
        ));
    }

    function uniq(values) {
        return [...new Set(values.map((value) => Number(value)).filter(Boolean))];
    }

    function inFilter(values) {
        return `in.(${uniq(values).join(',')})`;
    }

    function supabaseConfig() {
        const config = HLUV_CONFIG.supabase || {};
        return {
            url: String(config.url || '').replace(/\/+$/, ''),
            key: config.key || ''
        };
    }

    function authSessionKey() {
        return HLUV_CONFIG.storageKeys.supabaseSession || 'hluv-supabase-session';
    }

    function setAuthSession(session) {
        if (!session?.access_token) return;
        const normalized = { ...session };
        if (normalized.expires_in && !normalized.expires_at) {
            normalized.expires_at = Math.floor(Date.now() / 1000) + Number(normalized.expires_in);
        }
        localStorage.setItem(authSessionKey(), JSON.stringify(normalized));
    }

    function getAuthSession() {
        try {
            return JSON.parse(localStorage.getItem(authSessionKey()) || 'null');
        } catch (error) {
            return null;
        }
    }

    function clearAuthSession() {
        localStorage.removeItem(authSessionKey());
    }

    function isJwtExpiredPayload(data) {
        const text = `${data?.message || ''} ${data?.msg || ''} ${data?.error || ''} ${data?.code || ''}`.toLowerCase();
        return text.includes('jwt expired') || text.includes('token is expired');
    }

    function isMissingColumnError(error, column) {
        const text = `${error?.message || ''} ${error?.details?.message || ''} ${error?.details?.details || ''} ${error?.details?.hint || ''}`.toLowerCase();
        return text.includes(column.toLowerCase()) && (text.includes('column') || text.includes('schema cache'));
    }

    function isMissingTableError(error, table) {
        const text = `${error?.message || ''} ${error?.details?.message || ''} ${error?.details?.details || ''} ${error?.details?.hint || ''}`.toLowerCase();
        return text.includes(table.toLowerCase()) && (text.includes('relation') || text.includes('schema cache') || text.includes('does not exist'));
    }

    async function refreshAuthSession() {
        const session = getAuthSession();
        if (!session?.refresh_token) throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);

        const config = supabaseConfig();
        let response;
        try {
            response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                headers: {
                    apikey: config.key,
                    Authorization: `Bearer ${config.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: session.refresh_token })
            });
        } catch (error) {
            throw new ApiError(HLUV_MESSAGES.networkError, 0, error);
        }

        const data = await parseJsonResponse(response);
        if (!response.ok || !data?.access_token) {
            clearAuthSession();
            throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', response.status, data);
        }

        setAuthSession(data);
        return data;
    }

    async function getSupabaseAccessToken(options = {}) {
        if (options.accessToken) return options.accessToken;
        const config = supabaseConfig();
        const session = getAuthSession();
        if (!session?.access_token) return config.key;

        const now = Math.floor(Date.now() / 1000);
        if (session.refresh_token && Number(session.expires_at || 0) && Number(session.expires_at) <= now + 90) {
            const fresh = await refreshAuthSession();
            return fresh.access_token;
        }

        return session.access_token;
    }

    async function parseJsonResponse(response) {
        const text = await response.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (error) {
            throw new ApiError('Phản hồi Supabase không hợp lệ.', response.status, text);
        }
    }

    async function supabaseRest(path, options = {}, allowRefreshRetry = true) {
        const config = supabaseConfig();
        const token = await getSupabaseAccessToken(options);
        const url = new URL(`${config.url}/rest/v1/${path}`);
        Object.entries(options.params || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });

        const headers = {
            apikey: config.key,
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        };
        if (options.body !== undefined) headers['Content-Type'] = 'application/json';
        if (options.prefer) headers.Prefer = options.prefer;

        let response;
        try {
            response = await fetch(url.toString(), {
                method: options.method || 'GET',
                headers,
                body: options.body !== undefined ? JSON.stringify(options.body) : undefined
            });
        } catch (error) {
            throw new ApiError(HLUV_MESSAGES.networkError, 0, error);
        }

        const data = await parseJsonResponse(response);
        if (!response.ok) {
            if (allowRefreshRetry && isJwtExpiredPayload(data)) {
                await refreshAuthSession();
                return supabaseRest(path, options, false);
            }
            const rlsText = `${data?.message || ''} ${data?.error || ''}`.toLowerCase();
            if (rlsText.includes('row-level security')) {
                throw new ApiError('Supabase RLS đang chặn thao tác. Hãy chạy file supabase_migration.sql trong SQL Editor rồi thử lại.', response.status, data);
            }
            throw new ApiError(data?.message || data?.error || `Lỗi Supabase (${response.status}).`, response.status, data);
        }
        return data;
    }

    async function supabaseAuth(path, body, accessToken) {
        const config = supabaseConfig();
        let response;
        try {
            response = await fetch(`${config.url}/auth/v1/${path}`, {
                method: 'POST',
                headers: {
                    apikey: config.key,
                    Authorization: `Bearer ${accessToken || config.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body || {})
            });
        } catch (error) {
            throw new ApiError(HLUV_MESSAGES.networkError, 0, error);
        }

        const data = await parseJsonResponse(response);
        if (!response.ok) {
            const authMessage = data?.msg || data?.message || data?.error || '';
            if (String(authMessage).toLowerCase().includes('email rate limit')) {
                throw new ApiError('Supabase đang giới hạn gửi email xác nhận. Vào Authentication > Providers > Email và tắt Confirm email trong lúc demo, hoặc cấu hình SMTP riêng rồi thử lại.', response.status, data);
            }
            throw new ApiError(data?.msg || data?.message || data?.error || `Lỗi Supabase Auth (${response.status}).`, response.status, data);
        }
        return data;
    }

    async function fetchUsersByIds(ids) {
        const values = uniq(ids);
        if (!values.length) return new Map();
        const users = await supabaseRest('users', {
            params: { select: publicUserFields, id: inFilter(values) }
        });
        return new Map((users || []).map((user) => [Number(user.id), publicUser(user)]));
    }

    async function fetchUserById(id, includePassword = false) {
        const rows = await supabaseRest('users', {
            params: {
                select: includePassword ? '*' : publicUserFields,
                id: `eq.${Number(id)}`,
                limit: 1
            }
        });
        return rows?.[0] || null;
    }

    async function fetchUserByEmail(email, includePassword = false) {
        const rows = await supabaseRest('users', {
            params: {
                select: includePassword ? '*' : publicUserFields,
                email: `eq.${email}`,
                limit: 1
            }
        });
        return rows?.[0] || null;
    }

    async function createNotification(payload = {}) {
        const body = {
            user_id: payload.user_id ? Number(payload.user_id) : null,
            actor_id: payload.actor_id ? Number(payload.actor_id) : null,
            actor_name: String(payload.actor_name || '').trim(),
            type: String(payload.type || 'system').trim(),
            post_id: payload.post_id ? Number(payload.post_id) : null,
            comment_id: payload.comment_id ? Number(payload.comment_id) : null,
            parent_comment_id: payload.parent_comment_id ? Number(payload.parent_comment_id) : null,
            message: String(payload.message || '').trim(),
            is_read: false
        };
        if (!body.message) return { success: false };
        if (body.user_id && body.actor_id && Number(body.user_id) === Number(body.actor_id)) return { success: false };

        try {
            const rows = await supabaseRest('notifications', {
                method: 'POST',
                body,
                prefer: 'return=representation'
            });
            return { success: true, notification: rows?.[0] };
        } catch (error) {
            if (isMissingTableError(error, 'notifications')) {
                console.warn('Bảng notifications chưa tồn tại. Hãy chạy supabase_migration.sql.', error);
                return { success: false, skipped: true };
            }
            throw error;
        }
    }

    async function listNotifications(userId) {
        if (!userId) return [];
        const derived = await deriveNotifications(userId).catch((error) => {
            console.warn('Không dựng được thông báo từ hoạt động.', error);
            return [];
        });
        let stored = [];
        try {
            stored = await supabaseRest('notifications', {
                params: {
                    select: '*',
                    or: `(user_id.eq.${Number(userId)},user_id.is.null)`,
                    order: 'created_at.desc,id.desc',
                    limit: 30
                }
            });
        } catch (error) {
            if (!isMissingTableError(error, 'notifications')) throw error;
        }

        const seen = new Set();
        return [...stored, ...derived]
            .filter((item) => {
                const key = `${item.type}-${item.post_id || 0}-${item.comment_id || 0}-${item.actor_id || 0}-${item.created_at || ''}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .slice(0, 30);
    }

    async function deriveNotifications(userId) {
        const id = Number(userId);
        const posts = await supabaseRest('posts', {
            params: { select: 'id,title,user_id,status', user_id: `eq.${id}`, status: 'eq.published' }
        }).catch(() => []);
        const ownComments = await supabaseRest('comments', {
            params: { select: '*', user_id: `eq.${id}`, order: 'created_at.desc,id.desc', limit: 120 }
        }).catch(() => []);

        const postIds = uniq(posts.map((post) => post.id));
        const ownCommentIds = uniq(ownComments.map((comment) => comment.id));
        const postById = new Map(posts.map((post) => [Number(post.id), post]));
        const notifications = [];

        let commentsOnPosts = [];
        if (postIds.length) {
            commentsOnPosts = await supabaseRest('comments', {
                params: { select: '*', post_id: inFilter(postIds), order: 'created_at.desc,id.desc', limit: 120 }
            }).catch(() => []);
        }

        let repliesToOwnComments = [];
        if (ownCommentIds.length) {
            repliesToOwnComments = await supabaseRest('comments', {
                params: { select: '*', parent_id: inFilter(ownCommentIds), order: 'created_at.desc,id.desc', limit: 120 }
            }).catch(async (error) => {
                if (!isMissingColumnError(error, 'parent_id')) return [];
                const recent = await supabaseRest('comments', {
                    params: { select: '*', order: 'created_at.desc,id.desc', limit: 160 }
                }).catch(() => []);
                return recent.filter((comment) => {
                    const match = String(comment.content || '').match(/^Trả lời bình luận #(\d+):/);
                    return match && ownCommentIds.includes(Number(match[1]));
                });
            });
        }

        let likesOnPosts = [];
        if (postIds.length) {
            likesOnPosts = await supabaseRest('likes', {
                params: { select: '*', post_id: inFilter(postIds), order: 'created_at.desc,id.desc', limit: 120 }
            }).catch(() => []);
        }

        const actorIds = uniq([
            ...commentsOnPosts.map((item) => item.user_id),
            ...repliesToOwnComments.map((item) => item.user_id),
            ...likesOnPosts.map((item) => item.user_id)
        ]);
        const usersById = await fetchUsersByIds(actorIds);
        const pushed = new Set();

        commentsOnPosts.forEach((comment) => {
            if (Number(comment.user_id) === id) return;
            const post = postById.get(Number(comment.post_id));
            const actor = usersById.get(Number(comment.user_id));
            const actorName = actor?.name || actor?.email || 'Một người dùng';
            const parentId = Number(comment.parent_id || String(comment.content || '').match(/^Trả lời bình luận #(\d+):/)?.[1] || 0);
            const key = `post-comment-${comment.id}`;
            if (pushed.has(key)) return;
            pushed.add(key);
            notifications.push({
                id: `derived-${key}`,
                user_id: id,
                actor_id: comment.user_id,
                actor_name: actorName,
                type: parentId ? 'reply_on_post' : 'comment',
                post_id: comment.post_id,
                comment_id: comment.id,
                parent_comment_id: parentId || null,
                message: parentId
                    ? `${actorName} đã trả lời một bình luận trong bài viết "${post?.title || 'không có tiêu đề'}".`
                    : `${actorName} đã bình luận bài viết "${post?.title || 'không có tiêu đề'}".`,
                is_read: false,
                created_at: comment.created_at
            });
        });

        repliesToOwnComments.forEach((comment) => {
            if (Number(comment.user_id) === id) return;
            const actor = usersById.get(Number(comment.user_id));
            const actorName = actor?.name || actor?.email || 'Một người dùng';
            const parentId = Number(comment.parent_id || String(comment.content || '').match(/^Trả lời bình luận #(\d+):/)?.[1] || 0);
            const key = `reply-${comment.id}`;
            if (pushed.has(key)) return;
            pushed.add(key);
            notifications.push({
                id: `derived-${key}`,
                user_id: id,
                actor_id: comment.user_id,
                actor_name: actorName,
                type: 'reply',
                post_id: comment.post_id,
                comment_id: comment.id,
                parent_comment_id: parentId || null,
                message: `${actorName} đã trả lời bình luận của bạn.`,
                is_read: false,
                created_at: comment.created_at
            });
        });

        likesOnPosts.forEach((like) => {
            if (Number(like.user_id) === id) return;
            const post = postById.get(Number(like.post_id));
            const actor = usersById.get(Number(like.user_id));
            const actorName = actor?.name || actor?.email || 'Một người dùng';
            notifications.push({
                id: `derived-like-${like.id || `${like.user_id}-${like.post_id}`}`,
                user_id: id,
                actor_id: like.user_id,
                actor_name: actorName,
                type: 'like',
                post_id: like.post_id,
                message: `${actorName} đã thích bài viết "${post?.title || 'không có tiêu đề'}".`,
                is_read: false,
                created_at: like.created_at
            });
        });

        return notifications;
    }

    async function markNotificationsRead(userId) {
        if (!userId) return { success: false };
        try {
            await supabaseRest('notifications', {
                method: 'PATCH',
                params: { user_id: `eq.${Number(userId)}`, is_read: 'eq.false' },
                body: { is_read: true },
                prefer: 'return=minimal'
            });
            return { success: true };
        } catch (error) {
            if (isMissingTableError(error, 'notifications')) return { success: false, skipped: true };
            throw error;
        }
    }

    async function broadcastNotification(adminId, message) {
        const admin = await fetchUserById(adminId);
        if (!isAdminUser(admin)) throw new ApiError('Admin required', 403);
        const clean = String(message || '').trim();
        if (!clean) throw new ApiError('Vui lòng nhập nội dung thông báo.', 400);
        const result = await createNotification({
            user_id: null,
            actor_id: admin.id,
            actor_name: admin.name || admin.email || 'Admin',
            type: 'admin',
            message: clean
        });
        if (!result?.success) throw new ApiError('Chưa gửi được thông báo. Hãy chạy supabase_migration.sql để tạo bảng notifications và policy.', 500, result);
        return result;
    }

    async function fetchProfileById(id) {
        if (!id) return null;
        const rows = await supabaseRest('profiles', {
            params: { select: '*', id: `eq.${id}`, limit: 1 }
        });
        return rows?.[0] || null;
    }

    async function fetchProfileByEmail(email) {
        if (!email) return null;
        const rows = await supabaseRest('profiles', {
            params: { select: '*', email: `eq.${email}`, limit: 1 }
        });
        return rows?.[0] || null;
    }

    function mergeProfileIntoUser(user, profile) {
        if (!user) return null;
        if (!profile) return publicUser(user);
        const role = isAdminUser(user) || isAdminUser(profile) ? 'admin' : (profile.role || user.role);
        return {
            ...publicUser(user),
            auth_id: profile.id,
            profile_id: profile.id,
            name: profile.name || user.name,
            avatar: profile.avatar_url || user.avatar,
            role
        };
    }

    async function upsertProfile(authUser, payload = {}) {
        if (!authUser?.id) return fetchProfileByEmail(payload.email);
        const existing = await fetchProfileById(authUser.id);
        const appUser = await fetchUserByEmail(authUser.email || payload.email).catch(() => null);
        const body = {
            id: authUser.id,
            email: authUser.email || payload.email || existing?.email || '',
            name: payload.name || existing?.name || payload.email || authUser.email || 'Người dùng',
            avatar_url: payload.avatar_url || payload.avatar || existing?.avatar_url || '',
            role: isAdminUser(appUser) ? 'admin' : (existing?.role || payload.role || 'reader'),
            updated_at: new Date().toISOString()
        };

        const rows = await supabaseRest('profiles', {
            method: 'POST',
            params: { on_conflict: 'id' },
            body,
            prefer: 'resolution=merge-duplicates,return=representation'
        });
        return rows?.[0] || body;
    }

    async function ensureAppUserFromProfile(profile, payload = {}) {
        const email = profile?.email || payload.email;
        if (!email) throw new ApiError('Email profile không hợp lệ.', 400);

        const existing = await fetchUserByEmail(email);
        if (existing) return mergeProfileIntoUser(existing, profile);

        const rows = await supabaseRest('users', {
            method: 'POST',
            body: {
                name: profile?.name || payload.name || email,
                email,
                password: 'supabase-auth',
                avatar: profile?.avatar_url || payload.avatar || '',
                gender: payload.gender || null,
                birthdate: payload.birthdate || null,
                role: profile?.role || 'reader',
                xp: 0,
                rank: 'Bần Nông',
                rank_manual: false
            },
            prefer: 'return=representation'
        });
        return mergeProfileIntoUser(rows?.[0], profile);
    }

    async function syncProfileFromAppUser(user, payload = {}) {
        const profile = (user?.auth_id && await fetchProfileById(user.auth_id)) || await fetchProfileByEmail(user?.email);
        if (!profile) return;
        await supabaseRest('profiles', {
            method: 'PATCH',
            params: { id: `eq.${profile.id}` },
            body: {
                name: payload.name || user.name || profile.name,
                avatar_url: payload.avatar || user.avatar || profile.avatar_url,
                role: user.role || profile.role || 'reader',
                updated_at: new Date().toISOString()
            },
            prefer: 'return=minimal'
        });
    }

    function hydratePost(post, usersById) {
        const user = usersById.get(Number(post.user_id));
        return {
            ...post,
            author_name: user?.name || post.author_name || 'Ban biên tập',
            author_avatar: user?.avatar || post.author_avatar || ''
        };
    }

    async function hydratePosts(posts) {
        const rows = posts || [];
        const usersById = await fetchUsersByIds(rows.map((post) => post.user_id));
        return rows.map((post) => hydratePost(post, usersById));
    }

    async function fetchPostsByIds(ids) {
        const values = uniq(ids);
        if (!values.length) return [];
        const posts = await supabaseRest('posts', {
            params: {
                select: '*',
                id: inFilter(values),
                status: 'eq.published'
            }
        });
        return hydratePosts(posts || []);
    }

    async function addUserXp(userId, amount) {
        const value = Number(amount) || 0;
        if (!userId || value <= 0) return { user: publicUser(await fetchUserById(userId)) };

        const user = await fetchUserById(userId);
        if (!user) throw new ApiError('User not found', 404);
        if (isAdminUser(user)) return { user: publicUser(user) };

        const xp = Math.max(0, Number(user.xp || 0) + value);
        const rank = Number(user.rank_manual || 0) ? (user.rank || 'Bần Nông') : rankFromXp(xp);
        const rows = await supabaseRest('users', {
            method: 'PATCH',
            params: { id: `eq.${Number(userId)}` },
            body: { xp, rank, updated_at: new Date().toISOString() },
            prefer: 'return=representation'
        });
        return { success: true, user: publicUser(rows?.[0]) };
    }

    async function listPosts(params = {}) {
        const query = {
            select: '*',
            status: 'eq.published',
            order: 'created_at.desc,id.desc'
        };
        if (params.category) query.category = `eq.${params.category}`;
        if (params.user_id) query.user_id = `eq.${Number(params.user_id)}`;
        if (params.q) {
            const q = String(params.q).replace(/[(),]/g, ' ').trim();
            if (q) query.or = `(title.ilike.*${q}*,content.ilike.*${q}*,excerpt.ilike.*${q}*)`;
        }
        return hydratePosts(await supabaseRest('posts', { params: query }));
    }

    async function getPost(id) {
        const rows = await supabaseRest('posts', {
            params: {
                select: '*',
                id: `eq.${Number(id)}`,
                status: 'eq.published',
                limit: 1
            }
        });
        if (!rows?.length) throw new ApiError('Post not found', 404);

        const post = rows[0];
        const views = Number(post.views || 0) + 1;
        supabaseRest('posts', {
            method: 'PATCH',
            params: { id: `eq.${Number(id)}` },
            body: { views, updated_at: new Date().toISOString() },
            prefer: 'return=minimal'
        }).catch((error) => console.warn('Không cập nhật được lượt xem Supabase.', error));
        post.views = views;
        return (await hydratePosts([post]))[0];
    }

    async function createPost(payload) {
        const body = {
            user_id: Number(payload.user_id),
            title: String(payload.title || '').trim(),
            category: String(payload.category || '').trim(),
            content: String(payload.content || '').trim(),
            excerpt: excerptFromContent(payload.content),
            image_url: String(payload.image_url || payload.image || '').trim(),
            status: 'published'
        };
        if (!body.user_id || !body.title || !body.category || !body.content) throw new ApiError('missing fields', 400);

        const rows = await supabaseRest('posts', {
            method: 'POST',
            body,
            prefer: 'return=representation'
        });
        await addUserXp(body.user_id, 10).catch((error) => console.warn('Không cộng XP đăng bài.', error));
        return { success: true, id: rows?.[0]?.id };
    }

    async function updatePost(payload) {
        const id = Number(payload.id);
        const userId = Number(payload.user_id);
        const body = {
            title: String(payload.title || '').trim(),
            category: String(payload.category || '').trim(),
            content: String(payload.content || '').trim(),
            excerpt: excerptFromContent(payload.content),
            image_url: String(payload.image_url || payload.image || '').trim(),
            updated_at: new Date().toISOString()
        };
        if (!id || !userId || !body.title || !body.category || !body.content) throw new ApiError('missing fields', 400);

        const rows = await supabaseRest('posts', {
            method: 'PATCH',
            params: { id: `eq.${id}`, user_id: `eq.${userId}` },
            body,
            prefer: 'return=representation'
        });
        return { success: true, affected_rows: rows?.length || 0 };
    }

    async function deletePost(id, userId) {
        const user = await fetchUserById(userId);
        const params = { id: `eq.${Number(id)}` };
        if (!isAdminUser(user)) params.user_id = `eq.${Number(userId)}`;
        const rows = await supabaseRest('posts', {
            method: 'DELETE',
            params,
            prefer: 'return=representation'
        });
        return { success: true, deleted: rows?.length || 0 };
    }

    async function loginUser(email, password) {
        const normalizedEmail = String(email || '').trim();
        const rawPassword = String(password || '').trim();
        if (!normalizedEmail || !rawPassword) throw new ApiError('Email, password required', 400);

        let auth;
        try {
            auth = await supabaseAuth('token?grant_type=password', {
                email: normalizedEmail,
                password: rawPassword
            });
        } catch (authError) {
            clearAuthSession();
            throw new ApiError('Đăng nhập Supabase Auth thất bại. Tài khoản cũ PHP cần tạo lại trên Supabase Auth.', authError.status || 401, authError);
        }

        setAuthSession(auth);
        const profile = await upsertProfile(auth.user, { email: normalizedEmail });
        const user = await ensureAppUserFromProfile(profile, { email: normalizedEmail });
        return { success: true, user };
    }

    async function registerUser(payload) {
        const name = String(payload.name || '').trim();
        const email = String(payload.email || '').trim();
        const password = String(payload.password || '').trim();
        if (!name || !email || !password) throw new ApiError('Yêu cầu name/email/password', 400);

        const auth = await supabaseAuth('signup', {
            email,
            password,
            data: {
                name,
                avatar_url: payload.avatar || ''
            }
        }).catch((error) => {
            if (!String(error.message || '').toLowerCase().includes('already')) throw error;
            return null;
        });

        if (auth?.access_token) setAuthSession(auth);
        const authUser = auth?.user || { id: null, email };
        const profile = await upsertProfile(authUser, {
            name,
            email,
            avatar: payload.avatar || '',
            gender: payload.gender || null,
            birthdate: payload.birthdate || null
        });
        const user = await ensureAppUserFromProfile(profile, payload);
        return { success: true, id: user?.id, user };
    }

    async function updateUser(payload) {
        const id = Number(payload.id);
        if (!id || !String(payload.name || '').trim()) throw new ApiError('id/name required', 400);
        const rows = await supabaseRest('users', {
            method: 'PATCH',
            params: { id: `eq.${id}` },
            body: {
                name: String(payload.name || '').trim(),
                bio: payload.bio || '',
                avatar: payload.avatar || '',
                gender: payload.gender || null,
                birthdate: payload.birthdate || null,
                updated_at: new Date().toISOString()
            },
            prefer: 'return=representation'
        });
        const user = publicUser(rows?.[0]);
        await syncProfileFromAppUser(user, payload).catch((error) => console.warn('Không đồng bộ được profiles.', error));
        const profile = await fetchProfileByEmail(user?.email).catch(() => null);
        return { success: true, affected_rows: rows?.length || 0, user: mergeProfileIntoUser(user, profile) };
    }

    async function verifyPassword(id, password) {
        const user = await fetchUserById(id, true);
        if (!user) throw new ApiError('User not found', 404);
        await supabaseAuth('token?grant_type=password', { email: user.email, password });
        return { success: true };
    }

    async function changePassword(id, currentPassword, newPassword) {
        const user = await fetchUserById(id, true);
        if (!user) throw new ApiError('User not found', 404);
        if (String(newPassword || '').length < 6) throw new ApiError('Mật khẩu mới tối thiểu 6 ký tự', 400);

        const auth = await supabaseAuth('token?grant_type=password', { email: user.email, password: currentPassword });
        setAuthSession(auth);
        const response = await fetch(`${supabaseConfig().url}/auth/v1/user`, {
            method: 'PUT',
            headers: {
                apikey: supabaseConfig().key,
                Authorization: `Bearer ${auth.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: newPassword })
        });
        const data = await parseJsonResponse(response);
        if (!response.ok) throw new ApiError(data?.message || 'Không đổi được mật khẩu Supabase Auth.', response.status, data);
        return { success: true };
    }

    async function userStats(userId) {
        const id = Number(userId);
        const [posts, bookmarks, likes] = await Promise.all([
            supabaseRest('posts', { params: { select: 'id,category,views,user_id,status', user_id: `eq.${id}`, status: 'eq.published' } }),
            supabaseRest('bookmarks', { params: { select: 'post_id,user_id', user_id: `eq.${id}` } }),
            supabaseRest('likes', { params: { select: 'id', user_id: `eq.${id}` } })
        ]);
        const postIds = posts.map((post) => post.id);
        const received = postIds.length ? await supabaseRest('bookmarks', {
            params: { select: 'user_id,post_id', post_id: inFilter(postIds) }
        }) : [];
        return {
            posts: posts.length,
            bookmarks: bookmarks.length,
            likes: likes.length,
            total_views: posts.reduce((sum, post) => sum + Number(post.views || 0), 0),
            max_post_views: Math.max(0, ...posts.map((post) => Number(post.views || 0))),
            received_bookmarks: received.filter((item) => Number(item.user_id) !== id).length,
            bookmark_categories: 0
        };
    }

    async function toggleBookmark(userId, postId) {
        const existing = await supabaseRest('bookmarks', {
            params: { select: 'id', user_id: `eq.${Number(userId)}`, post_id: `eq.${Number(postId)}`, limit: 1 }
        });
        if (existing?.length) {
            await supabaseRest('bookmarks', { method: 'DELETE', params: { id: `eq.${existing[0].id}` }, prefer: 'return=minimal' });
            return { removed: true };
        }

        await supabaseRest('bookmarks', {
            method: 'POST',
            body: { user_id: Number(userId), post_id: Number(postId) },
            prefer: 'return=minimal'
        });
        await addUserXp(userId, 2).catch((error) => console.warn('Không cộng XP bookmark.', error));
        const post = (await fetchPostsByIds([postId]))[0];
        if (post?.user_id && Number(post.user_id) !== Number(userId)) {
            await addUserXp(post.user_id, 3).catch((error) => console.warn('Không cộng XP tác giả bookmark.', error));
        }
        return { added: true };
    }

    async function listBookmarks(userId) {
        const bookmarks = await supabaseRest('bookmarks', {
            params: { select: 'post_id,created_at', user_id: `eq.${Number(userId)}`, order: 'created_at.desc' }
        });
        const posts = await fetchPostsByIds(bookmarks.map((item) => item.post_id));
        const postsById = new Map(posts.map((post) => [Number(post.id), post]));
        return bookmarks.map((item) => ({ ...postsById.get(Number(item.post_id)), post_id: item.post_id })).filter((item) => item.id || item.post_id);
    }

    async function toggleLike(userId, postId) {
        const existing = await supabaseRest('likes', {
            params: { select: 'id', user_id: `eq.${Number(userId)}`, post_id: `eq.${Number(postId)}`, limit: 1 }
        });
        if (existing?.length) {
            await supabaseRest('likes', { method: 'DELETE', params: { id: `eq.${existing[0].id}` }, prefer: 'return=minimal' });
            return { liked: false };
        }

        await supabaseRest('likes', {
            method: 'POST',
            body: { user_id: Number(userId), post_id: Number(postId) },
            prefer: 'return=minimal'
        });
        await addUserXp(userId, 1).catch((error) => console.warn('Không cộng XP like.', error));
        const post = (await fetchPostsByIds([postId]))[0];
        if (post?.user_id && Number(post.user_id) !== Number(userId)) {
            await addUserXp(post.user_id, 2).catch((error) => console.warn('Không cộng XP tác giả like.', error));
            const actor = await fetchUserById(userId).catch(() => null);
            await createNotification({
                user_id: post.user_id,
                actor_id: userId,
                actor_name: actor?.name || actor?.email || 'Một người dùng',
                type: 'like',
                post_id: post.id,
                message: `${actor?.name || actor?.email || 'Một người dùng'} đã thích bài viết "${post.title || 'không có tiêu đề'}".`
            }).catch((error) => console.warn('Không tạo được thông báo like.', error));
        }
        return { liked: true };
    }

    async function listComments(postId) {
        const comments = await supabaseRest('comments', {
            params: { select: '*', post_id: `eq.${Number(postId)}`, order: 'created_at.asc,id.asc' }
        });
        const usersById = await fetchUsersByIds(comments.map((comment) => comment.user_id));
        return comments.map((comment) => {
            const user = usersById.get(Number(comment.user_id));
            const content = String(comment.content || '');
            const legacyReply = content.match(/^Trả lời bình luận #(\d+):\s*\n?([\s\S]*)$/);
            const parentId = Number(comment.parent_id || legacyReply?.[1] || 0) || null;
            return {
                ...comment,
                parent_id: parentId,
                content: legacyReply ? legacyReply[2].trim() : comment.content,
                author_name: user?.name || 'Người dùng',
                author_avatar: user?.avatar || '',
                author_role: user?.role || 'reader',
                author_xp: user?.xp || 0,
                author_rank: user?.rank || 'Bần Nông',
                author_rank_manual: user?.rank_manual || false
            };
        });
    }

    async function createComment(payload = {}) {
        const parentId = Number(payload.parent_id || 0);
        const body = {
            post_id: Number(payload.post_id),
            user_id: Number(payload.user_id),
            content: String(payload.content || '').trim()
        };
        if (parentId) body.parent_id = parentId;

        try {
            const rows = await supabaseRest('comments', {
                method: 'POST',
                body,
                prefer: 'return=representation'
            });
            const comment = rows?.[0] || {};
            const actor = await fetchUserById(body.user_id).catch(() => null);
            const post = (await fetchPostsByIds([body.post_id]).catch(() => []))[0];
            const actorName = actor?.name || actor?.email || 'Một người dùng';
            const notifiedRecipients = new Set();

            if (parentId) {
                const parentRows = await supabaseRest('comments', {
                    params: { select: 'id,user_id', id: `eq.${parentId}`, limit: 1 }
                }).catch(() => []);
                const parent = parentRows?.[0];
                if (parent?.user_id && Number(parent.user_id) !== Number(body.user_id)) {
                    await createNotification({
                        user_id: parent.user_id,
                        actor_id: body.user_id,
                        actor_name: actorName,
                        type: 'reply',
                        post_id: body.post_id,
                        comment_id: comment.id,
                        parent_comment_id: parentId,
                        message: `${actorName} đã trả lời bình luận của bạn trong bài "${post?.title || 'không có tiêu đề'}".`
                    }).catch((error) => console.warn('Không tạo được thông báo reply.', error));
                    notifiedRecipients.add(Number(parent.user_id));
                }
            }

            if (post?.user_id && Number(post.user_id) !== Number(body.user_id) && !notifiedRecipients.has(Number(post.user_id))) {
                await createNotification({
                    user_id: post.user_id,
                    actor_id: body.user_id,
                    actor_name: actorName,
                    type: parentId ? 'reply_on_post' : 'comment',
                    post_id: body.post_id,
                    comment_id: comment.id,
                    parent_comment_id: parentId || null,
                    message: parentId
                        ? `${actorName} đã trả lời một bình luận trong bài viết "${post.title || 'không có tiêu đề'}".`
                        : `${actorName} đã bình luận bài viết "${post.title || 'không có tiêu đề'}".`
                }).catch((error) => console.warn('Không tạo được thông báo comment.', error));
            }
            return { success: true, id: rows?.[0]?.id, comment: rows?.[0] };
        } catch (error) {
            if (!parentId || !isMissingColumnError(error, 'parent_id')) throw error;

            const fallbackBody = {
                post_id: body.post_id,
                user_id: body.user_id,
                content: `Trả lời bình luận #${parentId}:\n${body.content}`
            };
            const rows = await supabaseRest('comments', {
                method: 'POST',
                body: fallbackBody,
                prefer: 'return=representation'
            });
            return { success: true, id: rows?.[0]?.id, comment: rows?.[0], degradedReply: true };
        }
    }

    async function deleteComment(id, userId) {
        const user = await fetchUserById(userId);
        const targetRows = await supabaseRest('comments', {
            params: { select: 'id,user_id', id: `eq.${Number(id)}`, limit: 1 }
        });
        const target = targetRows?.[0];
        if (!target) throw new ApiError('Comment not found', 404);
        if (!isAdminUser(user) && Number(target.user_id) !== Number(userId)) throw new ApiError('Forbidden', 403);

        const params = { id: `eq.${Number(id)}` };
        if (!isAdminUser(user)) params.user_id = `eq.${Number(userId)}`;
        await supabaseRest('comments', {
            method: 'DELETE',
            params: { parent_id: `eq.${Number(id)}` },
            prefer: 'return=minimal'
        }).catch((error) => {
            if (!isMissingColumnError(error, 'parent_id')) throw error;
        });
        const rows = await supabaseRest('comments', {
            method: 'DELETE',
            params,
            prefer: 'return=representation'
        });
        return { success: true, deleted: rows?.length || 0 };
    }

    async function deleteUserByAdmin(adminId, userId) {
        const admin = await fetchUserById(adminId);
        const user = await fetchUserById(userId);
        if (!isAdminUser(admin)) throw new ApiError('Admin required', 403);
        if (!user) throw new ApiError('User not found', 404);
        if (Number(admin.id) === Number(user.id)) throw new ApiError('Không thể tự xóa tài khoản đang đăng nhập.', 400);
        if (isAdminUser(user)) throw new ApiError('Không thể xóa tài khoản admin.', 400);

        const userPosts = await supabaseRest('posts', {
            params: { select: 'id', user_id: `eq.${Number(user.id)}` }
        });
        const postIds = uniq((userPosts || []).map((post) => post.id));
        const postIdFilter = postIds.length ? inFilter(postIds) : '';

        if (postIdFilter) {
            await supabaseRest('comments', { method: 'DELETE', params: { post_id: postIdFilter }, prefer: 'return=minimal' });
            await supabaseRest('likes', { method: 'DELETE', params: { post_id: postIdFilter }, prefer: 'return=minimal' });
            await supabaseRest('bookmarks', { method: 'DELETE', params: { post_id: postIdFilter }, prefer: 'return=minimal' });
        }

        await supabaseRest('comments', { method: 'DELETE', params: { user_id: `eq.${Number(user.id)}` }, prefer: 'return=minimal' });
        await supabaseRest('likes', { method: 'DELETE', params: { user_id: `eq.${Number(user.id)}` }, prefer: 'return=minimal' });
        await supabaseRest('bookmarks', { method: 'DELETE', params: { user_id: `eq.${Number(user.id)}` }, prefer: 'return=minimal' });
        await supabaseRest('posts', { method: 'DELETE', params: { user_id: `eq.${Number(user.id)}` }, prefer: 'return=minimal' });

        const profile = await fetchProfileByEmail(user.email).catch(() => null);
        if (profile?.id) {
            await supabaseRest('profiles', {
                method: 'DELETE',
                params: { id: `eq.${profile.id}` },
                prefer: 'return=minimal'
            }).catch((error) => console.warn('Không xóa được profile Supabase Auth.', error));
        }

        const rows = await supabaseRest('users', {
            method: 'DELETE',
            params: { id: `eq.${Number(user.id)}` },
            prefer: 'return=representation'
        });

        return { success: true, deleted: rows?.length || 0 };
    }

    async function supabaseRequest(endpoint, params = {}, options = {}) {
        const action = params.action || '';
        if (endpoint === 'posts.php') {
            if (action === 'list') return listPosts(params);
            if (action === 'get') return getPost(params.id);
            if (action === 'create') return createPost(options.body || {});
            if (action === 'update') return updatePost(options.body || {});
            if (action === 'delete') return deletePost(params.id, params.user_id);
        }
        if (endpoint === 'users.php') {
            if (action === 'login') return loginUser(options.body?.email, options.body?.password);
            if (action === 'register') return registerUser(options.body || {});
            if (action === 'profile') return publicUser(await fetchUserById(params.id));
            if (action === 'rank-catalog') return rankCatalog;
            if (action === 'list') {
                const admin = await fetchUserById(params.admin_id);
                if (!isAdminUser(admin)) throw new ApiError('Admin required', 403);
                const users = await supabaseRest('users', { params: { select: publicUserFields, order: 'id.asc' } });
                return users.sort((a, b) => Number(isAdminUser(b)) - Number(isAdminUser(a)));
            }
            if (action === 'stats') return userStats(params.user_id);
            if (action === 'add_xp') return addUserXp(options.body?.user_id, options.body?.xp);
            if (action === 'update_rank') {
                const admin = await fetchUserById(options.body?.admin_id);
                const user = await fetchUserById(options.body?.user_id);
                if (!isAdminUser(admin)) throw new ApiError('Admin required', 403);
                if (isAdminUser(user)) throw new ApiError('Không chỉnh cấp tài khoản admin', 400);
                const manualRank = options.body?.rank === 'auto' ? rankFromXp(user.xp || 0) : normalizeRank(options.body?.rank);
                if (!manualRank) throw new ApiError('Rank invalid', 400);
                const rows = await supabaseRest('users', {
                    method: 'PATCH',
                    params: { id: `eq.${Number(user.id)}` },
                    body: { rank: manualRank, rank_manual: options.body?.rank !== 'auto', updated_at: new Date().toISOString() },
                    prefer: 'return=representation'
                });
                return { success: true, user: publicUser(rows?.[0]) };
            }
            if (action === 'update') return updateUser(options.body || {});
            if (action === 'verify-password') return verifyPassword(options.body?.id, options.body?.password);
            if (action === 'change-password') return changePassword(options.body?.id, options.body?.current_password, options.body?.new_password);
            if (action === 'delete') return deleteUserByAdmin(params.admin_id, params.user_id);
        }
        if (endpoint === 'bookmarks.php') {
            if (action === 'list') return listBookmarks(params.user_id);
            if (action === 'check') {
                const rows = await supabaseRest('bookmarks', { params: { select: 'id', user_id: `eq.${Number(params.user_id)}`, post_id: `eq.${Number(params.post_id)}`, limit: 1 } });
                return { bookmarked: Boolean(rows?.length) };
            }
            if (action === 'toggle') return toggleBookmark(options.body?.user_id, options.body?.post_id);
        }
        if (endpoint === 'likes.php') {
            if (action === 'count') {
                const rows = await supabaseRest('likes', { params: { select: 'id', post_id: `eq.${Number(params.post_id)}` } });
                return { total: rows?.length || 0 };
            }
            if (action === 'check') {
                const rows = await supabaseRest('likes', { params: { select: 'id', user_id: `eq.${Number(params.user_id)}`, post_id: `eq.${Number(params.post_id)}`, limit: 1 } });
                return { liked: Boolean(rows?.length) };
            }
            if (action === 'toggle') return toggleLike(options.body?.user_id, options.body?.post_id);
        }
        if (endpoint === 'comments.php') {
            if (action === 'list') return listComments(params.post_id);
            if (action === 'create') return createComment(options.body || {});
            if (action === 'delete') return deleteComment(params.id, params.user_id);
        }
        if (endpoint === 'notifications.php') {
            if (action === 'list') return listNotifications(params.user_id);
            if (action === 'read') return markNotificationsRead(options.body?.user_id || params.user_id);
            if (action === 'broadcast') return broadcastNotification(options.body?.admin_id, options.body?.message);
            if (action === 'create') return createNotification(options.body || {});
        }
        throw new ApiError('Action not found', 404, { endpoint, action });
    }

    async function signOut() {
        const session = getAuthSession();
        if (session?.access_token) {
            await fetch(`${supabaseConfig().url}/auth/v1/logout`, {
                method: 'POST',
                headers: {
                    apikey: supabaseConfig().key,
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                }
            }).catch((error) => console.warn('Không gọi được Supabase signOut.', error));
        }
        clearAuthSession();
        return { success: true };
    }

    async function parseResponse(response) {
        const text = await response.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (error) {
            throw new ApiError('Phản hồi máy chủ không hợp lệ.', response.status, text);
        }
    }

    async function request(endpoint, params, options = {}) {
        if (isSupabaseEnabled()) {
            return supabaseRequest(endpoint, params, options);
        }

        const fetchOptions = {
            method: options.method || 'GET',
            headers: { ...(options.headers || {}) }
        };

        if (options.body !== undefined) {
            fetchOptions.headers['Content-Type'] = 'application/json';
            fetchOptions.body = JSON.stringify(options.body);
        }

        let response;
        try {
            response = await fetch(buildUrl(endpoint, params), fetchOptions);
        } catch (error) {
            throw new ApiError(HLUV_MESSAGES.networkError, 0, error);
        }

        const data = await parseResponse(response);
        if (!response.ok) {
            throw new ApiError(data?.error || `Lỗi máy chủ (${response.status}).`, response.status, data);
        }
        return data;
    }

    window.HluvApi = {
        ApiError,
        request,
        auth: {
            signOut
        },
        likes: {
            count(postId) {
                return request('likes.php', { action: 'count', post_id: postId });
            },
            check(userId, postId) {
                return request('likes.php', { action: 'check', user_id: userId, post_id: postId });
            },
            toggle(userId, postId) {
                return request('likes.php', { action: 'toggle' }, { method: 'POST', body: { user_id: userId, post_id: postId } });
            }
        },
        notifications: {
            list(userId) {
                return request('notifications.php', { action: 'list', user_id: userId });
            },
            markRead(userId) {
                return request('notifications.php', { action: 'read' }, { method: 'POST', body: { user_id: userId } });
            },
            broadcast(adminId, message) {
                return request('notifications.php', { action: 'broadcast' }, { method: 'POST', body: { admin_id: adminId, message } });
            }
        }
    };
})();
