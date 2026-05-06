import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

const STORAGE_KEY = 'shipping.auth.user';
const AuthContext = createContext(null);

function getStoredUser() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(getStoredUser);

    const refreshUser = async () => {
        const stored = getStoredUser();
        if (!stored?.userId) return;
        
        try {
            const response = await apiClient.get(`/auth/me?userId=${stored.userId}`);
            if (response.success) {
                setUser(response.data);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data));
            }
        } catch (error) {
            console.error('Failed to refresh user profile:', error);
            if (error.status === 401 || error.status === 404) {
                logout();
            }
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const login = async (credentials) => {
        const response = await apiClient.post('/auth/login', credentials);
        const authenticatedUser = response.data;
        setUser(authenticatedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
        return authenticatedUser;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    const updateUser = (updates) => {
        setUser((prev) => {
            const newUser = { ...prev, ...updates };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
            return newUser;
        });
    };

    const value = useMemo(
        () => ({
            user,
            login,
            logout,
            updateUser,
            refreshUser,
            isAuthenticated: Boolean(user)
        }),
        [user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
