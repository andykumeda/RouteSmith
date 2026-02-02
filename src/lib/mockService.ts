import { supabase } from './supabase';


export interface User {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    hometown?: string;
}

export interface RouteData {
    id: string;
    userId: string;
    name: string;
    isPublic: boolean;
    distance: number;
    elevationGain: number;
    startLocation: string;
    createdAt: string;
    updatedAt?: string;
    geoJson: any; // Full GeoJSON
    // Compatibility fields with mock
    previewGeoJson?: any;
    fullGeoJson?: any;
    waypoints?: any[];
    segments?: any[];
}

export const mockService = {
    // --- Auth ---
    signup: async (email: string, password: string, username: string, hometown?: string): Promise<{ user: User | null; error: string | null }> => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username, hometown } // These go to user_metadata
                }
            });

            if (error) return { user: null, error: error.message };
            if (!data.user) return { user: null, error: 'Signup failed' };

            // Profile creation is typically handled by DB Trigger.
            const user: User = {
                id: data.user.id,
                email: data.user.email!,
                username,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                hometown
            };
            return { user, error: null };
        } catch (e) {
            console.error('Signup error:', e);
            return { user: null, error: 'Network error' };
        }
    },

    login: async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { user: null, error: error.message };

            // Fetch profile for additional fields
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

            const user: User = {
                id: data.user.id,
                email: data.user.email!,
                username: profile?.username || data.user.user_metadata.username || email.split('@')[0],
                avatar: profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.email}`,
                hometown: profile?.hometown
            };

            // Legacy LocalStorage cleanup/compatibility if needed, but app should rely on this return
            return { user, error: null };
        } catch (e) {
            console.error('Login error:', e);
            return { user: null, error: 'Network error' };
        }
    },

    logout: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('trailnav_current_user');
    },

    getCurrentUser: (): User | null => {
        // Warning: This is synchronous and might not reflect Supabase async state perfectly on reload.
        // Ideally, the App should use onAuthStateChange. 
        // For compat, we return null to force re-login or async check if implemented.
        return null;
    },

    async getSessionUser(): Promise<User | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

        return {
            id: session.user.id,
            email: session.user.email!,
            username: profile?.username || session.user.user_metadata.username || '',
            avatar: profile?.avatar,
            hometown: profile?.hometown
        };
    },

    updateProfile: async (userId: string, updates: Partial<User>): Promise<{ user: User | null; error: string | null }> => {
        const { error } = await supabase.from('profiles').update({
            username: updates.username,
            hometown: updates.hometown,
            avatar: updates.avatar,
            updated_at: new Date().toISOString()
        }).eq('id', userId);

        if (error) return { user: null, error: error.message };
        return { user: updates as User, error: null };
    },

    // --- Route Persistence ---
    saveRoute: async (_userId: string, route: any): Promise<{ route: RouteData | null; error: string | null }> => {
        try {
            // Check for active session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('Save Route: No active session.');
                return { route: null, error: 'Not logged in (or email not confirmed)' };
            }

            // We store waypoints AND SEGMENTS inside the jsonb column to preserve them
            const geoJsonWithData = {
                ...route.geoJson,
                waypoints: route.waypoints || [],
                segments: route.segments || [] // Crucial for Undo functionality
            };

            const payload = {
                user_id: session.user.id,
                name: route.name,
                description: route.description,
                is_public: route.isPublic,
                distance: route.distance,
                elevation_gain: route.elevationGain,
                start_location: route.startLocation,
                geojson: geoJsonWithData
            };

            const { data, error } = await supabase
                .from('routes')
                .insert(payload)
                .select()
                .single();

            if (error) return { route: null, error: error.message };

            return { route: mapSupabaseRoute(data), error: null };
        } catch (e) {
            console.error('Save route error:', e);
            return { route: null, error: 'Network error' };
        }
    },

    updateRoute: async (routeId: string, updates: any): Promise<{ route: RouteData | null; error: string | null }> => {
        const payload: any = { updated_at: new Date().toISOString() };
        if (updates.name) payload.name = updates.name;
        if (updates.isPublic !== undefined) payload.is_public = updates.isPublic;
        if (updates.geoJson) {
            const merged = {
                ...updates.geoJson,
                waypoints: updates.waypoints || [],
                segments: updates.segments || []
            };
            payload.geojson = merged;
            payload.distance = updates.distance;
            payload.elevation_gain = updates.elevationGain;
        }

        const { data, error } = await supabase.from('routes').update(payload).eq('id', routeId).select().single();
        if (error) return { route: null, error: error.message };

        return { route: mapSupabaseRoute(data), error: null };
    },

    getUserRoutes: async (userId: string): Promise<RouteData[]> => {
        try {
            const { data, error } = await supabase
                .from('routes')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (error) return [];
            return data.map(mapSupabaseRoute);
        } catch (e) {
            return [];
        }
    },

    deleteRoute: async (routeId: string): Promise<boolean> => {
        const { error } = await supabase.from('routes').delete().eq('id', routeId);
        return !error;
    },

    getRouteById: async (routeId: string): Promise<RouteData | null> => {
        const { data, error } = await supabase.from('routes').select('*').eq('id', routeId).single();
        if (error || !data) return null;
        return mapSupabaseRoute(data);
    },

    // Phase 12 Search
    searchRoutes: async (query: string, filters?: { minDist?: number; maxDist?: number; minElev?: number; maxElev?: number }): Promise<RouteData[]> => {
        try {
            let dbQuery = supabase
                .from('routes')
                .select('*')
                .eq('is_public', true)
                .ilike('name', `%${query}%`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (filters?.minDist) dbQuery = dbQuery.gte('distance', filters.minDist);
            if (filters?.maxDist) dbQuery = dbQuery.lte('distance', filters.maxDist);
            if (filters?.minElev) dbQuery = dbQuery.gte('elevation_gain', filters.minElev);
            if (filters?.maxElev) dbQuery = dbQuery.lte('elevation_gain', filters.maxElev);

            const { data, error } = await dbQuery;
            if (error) return [];
            return data.map(mapSupabaseRoute);
        } catch (e) {
            console.error('Search error:', e);
            return [];
        }
    },

    seedPublicRoutes: async () => {
        // No-op
    }
};

function mapSupabaseRoute(row: any): RouteData {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        isPublic: row.is_public,
        distance: row.distance,
        elevationGain: row.elevation_gain,
        startLocation: row.start_location,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        geoJson: row.geojson,
        fullGeoJson: row.geojson,
        previewGeoJson: row.geojson,
        waypoints: row.geojson?.waypoints || [],
        segments: row.geojson?.segments || []
    };
}
