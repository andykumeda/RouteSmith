# RouteSmith

**Craft Your Route** - A premium web-based hiking and trail navigation platform that allows users to plan routes with high-precision path snapping, visualize elevation profiles, and share routes with the community.

## 🚀 Key Features

- **Interactive Mapping**: Built with Mapbox GL JS, supporting multiple map styles (Streets, Satellite, Outdoors)
- **Intelligent Routing**: Automatic path snapping using Mapbox Directions API with manual mode toggle
- **Elevation Profiles**: High-resolution elevation charts with synchronized hover tracking between map and chart
- **POI Markers**: Add custom waypoints for water sources, hazards, trail closures, and photo opportunities
- **Use Your Way**: **Light/Dark Mode** support with automatic system preference detection
- **Unit Support**: Seamless switching between (km/m) and (mi/ft) units
- **User Authentication**: Secure signup/login powered by Supabase Auth
- **Route Persistence**: Save, edit, and manage routes in Supabase PostgreSQL with PostGIS
- **Route Sharing**: Share routes via deep links with read-only viewing mode
- **Route Discovery**: Search and filter public routes by name, distance, and elevation
- **GPX Support**: Import and export GPX files with full elevation data preservation

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: Zustand
- **Mapping**: Mapbox GL JS, Turf.js
- **Charts**: Recharts

### Backend
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Authentication**: Supabase Auth
- **Storage**: Route data stored as JSONB with spatial indexing

## 🏁 Getting Started

### Prerequisites
- Node.js 18+ 
- Mapbox API token ([Get one free](https://www.mapbox.com/))
- Supabase project ([Create one free](https://supabase.com/))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/andykumeda/RouteSmith.git
   cd RouteSmith
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**: 
   Create a `.env.local` file with your credentials:
   ```env
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**:
   - Navigate to your Supabase project dashboard
   - Go to SQL Editor and run the schema from `supabase_schema.sql` (found in project artifacts)
   - This creates the `profiles` and `routes` tables with PostGIS support

5. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

### Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to Nginx** (if configured):
   ```bash
   npm run deploy
   ```
   This builds and copies files to `/var/www/routesmith`

## 📂 Project Structure

```
RouteSmith/
├── src/
│   ├── components/       # React components
│   │   ├── map/         # Map and elevation components
│   │   ├── layout/      # Sidebar, search, navigation
│   │   ├── auth/        # Authentication modals
│   │   └── dashboard/   # User route management
│   ├── store/           # Zustand state stores
│   │   ├── useRouteStore.ts    # Route and waypoint state
│   │   ├── useAuthStore.ts     # User authentication
│   │   └── useSettingsStore.ts # App preferences
│   ├── lib/             # Utility functions
│   │   ├── supabase.ts         # Supabase client
│   │   ├── mockService.ts      # API service layer
│   │   ├── mapboxUtils.ts      # Directions & elevation
│   │   ├── geoUtils.ts         # Geo calculations
│   │   └── gpxUtils.ts         # GPX import/export
│   └── hooks/           # Custom React hooks
├── public/              # Static assets
└── nginx.conf          # Nginx configuration example
```

## 🎯 Usage Guide

### Creating a Route
1. Click on the map to add waypoints
2. The route automatically snaps to walking paths
3. Toggle "Manual Mode" for direct point-to-point lines
4. View real-time distance and elevation gain in the sidebar

### Managing Waypoints
- **Drag markers** to adjust the route
- **Click markers** to add comments, dates, or photos
- **Delete Tool**: Click the trash icon, then click markers to remove them
- **Undo**: Remove the last added waypoint

### Adding POI Markers
POI (Point of Interest) markers are only available for saved routes:
- 💧 **Water**: Mark water sources
- ⚠️ **Hazard**: Note dangerous sections
- 🚫 **Closed**: Mark trail closures
- 📷 **Photo Op**: Add photos with captions

### Saving and Sharing
1. Click "Save Route" (requires login)
2. Routes are saved to your Supabase account
3. Click "Share" to copy a shareable link
4. Shared routes open in read-only mode

### Searching Routes
1. Click "Search Routes" in the sidebar
2. Filter by distance and elevation ranges
3. Click any result to preview on the map

## 🔧 Configuration

### Nginx Setup
The included `nginx.conf` provides a reference configuration:
- Serves static files from `/var/www/routesmith`
- Handles SPA routing with `try_files`
- Proxies `/api` requests (if needed for future backend)

### Supabase Configuration
Ensure Row Level Security (RLS) policies are enabled:
- Users can only edit their own routes
- Public routes are readable by all
- Profile creation is handled via database triggers

## 🗺 Roadmap

See [HANDOFF.md](HANDOFF.md) for detailed implementation status and pending features.

### Completed
- ✅ Core mapping and routing
- ✅ Elevation profiles with synchronized hover
- ✅ User authentication (Supabase)
- ✅ Route persistence and sharing
- ✅ Search and discovery
- ✅ GPX import/export
- ✅ POI markers with photos
- ✅ Manual/Auto routing toggle
- ✅ **Light/Dark Mode** support

### Planned
- 🔄 Route collections (wishlists, completed)
- 🔄 Social features (favorites, comments)
- 🔄 Mobile app (React Native)
- 🔄 Offline mode with service workers

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Contact

For questions or support, please open an issue on GitHub.
