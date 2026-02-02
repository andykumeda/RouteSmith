# Project Handoff: RouteSmith

This document provides a comprehensive summary of the current state of RouteSmith and guidance for continuing development.

## 📍 Current State (February 2026)

RouteSmith is a **production-ready** hiking route planning application with full backend integration via Supabase. The application has migrated from a mock localStorage backend to a cloud-based PostgreSQL database with PostGIS spatial extensions.

### Architecture Overview

**Frontend Stack:**
- React 19 + TypeScript + Vite
- Tailwind CSS for styling
- Zustand for state management
- Mapbox GL JS for mapping
- Recharts for elevation visualization

**Backend Stack:**
- Supabase (PostgreSQL + PostGIS)
- Supabase Auth for user management
- Row Level Security (RLS) for data access control
- JSONB storage for route geometry, waypoints, and segments

### Completed Features

#### Core Functionality (Phases 1-11)
- ✅ Interactive map with Mapbox GL JS
- ✅ Intelligent routing with Mapbox Directions API
- ✅ Manual mode toggle for direct point-to-point routing
- ✅ High-resolution elevation profiles
- ✅ Synchronized hover between map and elevation chart
- ✅ Metric/Imperial unit conversion
- ✅ Waypoint dragging and editing
- ✅ GPX import and export with elevation data

#### Authentication & Persistence (Phase 10-11)
- ✅ User signup/login via Supabase Auth
- ✅ Route saving to Supabase PostgreSQL
- ✅ Route editing and deletion
- ✅ User profile management
- ✅ Route sharing via deep links
- ✅ Read-only mode for shared routes

#### Search & Discovery (Phase 12)
- ✅ Public route search by name
- ✅ Distance and elevation filters
- ✅ Route preview on map
- ✅ Seeded public routes for testing

#### POI & Enhancements (Phase 11.5-11.10)
- ✅ POI markers (Water, Hazard, Closed, Camera)
- ✅ Photo uploads with captions for Camera POIs
- ✅ Comments and dates on waypoints
- ✅ Delete tool for surgical waypoint removal
- ✅ Undo functionality

### Recent Critical Fixes

#### Supabase Migration (Latest Session)
- **Backend Replacement**: Completely migrated from localStorage to Supabase
- **Data Persistence**: Routes now store `waypoints` and `segments` in JSONB column
- **Undo Fix**: Resolved issue where undo cleared entire route by persisting segment data
- **Session Management**: Added session checks to prevent RLS errors
- **POI Visibility**: POI controls now only appear for saved routes

#### UI/UX Improvements
- **New Route Button**: Added (+) button to start fresh routes from any state
- **Sidebar Collapse**: Fixed overflow issue preventing proper collapse animation
- **Logo Update**: Changed from PNG to SVG format

#### Build & Deployment
- **TypeScript Errors**: Fixed unused imports and variables blocking production builds
- **Deploy Script**: Added `npm run deploy` command for automated deployment
- **Nginx Config**: Provided reference configuration for production serving

## 📋 Pending Tasks & Known Issues

### High Priority
1. **Email Confirmation**: User must disable "Confirm email" in Supabase Auth settings for seamless signup
2. **Database Schema**: User must manually run SQL schema in Supabase SQL Editor (see artifacts)
3. **Environment Variables**: Ensure `.env.local` contains all required Supabase credentials

### Medium Priority
1. **Route Collections**: Implement wishlists or "completed" route groupings
2. **Social Features**: Add favorites/likes for public routes
3. **Performance**: Consider code-splitting to reduce initial bundle size (currently 2.6MB)
4. **Error Handling**: Improve user-facing error messages for network failures

### Low Priority / Future Enhancements
1. **Offline Mode**: Service worker for offline route viewing
2. **Mobile App**: React Native version
3. **AI Path Blacklisting**: Avoid specific segments based on user preferences
4. **Route Analytics**: Track popular routes and user statistics

## 🛠 Technical Notes for Next Developer

### State Management
All application state is managed through Zustand stores:

- **`useRouteStore`** (`src/store/useRouteStore.ts`):
  - Manages waypoints, segments, and route geometry
  - Handles undo/redo operations
  - Critical: Always use `getState()` in event listeners to avoid closure traps
  
- **`useAuthStore`** (`src/store/useAuthStore.ts`):
  - Manages user authentication state
  - Syncs with Supabase Auth sessions
  
- **`useSettingsStore`** (`src/store/useSettingsStore.ts`):
  - Handles unit preferences (metric/imperial)
  - Persists to localStorage

### Data Flow

1. **Route Creation**:
   - User clicks map → `addWaypoint()` in `useRouteStore`
   - Mapbox Directions API called for routing
   - Elevation API called for profile data
   - Segments and waypoints stored in state

