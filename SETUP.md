# RouteSmith Setup Guide

This guide describes how to set up **RouteSmith** on a new server or development machine.

## Prerequisites

- **Node.js**: Version 18+ recommended
- **NPM**: Included with Node.js
- **Git**: For cloning the repository
- **Mapbox API Key**: Required for map features ([Get one free](https://www.mapbox.com/))
- **Supabase Account**: Required for backend ([Create one free](https://supabase.com/))

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/andykumeda/RouteSmith.git
cd RouteSmith
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and add your credentials:
   ```env
   # Mapbox Configuration
   VITE_MAPBOX_TOKEN=pk.eyJ1... (your actual token)
   
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   > **Getting Mapbox Token**: Sign up at [mapbox.com](https://www.mapbox.com/). The token must have `public` scope.
   
   > **Getting Supabase Credentials**: 
   > 1. Create a project at [supabase.com](https://supabase.com/)
   > 2. Go to Settings → API
   > 3. Copy the "Project URL" and "anon public" key

### 4. Set Up Supabase Database

1. Navigate to your Supabase project dashboard
2. Go to **SQL Editor**
3. Create a new query and paste the following schema:

```sql
-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profiles table (auto-created by Supabase Auth trigger)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar TEXT,
    hometown TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes table with PostGIS support
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    distance NUMERIC NOT NULL,
    elevation_gain NUMERIC NOT NULL,
    start_location TEXT,
    geojson JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_is_public ON routes(is_public);
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes(created_at DESC);

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Routes: Users can CRUD their own routes, read public routes
CREATE POLICY "Public routes are viewable by everyone"
    ON routes FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own routes"
    ON routes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routes"
    ON routes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routes"
    ON routes FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, avatar)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. Click **Run** to execute the schema

### 5. Configure Supabase Authentication

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Email** provider
3. **Important**: Go to **Authentication** → **Settings**
4. **Disable** "Confirm email" (or users won't be able to save routes immediately after signup)
5. Save changes

## Running the Application

### Development Mode
To run the app locally with hot-reloading:

```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

### Production Build
To build for production deployment:

```bash
npm run build
```
The built files will be in the `dist/` directory.

### Deploy to Nginx
If you have Nginx configured and `/var/www/routesmith` set up:

```bash
npm run deploy
```
This will build and copy files to the production directory (requires sudo).

## Nginx Configuration (Optional)

If deploying to a server with Nginx, use this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;  # Change this

    root /var/www/routesmith;
    index index.html;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: Proxy API requests if you add a backend later
    # location /api {
    #     proxy_pass http://localhost:3002;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection 'upgrade';
    #     proxy_set_header Host $host;
    #     proxy_cache_bypass $http_upgrade;
    # }
}
```

## Troubleshooting

### Map not showing?
- Verify `VITE_MAPBOX_TOKEN` is correct in `.env.local`
- Restart the development server after changing `.env.local`
- Check browser console for token errors

### Routes not saving?
- Ensure you ran the SQL schema in Supabase
- Check that "Confirm email" is disabled in Supabase Auth settings
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check browser console for Supabase errors

### Build errors?
- Run `npm install` to ensure all dependencies are installed
- Check that TypeScript compilation passes: `npx tsc --noEmit`
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

### "Table not found" errors?
- You likely forgot to run the SQL schema in Supabase SQL Editor
- Go back to Step 4 and execute the schema

## Verification Checklist

After setup, verify everything works:

- [ ] Development server starts without errors
- [ ] Map loads and displays correctly
- [ ] You can click to add waypoints
- [ ] Elevation profile appears
- [ ] You can sign up for an account
- [ ] You can log in
- [ ] You can save a route
- [ ] Saved route appears in "My Routes"
- [ ] You can share a route (copy link)
- [ ] Shared link opens the route in read-only mode

## Next Steps

Once setup is complete:
1. Read [HANDOFF.md](HANDOFF.md) for architecture overview
2. Review [README.md](README.md) for feature documentation
3. Check [RouteSmith-PRD.md](RouteSmith-PRD.md) for product requirements

## Support

For issues or questions:
- Check [HANDOFF.md](HANDOFF.md) debugging section
- Review Supabase logs in dashboard
- Open an issue on GitHub
