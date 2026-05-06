const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const AUTH_STORAGE_KEY = 'shipping.auth.user';

function getAuthHeaders() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
        return {};
    }

    try {
        const user = JSON.parse(raw);
        return {
            'x-user-id': user.userId,
            'x-user-role': user.primaryRole
        };
    } catch {
        return {};
    }
}

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...(options.headers || {})
        },
        ...options
    });

    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.message || 'Request failed');
    }

    return payload;
}

export const apiClient = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' })
};
