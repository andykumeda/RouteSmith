# Product Requirements Document: RouteSmith

## 1. Executive Summary

**Product Name:** RouteSmith  
**Version:** 1.0  
**Date:** January 31, 2026  
**Document Owner:** Product Team

### 1.1 Purpose
RouteSmith is a web-based route planning application for runners, hikers, and cyclists. It enables users to create, modify, and analyze routes through an interactive map interface with intelligent path snapping, GPX import/export, and comprehensive route statistics.

### 1.2 Success Metrics
- User engagement: Average session duration >10 minutes
- Route creation completion rate >70%
- GPX export rate >40% of created routes
- User retention: 30-day return rate >35%

---

## 2. Product Overview

### 2.1 Problem Statement
Outdoor enthusiasts need an intuitive, feature-rich tool to plan routes for activities without purchasing expensive standalone GPS devices or struggling with limited mobile app interfaces. Existing solutions lack comprehensive features or have poor user experience.

### 2.2 Target Users
- **Primary:** Recreational runners, hikers, and cyclists planning new routes
- **Secondary:** Ultra-runners and endurance athletes requiring detailed route analysis
- **Tertiary:** Race directors and event organizers creating course maps

### 2.3 Key Differentiators
- Intelligent snap-to-trail/road functionality
- Seamless GPX modification workflow
- AI-powered route suggestions and optimization
- Comprehensive feature parity with established tools (Drifter, Ultrapacer)

---

## 3. Feature Requirements

### 3.1 Phase 1: Core Functionality (MVP)

#### 3.1.1 Interactive Map Interface
**Priority:** P0 (Must Have)

**Requirements:**
- Display base map using OpenStreetMap, Mapbox, or similar provider
- Support multiple map layers:
  - Standard street view
  - Satellite/aerial imagery
  - Topographic maps
  - Trail overlay layer
- Zoom and pan controls (mouse, touch, keyboard)
- Geolocation support to center on user's current location
- Responsive design supporting desktop (1920x1080 minimum) and tablet (768px minimum width)

**Technical Considerations:**
- Use Leaflet.js or Mapbox GL JS for map rendering
- Tile caching for offline capability (future phase)
- Vector tiles for trail/road data where available

---

#### 3.1.2 Route Creation via Click-and-Draw
**Priority:** P0 (Must Have)

**Requirements:**

**Click-to-Create:**
- User clicks on map to set waypoints
- First click establishes route start point
- Subsequent clicks add waypoints
- System automatically connects waypoints with route segments

**Intelligent Path Snapping:**
- Snap clicks to nearest trail/road/path within configurable radius (default: 50m)
- Prioritize path types based on activity mode:
  - Running: trails, paths, roads (in order)
  - Hiking: trails, paths, unpaved roads
  - Cycling: bike paths, roads, trails
- Visual feedback showing snap target before confirmation
- Option to disable snapping for off-trail segments
- Routing algorithm uses actual trail/road network (not straight lines)

**Route Building:**
- Real-time route rendering as waypoints are added
- Visual distinction between confirmed segments and preview segment
- Undo/redo functionality for waypoint placement
- Delete individual waypoints with route auto-recalculation
- Drag-to-reposition waypoints with dynamic re-routing
- "Close loop" option to auto-connect end to start
- "Finish route" button to complete creation

**Visual Design:**
- Route line: 4px width, activity-specific color (running: blue, hiking: green, cycling: orange)
- Waypoint markers: numbered circles showing creation order
- Hover states showing segment distance between waypoints
- Elevation profile preview on hover

**Technical Considerations:**
- Use routing service (OSRM, GraphHopper, or Valhalla) for pathfinding
- Client-side caching of routing responses
- Debounce route recalculation during rapid clicks
- Maximum waypoints: 500 per route

---

#### 3.1.3 Route Statistics Panel
**Priority:** P0 (Must Have)

**Requirements:**

