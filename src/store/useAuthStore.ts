import { create } from 'zustand';
import { mockService } from '../lib/mockService';
import type { User } from '../lib/mockService';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (email: string, password: string) => Promise<boolean>;
    signup: (email: string, password: string, username: string, hometown?: string) => Promise<boolean>;
    logout: () => void;
    updateProfile: (updates: Partial<User>) => Promise<void>;
    checkSession: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoading: true, // Start loading to check session
    error: null,

    checkSession: () => {
        const user = mockService.getCurrentUser();
        set({ user, isLoading: false });
    },

    login: async (email, password) => {
        set({ isLoading: true, error: null });
        const { user, error } = await mockService.login(email, password);

        if (error) {
            set({ error, isLoading: false });
            return false;
        }

        set({ user, isLoading: false });
        return true;
    },

    signup: async (email, password, username, hometown) => {
        set({ isLoading: true, error: null });
        const { user, error } = await mockService.signup(email, password, username, hometown);

        if (error) {
            set({ error, isLoading: false });
            return false;
        }

        set({ user, isLoading: false });
        return true;
    },

    logout: () => {
        mockService.logout();
        set({ user: null });
    },

    updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        set({ isLoading: true });
        const { user: updatedUser, error } = await mockService.updateProfile(user.id, updates);

        if (updatedUser) {
            set({ user: updatedUser, isLoading: false });
        } else {
            set({ error, isLoading: false });
        }
    }
}));
