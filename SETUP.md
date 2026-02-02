# RouteSmith Deployment Guide

This guide describes how to set up **RouteSmith** on a new server or development machine.

## Prerequisites

- **Node.js**: Version 18+ recommended
- **NPM**: Included with Node.js
- **Git**: For cloning the repository
- **Mapbox API Key**: Required for map features

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
   cp .env.example .env
   ```

2. Open `.env` and add your Mapbox token:
   ```env
   VITE_MAPBOX_TOKEN=pk.eyJ1... (your actual token)
   ```

   > **Note**: You can get a free token by signing up at [mapbox.com](https://www.mapbox.com/). The token must have `public` scope.

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
The built files will be in the `dist/` directory. You can serve these files using any static file server (Nginx, Apache, Vercel, Netlify, etc.).

## Troubleshooting

- **Map not showing?** Check that your `VITE_MAPBOX_TOKEN` is correct in `.env` and restart the development server.
- **Save failed?** Ensure you are not hitting the localStorage quota (known issue, fix pending).