**Core Statistics:**
- Total distance (miles and kilometers, user-selectable)
- Total elevation gain (feet and meters)
- Total elevation loss
- Estimated time based on activity type and pace:
  - Running: Configurable pace (default: 10 min/mile)
  - Hiking: Naismith's rule or configurable pace
  - Cycling: Configurable speed (default: 12 mph)
- Net elevation change
- Lowest point elevation
- Highest point elevation

**Elevation Profile:**
- Interactive chart showing elevation vs. distance
- Hover to see elevation at specific points
- Click to jump to location on map
- Highlight current map view section
- Gradient/color coding by steepness
- Toggle between metric and imperial units

**Advanced Metrics:**
- Grade distribution (% of route at different slopes)
- Estimated calories burned
- Surface type breakdown (paved/unpaved/trail %)
- Difficulty rating (calculated from distance, elevation, grade)

**UI Requirements:**
- Collapsible/expandable panel (desktop: sidebar, mobile: bottom sheet)
- Real-time updates as route is modified
- Export statistics to CSV or PDF
- Print-friendly route summary

**Technical Considerations:**
- Use Chart.js or Recharts for elevation profile
- Sample elevation data at appropriate intervals (every 10-50m)
- Use elevation API (Google Elevation API, Open-Topo-Data) for accurate data

---

#### 3.1.4 GPX Export
**Priority:** P0 (Must Have)

**Requirements:**

**Export Functionality:**
- Download route as GPX 1.1 format file
- Filename format: `[route-name]_[date]_[activity].gpx`
- Include all waypoints and route track
- Embed metadata:
  - Route name
  - Activity type
  - Creation date
  - Creator/author
  - Description
  - Total distance and elevation
- Include elevation data for all track points
- Single-click export from route editor or route library

**Export Options:**
- Track points density (high/medium/low)
- Include waypoints as POIs
- Include route statistics in description
- Course format vs. track format selection

**Technical Considerations:**
- Use GPX library (gpxbuilder, togpx) for generation
- Validate GPX output against schema
- Handle browser download security policies
- Maximum file size warning (>5MB)

---

#### 3.1.5 GPX Import and Modification
**Priority:** P0 (Must Have)

**Requirements:**

**Import Functionality:**
- Drag-and-drop GPX file onto map interface
- Browse-and-upload option
- Support GPX 1.0 and 1.1 formats
- Parse and display route/track on map
- Import waypoints as editable POIs
- Handle multiple tracks/routes in single file (show selection dialog)
- Preserve original metadata when possible

**Post-Import Editing:**
- All route creation tools available on imported routes
- Add/remove/move waypoints
- Extend route from start or end
- Split route at any point
- Reverse route direction
- Merge multiple imported routes
- Detect and handle overlapping segments

**Error Handling:**
- Invalid file format notification
- Corrupted GPX repair attempts
- Large file warning (>10MB)
- Elevation data missing notification with auto-fetch option
- Coordinate system conversion if needed

**Technical Considerations:**
- Use GPX parser library (gpx-parser-builder, togeojson)
- Convert GPX to internal route format
- Memory management for large files (>1000 waypoints)
- Support TCX and KML formats (Phase 2)

---

#### 3.1.6 Points of Interest (POI) Management
**Priority:** P1 (Should Have)

**Requirements:**

**POI Creation:**
- Click map to add custom POI
- Predefined POI categories:
  - Water sources
  - Restrooms
  - Parking
  - Viewpoints
  - Shelters/camping
  - Aid stations
  - Hazards/warnings
  - Custom/other
- Custom POI naming and descriptions
- Photo attachment capability (max 5MB per photo)
- Icon selection (category-specific icons)

**POI Display:**
- Toggle POI visibility by category
- Color-coded markers by category
- Click POI to view details popup
- Distance from route indicator
- Elevation at POI location

**POI Management:**
- Edit POI details
- Move POI by dragging
- Delete individual or bulk POIs
- Export POIs with route
- Import POIs from GPX waypoints

