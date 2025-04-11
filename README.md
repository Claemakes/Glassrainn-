# GlassRain - Spatial Intelligence Platform

GlassRain is an advanced spatial intelligence and home service exploration platform that transforms property management through innovative technology and user-centric design.

## Application Overview

GlassRain provides homeowners with a seamless, AI-powered experience for managing, improving, and understanding their homes. The application combines 3D visualization, intelligent analysis, and service integration into a cohesive platform.

## User Experience Flow

### 1. Address Entry Experience
- **Two-column layout**: Address form on left, interactive Mapbox map on right
- **Real-time address auto-completion**: Suggestions appear after typing just 2 characters
- **Geocoding**: Uses Mapbox API to validate addresses and retrieve coordinates
- **Satellite view**: Shows 3D building outlines for visual confirmation

### 2. Dashboard Experience
- **3D Home Visualization**: Central interactive 3D model of the property created from satellite imagery and property data
- **Advanced Controls**: Zoom, pan, rotate with touch optimization for mobile
- **Energy Score Widget**: Shows property energy efficiency (1-100 scale) with AI-calculated rating
- **Weather Widget**: Real-time local weather data from open-meteo API
- **Property Stats**: Key metrics displayed with gold underlines for emphasis
- **Action Cards**: Quick-access recommendations for home improvement
- **AI Chat Interface**: Collapsible chat panel in bottom-left for property questions

### 3. Elevate Tab Experience
- **Split Layout**: Blueprint floor plan on left (40% width), room visualization on right (60% width)
- **Interactive Rooms**: Clickable room areas that highlight when selected
- **Room Visualization**: Rendered images of the selected space with customization options
- **AI Design Chat**: Sophisticated chat interface with:
  - Conversation history with user/assistant message styling
  - Suggestion buttons for common design requests
  - AI-powered responses for room customization
  - Image generation capabilities for visualizing changes
- **Materials & Cost Panel**: Provides detailed breakdown of renovation costs
- **Saved Designs Panel**: Sidebar for accessing and managing saved design concepts

### 4. Services Tab Experience
- **Service Categories**: Visual grid of service types with custom SVG icons
- **Tier Selection**: Simple text explanations instead of price multipliers
- **Booking Interface**: "Request Quote" buttons with calendar selection
- **Contractor Matching**: AI-powered recommendation system based on service type and location
- **Service Pricing**: Dynamic calculation based on property characteristics and tier selection

### 5. DIY Tab Experience
- **Project Assistant Chat**: Full-featured chat interface with media capabilities:
  - Voice recording for verbal questions
  - Photo/video upload for showing project areas
  - PDF export for saving DIY plans
- **Project Categories**: Visual grid of DIY project types for browsing
- **Expert Guidance**: AI advice on tools, materials, and step-by-step instructions

## Technical Architecture

### Frontend Technologies
- **3D Visualization**: Three.js with customized particle effects
- **Mapping**: Mapbox GL JS with geocoding and satellite imagery
- **Styling**: Custom CSS with consistent dark theme and gold accents
- **Touch Controls**: Enhanced mobile experience with specialized controls

### Backend Components
- **Flask Application**: Core server with API routes and template rendering
- **PostgreSQL Database**: Stores property data, user information, and service details
- **OpenAI Integration**: Powers the AI assistants across all tabs using gpt-3.5-turbo
- **Geocoding Service**: Mapbox API for address validation and coordinates
- **Weather Service**: Open-meteo API for real-time weather data

### Key Formulas and Algorithms
1. **Energy Score Calculation**: 
   ```
   energy_score = base_score - age_factor + insulation_bonus + system_efficiency
   ```
   Where:
   - `base_score` depends on construction type
   - `age_factor` calculated from year built
   - `insulation_bonus` from wall/roof R-values
   - `system_efficiency` from HVAC system type and age

2. **3D Model Generation**:
   ```python
   model_data = {
     'walls': generate_walls(lat, lng, footprint_data),
     'roof': generate_roof(roof_style, roof_pitch),
     'windows': place_windows(wall_data, window_count),
     'colors': generate_color_from_address(address, element_type, year_built)
   }
   ```

3. **Service Pricing Algorithm**:
   ```python
   base_price = service.base_rate * property_size_factor
   tier_multiplier = tier.price_factor
   total_price = base_price * tier_multiplier * location_factor
   ```

4. **Contractor Matching Score**:
   ```python
   match_score = (proximity_score * 0.3) + 
                 (rating_score * 0.4) + 
                 (expertise_score * 0.2) + 
                 (availability_score * 0.1)
   ```

## Data Flow
1. **Address Entry → Database**: Validated address stored with coordinates
2. **Database → 3D Model**: Property data used to generate visualization
3. **User Requests → AI Processing**: Chat messages processed by OpenAI
4. **Service Selections → Pricing Engine**: User choices calculated into quotes
5. **Design Changes → Visualization**: AI suggestions rendered in room preview

## Optimizations
- **Progressive Loading**: Assets load in priority order for faster perceived performance
- **Client-side Caching**: Property data and UI state preserved in browser storage
- **Responsive Design**: Adapts seamlessly between desktop, tablet, and mobile views

## Security Features
- **Environment Variables**: API keys stored securely as environment variables
- **Input Validation**: All user inputs validated and sanitized before processing
- **CORS Headers**: Properly configured for secure iframe embedding

## Deployment Configuration
- **Procfile**: Configuration for web servers like Gunicorn
- **wsgi.py**: WSGI entry point for production deployment
- **run.py**: Development server launcher with debug settings

## External Service Dependencies
- **OpenAI API**: Required for AI assistant functionality
- **Mapbox API**: Required for address geocoding and map visualization
- **Open-meteo API**: Used for weather data (no API key required)

## Getting Started
1. Set required environment variables (see .env.example)
2. Install dependencies with pip
3. Run with `python run.py` for development
4. For production, use `gunicorn wsgi:app`