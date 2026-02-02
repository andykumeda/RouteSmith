# RouteSmith

RouteSmith is a premium web-based hiking and trail navigation platform. It allows users to plan routes with high-precision path snapping, visualize elevation profiles, and manage personal hiking data using a mock backend.

## 🚀 Key Features

- **Interactive Map**: Built with Mapbox GL JS, supporting multiple layers (Streets, Satellite, Outdoors).
- **Intelligent Routing**: Automatic path snapping using Mapbox Directions API.
- **Elevation Profiles**: High-resolution elevation charts with synchronized hover tracking between the map and the chart.
- **Unit Support**: Seamless switching between Metric (km/m) and Imperial (mi/ft) units.
- **Mock Backend**: Full support for user accounts, route saving, and sharing via `localStorage`.
- **GPX Support**: Import and export GPX files with elevation data.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, TypeScript.
- **Styling**: Tailwind CSS, Lucide React icons.
- **Mapping**: Mapbox GL JS, Turf.js.
- **Charts**: Recharts.
- **State Management**: Zustand.

## 🏁 Getting Started

1.  **Clone the repository**.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Setup**: Create a `.env` file and add your Mapbox token:
    ```
    VITE_MAPBOX_TOKEN=your_token_here
    ```
4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## 📂 Project Structure

- `src/components`: UI components (map, sidebar, auth, etc.).
- `src/store`: Zustand stores for routes, auth, and settings.
- `src/lib`: Utility functions for geo-calculations and mock services.
- `src/hooks`: Custom React hooks.

## 🗺 Roadmap

See [HANDOFF.md](HANDOFF.md) for current implementation status and pending tasks.