**Technical Considerations:**
- Store POIs separately from route waypoints
- Include POIs in GPX export as waypoints with extensions
- POI database for common features (future: crowd-sourced)

---

#### 3.1.7 Search and Discovery
**Priority:** P1 (Should Have)

**Requirements:**

**Search Capabilities:**
- Location-based search:
  - Address search (geocoding)
  - Place name search
  - Coordinates input (lat/long, UTM)
  - "Near me" current location search
- Map title/name search in saved routes
- Keyword/tag search in route descriptions
- Advanced filters:
  - Distance range (e.g., 5-10 miles)
  - Elevation gain range
  - Activity type
  - Difficulty rating
  - Surface type
  - Creation date range

**Search Results:**
- Results displayed as list and map markers
- Sort by relevance, distance, popularity, date
- Result preview showing key stats
- Click result to view route details
- Hover result to highlight on map

**Autocomplete and Suggestions:**
- Search-as-you-type suggestions
- Recent searches
- Popular searches in area
- Intelligent query interpretation

**Technical Considerations:**
- Use geocoding service (Mapbox Geocoding, Nominatim)
- Implement search indexing for saved routes
- Client-side filtering for small datasets
- Server-side search for large route libraries (Phase 2)

---

#### 3.1.8 Drifter.com Feature Parity
**Priority:** P1 (Should Have)

Based on hellodrifter.com analysis, implement:

**Route Planning:**
- ✓ Click-to-create routes (covered above)
- ✓ Snap to trails/roads (covered above)
- ✓ Activity type selection (running/hiking/cycling)
- Round-trip route generator (out-and-back, loop options)
- Elevation-aware routing (prefer flat, prefer hills, avoid steep)

**Map Features:**
- Multiple base map options (standard, satellite, terrain)
- 3D terrain visualization
- Heatmap overlay showing popular routes
- Weather layer integration
- Public lands overlay (national parks, forests, BLM)

**Route Library:**
- Save routes to personal library
- Route naming and descriptions
- Route tagging system
- Route privacy settings (private, unlisted, public)
- Route sharing via link
- Route duplication/copying

**Social Features (Phase 2):**
- Public route discovery
- User profiles
- Route likes/favorites
- Route comments
- Follow other users

**Technical Considerations:**
- Analyze Drifter's UI/UX for best practices
- Match or exceed routing algorithm quality
- Implement responsive design matching Drifter's polish

---

### 3.2 Phase 2: Integration and Advanced Features

#### 3.2.1 Strava Integration
**Priority:** P2 (Nice to Have)

**Requirements:**

**OAuth Authentication:**
- "Connect with Strava" button
- Secure OAuth 2.0 flow
- Token refresh handling
- Disconnection option

**Activity Import:**
- Import completed activities from Strava
- Convert activities to editable routes
- Import activity photos and descriptions
- Bulk import last N activities

**Activity Export:**
- Export planned routes to Strava as routes
- Post-activity upload comparison (planned vs. actual)
- Share completed activities back to Strava

**Strava Data Display:**
- Show Strava segments on map
- Display personal records on segments
- View effort/pace data overlaid on route

**Technical Considerations:**
- Use Strava API v3
- Rate limiting compliance (100 requests/15min, 1000 requests/day)
- Handle API deprecations and changes
- Data privacy compliance (GDPR, user consent)

---

#### 3.2.2 Ultrapacer Functionality
**Priority:** P2 (Nice to Have)

Based on ultrapacer.com features:

**Pace Planning:**
- Time-based pacing calculator
- Segment-based pace planning
- Walking vs. running pace differentiation
- Adjust pace by grade (uphill/downhill multipliers)
- Rest/aid station time planning
- Night vs. day pace adjustment

**Race Planning:**
- Aid station placement and timing
- Drop bag planning
- Crew meet point scheduling
- Cutoff time tracking
- Time of day at waypoints (sunrise/sunset awareness)