2. **Route Saving**:
   - `handleSave()` in `App.tsx` collects full state
   - `mockService.saveRoute()` packages data with waypoints + segments in JSONB
   - Supabase insert with session user ID
   - Route ID returned and stored in state

3. **Route Loading**:
   - `loadFullRoute()` in `useRouteStore` restores all state
   - Waypoints and segments extracted from JSONB
   - Map markers and route line rendered

### Critical Code Patterns

#### Avoiding Closure Traps
```typescript
// ❌ BAD - captures stale state
map.on('click', () => {
  addWaypoint(lng, lat); // May use old state
});

// ✅ GOOD - always fresh state
map.on('click', () => {
  const { addWaypoint } = useRouteStore.getState();
  addWaypoint(lng, lat);
});
```

#### Supabase Data Structure
Routes are stored with this structure:
```typescript
{
  user_id: string,
  name: string,
  distance: number,
  elevation_gain: number,
  geojson: {
    type: 'FeatureCollection',
    features: [...],
    waypoints: [...],  // Custom field
    segments: [...]    // Custom field
  }
}
```

### File Organization

**Key Files to Understand:**
- `src/App.tsx`: Main application component, handles save/share/export
- `src/components/map/MapComponent.tsx`: Complex Mapbox integration, marker management
- `src/components/map/ElevationProfile.tsx`: Recharts integration with custom hover sync
- `src/lib/mockService.ts`: Supabase API service layer (misnamed, should be renamed)
- `src/store/useRouteStore.ts`: Core routing logic (776 lines)

**Files Safe to Modify:**
- UI components in `src/components/`
- Utility functions in `src/lib/`
- Zustand stores (with caution)

**Files to Avoid Modifying:**
- `src/lib/geoUtils.ts`: Battle-tested geo calculations
- `src/lib/mapboxUtils.ts`: Stable API integrations

## 🚀 How to Resume Development

### Quick Start
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy (requires sudo for /var/www access)
npm run deploy
```

### First-Time Setup Checklist
1. ✅ Clone repository
2. ✅ Run `npm install`
3. ✅ Create `.env.local` with Mapbox + Supabase credentials
4. ✅ Run SQL schema in Supabase SQL Editor
5. ✅ Disable "Confirm email" in Supabase Auth settings
6. ✅ Test signup/login flow
7. ✅ Create and save a test route

### Debugging Tips

**Map not showing?**
- Check `VITE_MAPBOX_TOKEN` in `.env.local`
- Verify token has public scope in Mapbox dashboard

**Routes not saving?**
- Check browser console for Supabase errors
- Verify RLS policies in Supabase dashboard
- Ensure user is logged in (check `useAuthStore` state)

**Undo clearing entire route?**
- This was fixed by persisting segments in JSONB
- Only affects routes saved before the fix
- Re-save old routes to upgrade their data structure

**POI buttons not appearing?**
- POI controls only show for saved routes (when `routeId` exists)
- This is intentional to prevent confusion on new routes

## 📊 Project Metrics

- **Total Lines of Code**: ~15,000 (excluding node_modules)
- **Components**: 25+
- **Zustand Stores**: 3
- **API Integrations**: Mapbox (Directions, Geocoding, Elevation), Supabase
- **Bundle Size**: 2.6MB (consider code-splitting)
- **Browser Support**: Modern browsers with ES6+ support

## 🔐 Security Considerations

- **API Keys**: Never commit `.env.local` to git
- **RLS Policies**: Ensure users can only edit their own routes
- **XSS Prevention**: All user input (comments, captions) should be sanitized
- **CORS**: Supabase handles CORS automatically
- **Authentication**: Supabase JWT tokens expire after 1 hour

## 📞 Getting Help

- **Supabase Docs**: https://supabase.com/docs
- **Mapbox GL JS**: https://docs.mapbox.com/mapbox-gl-js/
- **Zustand**: https://github.com/pmndrs/zustand
- **Project PRD**: See `RouteSmith-PRD.md` for original requirements

## 🎯 Recommended Next Steps

1. **Rename `mockService.ts`** to `apiService.ts` or `supabaseService.ts` (no longer a mock)
2. **Implement Route Collections**: Add a "collections" table in Supabase
3. **Add Loading States**: Show spinners during API calls
4. **Error Boundaries**: Wrap components in React error boundaries
5. **Analytics**: Add basic usage tracking (route creation, shares)
6. **Performance**: Implement code-splitting for faster initial load

---

**Last Updated**: February 1, 2026  
**Status**: Production Ready  
**Next Phase**: Route Collections & Social Features
