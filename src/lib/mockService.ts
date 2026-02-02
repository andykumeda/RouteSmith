export interface User {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    hometown?: string;
}

const generateId = () => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) { }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export interface RouteData {
    id: string;
    userId: string;
    name: string;
    isPublic: boolean;
    distance: number;
    elevationGain: number;
    startLocation: string; // e.g. "San Francisco, CA"
    createdAt: string;
    updatedAt?: string;
    previewGeoJson?: GeoJSON.Feature<GeoJSON.LineString>; // Simplified for list view
    fullGeoJson: GeoJSON.FeatureCollection; // The full route data
    waypoints?: any[];
    segments?: any[];
    elevationProfile?: any[];
    minElevation?: number | null;
    maxElevation?: number | null;
}

// Keys for LocalStorage
const STORAGE_KEY_USERS = 'trailnav_users';
const STORAGE_KEY_CURRENT_USER = 'trailnav_current_user';
const STORAGE_KEY_ROUTES = 'trailnav_routes';

export const mockService = {
    // --- Auth ---

    signup: async (email: string, password: string, username: string, hometown?: string): Promise<{ user: User | null; error: string | null }> => {
        // Simulate network delay
        await new Promise(r => setTimeout(r, 500));

        const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');

        // Check if email exists
        if (users.find((u: any) => u.email === email)) {
            return { user: null, error: 'Email already exists' };
        }

        const newUser: User = {
            id: generateId(),
            email,
            username,
            hometown,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` // Auto-generate mock avatar
        };

        // Save mock "backend" data (password would be hashed in real app)
        users.push({ ...newUser, password });
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

        // Auto-login
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(newUser));

        return { user: newUser, error: null };
    },

    login: async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
        await new Promise(r => setTimeout(r, 500));

        const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);

        if (!user) {
            return { user: null, error: 'Invalid email or password' };
        }

        const { password: _, ...safeUser } = user;
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(safeUser));

        return { user: safeUser, error: null };
    },

    logout: async () => {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    },

    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
        return stored ? JSON.parse(stored) : null;
    },

    updateProfile: async (userId: string, updates: Partial<User>): Promise<{ user: User | null; error: string | null }> => {
        await new Promise(r => setTimeout(r, 300));

        const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
        const index = users.findIndex((u: any) => u.id === userId);

        if (index === -1) return { user: null, error: 'User not found' };

        const updatedUser = { ...users[index], ...updates };
        users[index] = updatedUser;
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

        // Update specific fields on current user session if it matches
        const currentUser = mockService.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            const { password, ...safeUser } = updatedUser;
            localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(safeUser));
            return { user: safeUser, error: null };
        }

        return { user: null, error: 'Session mismatch' };
    },

    // --- Route Persistence ---

    saveRoute: async (userId: string, route: Omit<RouteData, 'id' | 'userId' | 'createdAt'>): Promise<{ route: RouteData | null; error: string | null }> => {
        await new Promise(r => setTimeout(r, 600)); // Simulate save

        const routes = JSON.parse(localStorage.getItem(STORAGE_KEY_ROUTES) || '[]');

        const newRoute: RouteData = {
            id: generateId(),
            userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...route
        };

        routes.push(newRoute);
        localStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify(routes));

        return { route: newRoute, error: null };
    },

    updateRoute: async (routeId: string, updates: Partial<Omit<RouteData, 'id' | 'userId' | 'createdAt'>>): Promise<{ route: RouteData | null; error: string | null }> => {
        await new Promise(r => setTimeout(r, 400));
        const routes: RouteData[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ROUTES) || '[]');
        const index = routes.findIndex(r => r.id === routeId);

        if (index === -1) return { route: null, error: 'Route not found' };

        const updatedRoute = {
            ...routes[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        routes[index] = updatedRoute;
        localStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify(routes));

        return { route: updatedRoute, error: null };
    },

    getUserRoutes: async (userId: string): Promise<RouteData[]> => {
        await new Promise(r => setTimeout(r, 400));
        const routes: RouteData[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ROUTES) || '[]');
        return routes
            .filter((r: RouteData) => r.userId === userId)
            .sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt).getTime();
                const dateB = new Date(b.updatedAt || b.createdAt).getTime();
                return dateB - dateA;
            });
    },

    deleteRoute: async (routeId: string): Promise<boolean> => {
        await new Promise(r => setTimeout(r, 300));
        let routes = JSON.parse(localStorage.getItem(STORAGE_KEY_ROUTES) || '[]');
        const initialLen = routes.length;
        routes = routes.filter((r: RouteData) => r.id !== routeId);
        localStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify(routes));
        return routes.length < initialLen;
    },

    getRouteById: async (routeId: string): Promise<RouteData | null> => {
        await new Promise(r => setTimeout(r, 500));
        const routes: RouteData[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ROUTES) || '[]');
        const route = routes.find(r => r.id === routeId);
        return route || null;
    },

    // For Search Phase later
    searchRoutes: async (query: string): Promise<RouteData[]> => {
        await new Promise(r => setTimeout(r, 500));
        const routes: RouteData[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ROUTES) || '[]');
        const lowerQ = query.toLowerCase();
        return routes.filter((r: RouteData) =>
            r.isPublic &&
            (r.name.toLowerCase().includes(lowerQ) || r.startLocation.toLowerCase().includes(lowerQ))
        );
    }
};