**Performance Analysis:**
- Predicted finish time ranges (best/expected/worst)
- Historical performance comparison
- Fatigue modeling (pace degradation over distance)
- Caloric expenditure and fueling schedule
- Hydration planning

**Live Tracking Preparation:**
- Generate tracking links for crew/family
- Expected arrival times at checkpoints
- SMS notification setup
- GPX export for GPS watch upload

**Technical Considerations:**
- Complex pacing algorithms requiring testing/validation
- Store pacing profiles per user
- Integration with wearable devices (Phase 3)

---

#### 3.2.3 AI Integration
**Priority:** P2 (Nice to Have)

**Requirements:**

**AI-Powered Route Suggestions:**
- "Generate route for me" based on:
  - Starting location
  - Distance preference
  - Elevation preference
  - Activity type
  - Desired features (water views, forest, city, etc.)
- Multiple route options with explanations
- "Routes similar to this" recommendations

**Intelligent Route Optimization:**
- "Optimize this route for..." (distance, elevation, scenery)
- Identify and suggest route improvements
- Hazard detection and warnings
- Surface quality prediction

**Natural Language Planning:**
- "Plan me a 10-mile hilly trail run near Golden Gate Park"
- Parse complex queries into route parameters
- Conversational refinement of routes

**Predictive Features:**
- Difficulty prediction for user's fitness level
- Personalized time estimates based on history
- Weather-aware route suggestions
- Crowding prediction for popular trails

**AI Assistant:**
- Chat interface for route planning help
- Answer questions about route features
- Trail recommendations based on preferences
- Training plan integration

**Technical Considerations:**
- Use Claude API or similar LLM for natural language processing
- Fine-tune model on outdoor activity data
- Implement RAG for trail database queries
- User privacy for AI feature usage
- Cost management for AI API calls

---

## 4. Technical Architecture

### 4.1 Technology Stack Recommendations

**Frontend:**
- Framework: React 18+ with TypeScript
- Map Library: Mapbox GL JS or Leaflet.js
- State Management: Redux Toolkit or Zustand
- UI Components: shadcn/ui or Material-UI
- Charts: Recharts or Chart.js
- Build Tool: Vite

**Backend (Phase 2+):**
- Runtime: Node.js with Express or Next.js API routes
- Database: PostgreSQL with PostGIS extension
- ORM: Prisma or TypeORM
- Authentication: NextAuth.js or Auth0
- File Storage: AWS S3 or Cloudflare R2

**APIs and Services:**
- Routing: OSRM (self-hosted) or Valhalla
- Geocoding: Mapbox Geocoding API
- Elevation: Open-Topo-Data or Google Elevation API
- Weather: OpenWeatherMap API
- Base Maps: Mapbox or OpenStreetMap tiles

**Hosting:**
- Frontend: Vercel, Netlify, or Cloudflare Pages
- Backend: Railway, Render, or AWS ECS
- Database: Supabase, Neon, or AWS RDS

### 4.2 Data Models

**Route:**
```typescript
interface Route {
  id: string;
  name: string;
  description: string;
  activityType: 'running' | 'hiking' | 'cycling';
  waypoints: Waypoint[];
  distance: number; // meters
  elevationGain: number; // meters
  elevationLoss: number;
  difficulty: number; // 1-5 scale
  surfaceTypes: SurfaceBreakdown;
  created: Date;
  modified: Date;
  userId?: string;
  privacy: 'private' | 'unlisted' | 'public';
  tags: string[];
}
```

**Waypoint:**
```typescript
interface Waypoint {
  id: string;
  latitude: number;
  longitude: number;
  elevation: number;
  order: number;
  type: 'route' | 'poi';
}
```

**POI:**
```typescript
interface POI {
  id: string;
  name: string;
  description: string;
  category: POICategory;
  latitude: number;
  longitude: number;
  elevation: number;
  photos: string[]; // URLs
  routeId: string;
}
```

### 4.3 Performance Requirements

