(function () {
    class ApiError extends Error {
        constructor(message, status, details) {
            super(message);
            this.name = 'ApiError';
            this.status = status || 0;
            this.details = details || null;
        }
    }

    function buildUrl(endpoint, params) {
        const url = new URL(`${HLUV_CONFIG.apiBase}/${endpoint}`, window.location.href);
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });
        return url.toString();
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
        }
    };
})();
