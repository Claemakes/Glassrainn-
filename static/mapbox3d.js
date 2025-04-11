/**
 * GlassRain Advanced 3D Building Visualization with Mapbox GL JS
 * This module provides enhanced 3D visualization of buildings using Mapbox's 3D buildings
 * and integrates with the existing Three.js home model for synchronized visualization.
 */

// Mapbox access token from environment variables
// NOTE: The token is set by the server when rendering the page
let mapboxToken = '';
let map = null;
let buildingLayer = null;
let propertyCoordinates = null;
let weatherOverlay = null;
let sunlightAnalysis = null;
let buildingHighlight = null;
let shadowsEnabled = true;
let isMapLoaded = false;

/**
 * Initialize the Mapbox GL JS map with 3D buildings
 * @param {string} containerId - The ID of the container element for the map
 * @param {Object} coordinates - The latitude and longitude coordinates of the property
 * @param {Function} callback - Optional callback function to execute after map is initialized
 */
function initMapbox3D(containerId, coordinates, callback) {
    // Get the container element
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container element with ID "${containerId}" not found.`);
        return;
    }

    // Retrieve the Mapbox token from the server
    fetch('/api/mapbox-token')
        .then(response => response.json())
        .then(data => {
            mapboxToken = data.token;
            
            // Initialize Mapbox GL JS
            mapboxgl.accessToken = mapboxToken;
            
            // Save the property coordinates
            propertyCoordinates = coordinates || { lng: -74.006, lat: 40.7128 }; // Default to NYC if no coordinates provided
            
            // Create the map
            map = new mapboxgl.Map({
                container: containerId,
                style: 'mapbox://styles/mapbox/satellite-streets-v12',
                center: [propertyCoordinates.lng, propertyCoordinates.lat],
                zoom: 18,
                pitch: 60, // Tilted view for 3D buildings
                bearing: 0,
                antialias: true // Smoother edges
            });
            
            // Add navigation controls
            map.addControl(new mapboxgl.NavigationControl());
            
            // Add scale control
            map.addControl(new mapboxgl.ScaleControl({
                maxWidth: 100,
                unit: 'imperial'
            }));
            
            // Add full screen control
            map.addControl(new mapboxgl.FullscreenControl());
            
            // Wait for the map to load
            map.on('load', () => {
                // Add 3D buildings layer
                addBuildingsLayer();
                
                // Add building highlight for the property
                highlightProperty();
                
                // Add sun position and shadows
                if (shadowsEnabled) {
                    addSunlightAndShadows();
                }
                
                // Map is now loaded
                isMapLoaded = true;
                
                // Execute the callback if provided
                if (callback && typeof callback === 'function') {
                    callback(map);
                }
            });
        })
        .catch(error => {
            console.error('Error fetching Mapbox token:', error);
            
            // Create a placeholder message in the container
            container.innerHTML = `
                <div class="mapbox-error">
                    <h3>3D Map Visualization Unavailable</h3>
                    <p>Could not load the 3D building visualization. Please check your internet connection and try again.</p>
                </div>
            `;
        });
}

/**
 * Add the 3D buildings layer to the map
 */
function addBuildingsLayer() {
    // Check if map is initialized
    if (!map) return;
    
    // Add 3D building extrusion layer
    map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
            'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'height'],
                0, '#DCE1E5',  // Shorter buildings
                50, '#C3CCD5', // Medium buildings
                200, '#A9B8C9'  // Taller buildings
            ],
            'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                16, ['get', 'height']
            ],
            'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                16, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.8
        }
    });
    
    buildingLayer = '3d-buildings';
}

/**
 * Highlight the property building
 */
function highlightProperty() {
    // Check if map is initialized
    if (!map || !propertyCoordinates) return;
    
    // Create a new GeoJSON source for the property highlight
    map.addSource('property-highlight', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [propertyCoordinates.lng, propertyCoordinates.lat]
            }
        }
    });
    
    // Add a circle layer to highlight the property location
    map.addLayer({
        'id': 'property-location',
        'type': 'circle',
        'source': 'property-highlight',
        'paint': {
            'circle-radius': 10,
            'circle-color': '#FFD700', // GlassRain yellow
            'circle-opacity': 0.8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF'
        }
    });
    
    // Create a marker for the property
    const marker = new mapboxgl.Marker({
        color: '#FFD700',
        scale: 1.2
    })
        .setLngLat([propertyCoordinates.lng, propertyCoordinates.lat])
        .addTo(map);
    
    // Store the marker for later reference
    buildingHighlight = marker;
}

/**
 * Add sunlight and shadows to the map
 */
function addSunlightAndShadows() {
    // Check if map is initialized
    if (!map) return;
    
    // Get the current date and time
    const date = new Date();
    
    // Add atmosphere and sun effects
    map.setLight({
        anchor: 'viewport',
        color: '#ffffff',
        intensity: 0.15,
        position: getSunPosition(date, propertyCoordinates.lat, propertyCoordinates.lng)
    });
}

/**
 * Calculate the position of the sun based on date, time and location
 * @param {Date} date - The date and time to calculate sun position for
 * @param {number} lat - Latitude of the location
 * @param {number} lng - Longitude of the location
 * @returns {Array} - Sun position as [x, y, z]
 */
function getSunPosition(date, lat, lng) {
    // Get the time of day (0-24)
    const hours = date.getHours() + date.getMinutes() / 60;
    
    // Simple approximation of sun position
    // In a real application, you would use a proper astronomical calculation
    const sunAngle = (hours - 12) * 15 * (Math.PI / 180);
    
    // Calculate a rough sun position
    const x = Math.cos(sunAngle);
    const y = Math.sin(sunAngle);
    const z = 1.0;
    
    // Return the sun position vector
    return [x, y, z];
}

/**
 * Add weather overlay to the map (rain, snow, etc)
 * @param {string} weatherType - The type of weather to display ('rain', 'snow', 'clear')
 */
function addWeatherOverlay(weatherType) {
    // Check if map is initialized
    if (!map) return;
    
    // Remove existing weather overlay if any
    if (weatherOverlay && map.getLayer(weatherOverlay)) {
        map.removeLayer(weatherOverlay);
        map.removeSource('weather-source');
    }
    
    // If weather type is 'clear', just remove the overlay
    if (weatherType === 'clear') {
        weatherOverlay = null;
        return;
    }
    
    // Add a new weather overlay
    const weatherColor = weatherType === 'rain' ? '#3498DB' : '#FFFFFF';
    const weatherOpacity = weatherType === 'rain' ? 0.3 : 0.5;
    
    // Add a source for the weather overlay
    map.addSource('weather-source', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'geometry': {
                'type': 'Polygon',
                'coordinates': [[
                    [propertyCoordinates.lng - 0.01, propertyCoordinates.lat - 0.01],
                    [propertyCoordinates.lng + 0.01, propertyCoordinates.lat - 0.01],
                    [propertyCoordinates.lng + 0.01, propertyCoordinates.lat + 0.01],
                    [propertyCoordinates.lng - 0.01, propertyCoordinates.lat + 0.01],
                    [propertyCoordinates.lng - 0.01, propertyCoordinates.lat - 0.01]
                ]]
            }
        }
    });
    
    // Add a weather layer
    const layerId = `weather-overlay-${weatherType}`;
    map.addLayer({
        'id': layerId,
        'type': 'fill',
        'source': 'weather-source',
        'layout': {},
        'paint': {
            'fill-color': weatherColor,
            'fill-opacity': weatherOpacity
        }
    });
    
    // Store the layer ID for later reference
    weatherOverlay = layerId;
}

/**
 * Sync the Mapbox 3D view with the Three.js model
 * @param {Object} threeCameraPosition - Position of the Three.js camera
 * @param {Object} threeCameraTarget - Target of the Three.js camera
 */
function syncWithThreeJS(threeCameraPosition, threeCameraTarget) {
    // Check if map is initialized
    if (!map || !isMapLoaded) return;
    
    // Calculate the map bearing based on the Three.js camera position and target
    const dx = threeCameraTarget.x - threeCameraPosition.x;
    const dz = threeCameraTarget.z - threeCameraPosition.z;
    const bearing = Math.atan2(dx, dz) * (180 / Math.PI);
    
    // Calculate the map pitch based on the Three.js camera position and target
    const dy = threeCameraTarget.y - threeCameraPosition.y;
    const groundDistance = Math.sqrt(dx * dx + dz * dz);
    const pitch = Math.atan2(dy, groundDistance) * (180 / Math.PI);
    
    // Calculate the map zoom based on the Three.js camera distance
    const cameraDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const zoom = 19 - Math.log2(cameraDistance / 10);
    
    // Update the map view
    map.easeTo({
        bearing: bearing,
        pitch: Math.min(85, Math.max(0, pitch + 60)), // Limit pitch to 0-85 degrees
        zoom: Math.min(22, Math.max(15, zoom)), // Limit zoom to 15-22
        duration: 500
    });
}

/**
 * Toggle shadows on/off
 * @param {boolean} enabled - Whether shadows should be enabled
 */
function toggleShadows(enabled) {
    shadowsEnabled = enabled;
    
    if (map && isMapLoaded) {
        if (enabled) {
            addSunlightAndShadows();
        } else {
            map.setLight({
                anchor: 'viewport',
                color: '#ffffff',
                intensity: 0.5,
                position: [0, 0, 1] // Default light from above
            });
        }
    }
}

/**
 * Update the Mapbox 3D view to a specific time of day to show different lighting
 * @param {number} hour - Hour of the day (0-23)
 */
function updateTimeOfDay(hour) {
    // Check if map is initialized
    if (!map || !isMapLoaded || !shadowsEnabled) return;
    
    // Create a date object with the specified hour
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(0);
    date.setSeconds(0);
    
    // Update the sun position
    map.setLight({
        anchor: 'viewport',
        color: getTimeOfDayColor(hour),
        intensity: getTimeOfDayIntensity(hour),
        position: getSunPosition(date, propertyCoordinates.lat, propertyCoordinates.lng)
    });
}

/**
 * Get color for a specific time of day
 * @param {number} hour - Hour of the day (0-23)
 * @returns {string} - Color value as hex string
 */
function getTimeOfDayColor(hour) {
    if (hour < 6 || hour >= 20) {
        return '#05103a'; // Night (dark blue)
    } else if (hour < 8 || hour >= 18) {
        return '#f9d3a7'; // Sunrise/sunset (orange glow)
    } else {
        return '#ffffff'; // Daytime (white)
    }
}

/**
 * Get light intensity for a specific time of day
 * @param {number} hour - Hour of the day (0-23)
 * @returns {number} - Light intensity (0.0-1.0)
 */
function getTimeOfDayIntensity(hour) {
    if (hour < 6 || hour >= 20) {
        return 0.05; // Night (very dim)
    } else if (hour < 8 || hour >= 18) {
        return 0.3; // Sunrise/sunset (moderate)
    } else {
        return 0.5; // Daytime (bright)
    }
}

/**
 * Perform a solar analysis to determine optimal solar panel placement
 * This visualizes roof exposure to sunlight throughout the day
 */
function performSolarAnalysis() {
    // Check if map is initialized
    if (!map || !isMapLoaded) return;
    
    // Remove existing solar analysis layer if any
    if (sunlightAnalysis && map.getLayer(sunlightAnalysis)) {
        map.removeLayer(sunlightAnalysis);
        map.removeSource('solar-analysis-source');
        sunlightAnalysis = null;
        return;
    }
    
    // Get the building footprints
    const buildingFootprints = extractBuildingFootprints();
    
    // Simulate solar exposure at different times of day
    const solarExposure = calculateSolarExposure(buildingFootprints);
    
    // Create a GeoJSON source with the solar analysis data
    map.addSource('solar-analysis-source', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': solarExposure
        }
    });
    
    // Add a layer to visualize solar exposure
    const layerId = 'solar-analysis-layer';
    map.addLayer({
        'id': layerId,
        'type': 'fill-extrusion',
        'source': 'solar-analysis-source',
        'paint': {
            'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'exposure'],
                0, '#053061', // Low exposure (dark blue)
                0.5, '#f7f7f7', // Medium exposure (white)
                1, '#67001f'  // High exposure (dark red)
            ],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'base'],
            'fill-extrusion-opacity': 0.8
        }
    });
    
    // Store the layer ID for later reference
    sunlightAnalysis = layerId;
}

/**
 * Extract building footprints from the 3D buildings layer
 * @returns {Array} - Array of building footprint features
 */
function extractBuildingFootprints() {
    // In a real implementation, you would query the building footprints data
    // Here, we'll create a placeholder around the property coordinates
    
    return [{
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [propertyCoordinates.lng - 0.0002, propertyCoordinates.lat - 0.0002],
                [propertyCoordinates.lng + 0.0002, propertyCoordinates.lat - 0.0002],
                [propertyCoordinates.lng + 0.0002, propertyCoordinates.lat + 0.0002],
                [propertyCoordinates.lng - 0.0002, propertyCoordinates.lat + 0.0002],
                [propertyCoordinates.lng - 0.0002, propertyCoordinates.lat - 0.0002]
            ]]
        },
        properties: {
            height: 10,
            base: 0
        }
    }];
}

/**
 * Calculate solar exposure for building roofs
 * @param {Array} buildingFootprints - Array of building footprint features
 * @returns {Array} - Array of features with solar exposure data
 */
function calculateSolarExposure(buildingFootprints) {
    // In a real implementation, you would calculate this based on 
    // sun position throughout the year, roof orientation, and shadows from nearby buildings
    
    return buildingFootprints.map(footprint => {
        // Clone the footprint feature
        const feature = JSON.parse(JSON.stringify(footprint));
        
        // Add solar exposure property (0-1)
        feature.properties.exposure = 0.8; // High exposure for demonstration
        
        return feature;
    });
}

/**
 * Update the property location on the map
 * @param {Object} coordinates - The new latitude and longitude coordinates
 */
function updatePropertyLocation(coordinates) {
    // Check if map is initialized
    if (!map || !isMapLoaded || !coordinates || !coordinates.lat || !coordinates.lng) return;
    
    // Update stored coordinates
    propertyCoordinates = {
        lat: coordinates.lat,
        lng: coordinates.lng
    };
    
    // Fly to the new location
    map.flyTo({
        center: [propertyCoordinates.lng, propertyCoordinates.lat],
        zoom: 18,
        pitch: 60,
        bearing: 0,
        duration: 1500
    });
    
    // Update the property marker if it exists
    if (buildingHighlight) {
        buildingHighlight.setLngLat([propertyCoordinates.lng, propertyCoordinates.lat]);
    }
    
    // Update the property highlight source if it exists
    if (map.getSource('property-highlight')) {
        map.getSource('property-highlight').setData({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [propertyCoordinates.lng, propertyCoordinates.lat]
            }
        });
    }
    
    // Also update any weather overlays if they exist
    if (weatherOverlay && map.getSource('weather-source')) {
        map.getSource('weather-source').setData({
            'type': 'Feature',
            'geometry': {
                'type': 'Polygon',
                'coordinates': [[
                    [propertyCoordinates.lng - 0.01, propertyCoordinates.lat - 0.01],
                    [propertyCoordinates.lng + 0.01, propertyCoordinates.lat - 0.01],
                    [propertyCoordinates.lng + 0.01, propertyCoordinates.lat + 0.01],
                    [propertyCoordinates.lng - 0.01, propertyCoordinates.lat + 0.01],
                    [propertyCoordinates.lng - 0.01, propertyCoordinates.lat - 0.01]
                ]]
            }
        });
    }
    
    // Update the solar analysis if it's active
    if (sunlightAnalysis && map.getSource('solar-analysis-source')) {
        performSolarAnalysis();
    }
}

/**
 * Clean up and remove the map
 */
function cleanupMapbox3D() {
    if (map) {
        map.remove();
        map = null;
    }
    
    buildingLayer = null;
    weatherOverlay = null;
    sunlightAnalysis = null;
    buildingHighlight = null;
    isMapLoaded = false;
}

// Export functions for use in other modules
window.MapboxGL3D = {
    init: initMapbox3D,
    addWeather: addWeatherOverlay,
    syncWithThreeJS: syncWithThreeJS,
    toggleShadows: toggleShadows,
    updateTimeOfDay: updateTimeOfDay,
    performSolarAnalysis: performSolarAnalysis,
    updatePropertyLocation: updatePropertyLocation,
    cleanup: cleanupMapbox3D
};