- Initial page load: <3 seconds
- Map tile loading: <500ms per tile
- Route calculation: <2 seconds for typical routes (<50 miles)
- GPX import parsing: <1 second for files <1MB
- Smooth map interactions: 60fps
- Support routes up to 200 miles / 500 waypoints
- Concurrent users: 10,000+ (Phase 2)

### 4.4 Security and Privacy

- HTTPS for all traffic
- User data encryption at rest
- OAuth token secure storage
- GPX file virus scanning
- Rate limiting on API endpoints
- GDPR compliance for EU users
- User data export functionality
- Account deletion option

---

## 5. User Interface Specifications

### 5.1 Layout Structure

**Desktop (>1024px):**
```
┌─────────────────────────────────────────────┐
│ Header: Logo | Activity Type | User Menu    │
├──────────────┬──────────────────────────────┤
│              │                              │
│   Sidebar    │                              │
│   (Stats,    │        Map Canvas            │
│   Tools,     │      (Full Interactive)      │
│   Saved)     │                              │
│   300px      │                              │
│              │                              │
├──────────────┴──────────────────────────────┤
│ Footer: Help | Settings | About             │
└─────────────────────────────────────────────┘
```

**Mobile (<768px):**
```
┌─────────────────────────────────────────────┐
│ Header: Menu ≡ | Activity | Search 🔍       │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│           Map Canvas (Full)                 │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│ Bottom Sheet (Swipe Up): Stats & Tools     │
└─────────────────────────────────────────────┘
```

### 5.2 Key Interaction Patterns

**Route Creation Flow:**
1. User selects activity type
2. User clicks "Create Route"
3. Map enters creation mode (cursor changes)
4. First click places start marker
5. Subsequent clicks add waypoints with auto-routing
6. Stats panel updates in real-time
7. User clicks "Finish" or "Close Loop"
8. Route name dialog appears
9. Route saved to library

**GPX Import Flow:**
1. User clicks "Import GPX"
2. File picker or drag-drop area
3. File uploads and parses
4. Route renders on map with animation
5. Stats display
6. Edit mode available immediately
7. Save or discard options

### 5.3 Visual Design Guidelines

**Color Palette:**
- Primary: #2563eb (Blue) - Running
- Secondary: #16a34a (Green) - Hiking
- Accent: #ea580c (Orange) - Cycling
- Neutral: #64748b (Slate gray)
- Success: #10b981
- Warning: #f59e0b
- Error: #ef4444

**Typography:**
- Headings: Inter or Manrope (sans-serif)
- Body: Inter or system font stack
- Monospace: JetBrains Mono (for coordinates, stats)

**Spacing:**
- Use 4px base unit (4, 8, 12, 16, 24, 32, 48, 64px)

**Icons:**
- Lucide React or Heroicons
- 24px default size
- Consistent stroke width

---

## 6. Development Phases and Timeline

### Phase 1: MVP (12-16 weeks)

**Weeks 1-2: Foundation**
- Project setup and architecture
- Map integration basic implementation
- UI component library setup

**Weeks 3-6: Core Routing**
- Click-to-create functionality
- Path snapping algorithm
- Waypoint management
- Route statistics calculation

**Weeks 7-9: GPX Features**
- GPX export implementation
- GPX import and parsing
- Route editing on imported files

**Weeks 10-12: Polish and Features**
- POI management
- Search functionality
- Elevation profile visualization
- Responsive design

**Weeks 13-16: Testing and Launch**
- User testing and feedback
- Bug fixes and optimization
- Documentation
- Soft launch

### Phase 2: Advanced Features (8-12 weeks)

**Weeks 1-4:**
- Strava integration
- User accounts and authentication
- Route library backend

**Weeks 5-8:**
- Ultrapacer pacing features
- Advanced analytics
- Social features

**Weeks 9-12:**
- AI integration
- Route recommendations
- Performance optimization

### Phase 3: Scale and Enhance (Ongoing)

- Mobile app (React Native)
- Offline capabilities
- Advanced AI features
- Community features
- Premium tier features

---

## 7. Success Criteria and KPIs

### 7.1 Phase 1 Success Metrics

**User Acquisition:**
- 1,000 active users in first month
- 5,000 active users by month 3

**Engagement:**
- Average session: >10 minutes
- Routes created per user: >2
- Return rate (7-day): >40%

**Technical Performance:**
- 99.5% uptime
- <3s average page load
- <5% error rate on route creation

**User Satisfaction:**
- NPS score: >40
- Feature satisfaction: >4/5 average
- Support ticket resolution: <24 hours

### 7.2 Phase 2 Success Metrics

**Integration Success:**
- Strava connections: >30% of users
- Routes exported to Strava: >20% of created routes
- AI feature usage: >50% of users

**Growth:**
- 25,000 active users
- 100,000+ routes created
- 40% month-over-month growth

---

## 8. Risks and Mitigation

### 8.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Map API costs exceed budget | High | Medium | Implement caching, tile optimization, rate limiting |
| Routing quality poor | High | Medium | Test multiple routing engines, fallback options |
| Large GPX files cause crashes | Medium | Low | File size limits, streaming parsing, progress indicators |
| Mobile performance issues | Medium | Medium | Progressive enhancement, lazy loading, optimization |

### 8.2 Product Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low user adoption | High | Medium | Beta testing, marketing, community building |
| Feature creep delays launch | Medium | High | Strict MVP scope, phased releases |
| Competition from established players | Medium | High | Unique AI features, superior UX, niche focus |
| Strava API changes break integration | Medium | Low | Abstraction layer, fallback features, monitoring |

---

## 9. Open Questions

1. **Monetization strategy:** Free with ads? Freemium? Premium-only?
2. **Data storage:** How long to retain user routes? Storage limits?
3. **Map data licensing:** Self-hosted OSM tiles or paid service?
4. **AI model selection:** Which LLM provider? Self-hosted vs. API?
5. **Route privacy:** Default to private or public routes?
6. **Community features:** User-generated route reviews? Rating system?
7. **Offline mode:** Required for MVP or Phase 2?
8. **Multi-sport routes:** Support triathlon/multi-segment routes?

---

## 10. Appendices

### 10.1 Competitor Analysis

**hellodrifter.com:**
- Strengths: Clean UI, excellent routing, good mobile experience
- Gaps: Limited analytics, no AI features, no Strava integration
- Opportunity: Match UI quality, add advanced features

**Strava Route Builder:**
- Strengths: Large user base, social features, heatmaps
- Gaps: Limited editing, basic stats, no pacing tools
- Opportunity: Better route editing, advanced planning

**Garmin Connect:**
- Strengths: Device integration, training plans
- Gaps: Clunky UI, web-only (no mobile web), dated design
- Opportunity: Modern UX, better web experience

**komoot:**
- Strengths: Excellent route discovery, voice navigation, offline maps
- Gaps: Premium paywall, limited free features
- Opportunity: Free tier with more features, better AI

### 10.2 User Stories

**As a trail runner, I want to:**
- Create a 15-mile loop from my house avoiding roads
- See elevation profile to know where the climbs are
- Export to my Garmin watch
- Share route with running club

**As an ultra runner, I want to:**
- Plan pacing strategy for 100-mile race
- Mark aid stations and estimate arrival times
- Account for night running pace reduction
- Track gear and nutrition needs

**As a hiker, I want to:**
- Find water sources along trail
- Know total elevation gain before committing
- Save favorite trails for later
- See photos from viewpoints

**As a cyclist, I want to:**
- Avoid steep grades over 8%
- Stay on bike paths when possible
- Calculate ride time based on my average speed
- Find routes similar to ones I've enjoyed

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-31 | Product Team | Initial PRD |

---

**Next Steps:**
1. Review and approve PRD with stakeholders
2. Technical architecture deep-dive
3. Design mockups and prototypes
4. Development sprint planning
5. Set up project repository and CI/CD
