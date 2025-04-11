/**
 * GlassRain Squarespace Integration
 * This script handles address search, Mapbox geocoding, and integration with the GlassRain dashboard.
 */

// Configuration
const API_BASE_URL = ''; // Empty string means same origin
let MAPBOX_TOKEN = '';

// DOM Elements
const addressInput = document.getElementById('address-input');
const suggestionsContainer = document.getElementById('suggestions-list');
const analyzeButton = document.getElementById('analyze-property-btn');
const addressFormContainer = document.getElementById('address-form-container');
const dashboardContainer = document.getElementById('dashboard-container');
const propertyAddressElement = document.getElementById('property-address');

// Model Canvas and 3D rendering
const modelCanvas = document.getElementById('model-canvas');
let modelRenderer, modelScene, modelCamera, modelControls;

// Property data
let currentProperty = null;
let roomsData = [];
let servicesData = [];

// Initialize the application
async function initializeApp() {
    // Fetch Mapbox token from server
    try {
        const response = await fetch(`${API_BASE_URL}/api/mapbox-token`);
        const data = await response.json();
        if (data && data.token) {
            MAPBOX_TOKEN = data.token;
            console.log('Mapbox token loaded');
        } else {
            console.error('Failed to load Mapbox token');
        }
    } catch (error) {
        console.error('Error fetching Mapbox token:', error);
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize tabs
    initializeTabs();
    
    // Check for property ID in URL (for deep linking)
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('property');
    if (propertyId) {
        loadPropertyData(propertyId);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Address input event listener
    if (addressInput) {
        addressInput.addEventListener('input', debounce(handleAddressInput, 300));
        addressInput.addEventListener('focus', () => {
            if (suggestionsContainer.children.length > 0) {
                suggestionsContainer.style.display = 'block';
            }
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (event) => {
            if (event.target !== addressInput && event.target !== suggestionsContainer) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }
    
    // Analyze property button
    if (analyzeButton) {
        analyzeButton.addEventListener('click', handleAnalyzeProperty);
    }
    
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Nav menu items
    document.getElementById('nav-home').addEventListener('click', () => switchTab('home'));
    document.getElementById('nav-services').addEventListener('click', () => switchTab('services'));
    document.getElementById('nav-elevate').addEventListener('click', () => switchTab('repairs'));
    document.getElementById('nav-diy').addEventListener('click', () => switchTab('energy'));
    document.getElementById('nav-settings').addEventListener('click', () => switchTab('settings'));
}

// Initialize tabs functionality
function initializeTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabId = tab.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// Handle address input and fetch suggestions from Mapbox
async function handleAddressInput() {
    const query = addressInput.value.trim();
    
    if (query.length < 3) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    if (!MAPBOX_TOKEN) {
        console.error('Mapbox token not available');
        return;
    }
    
    try {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=us&types=address`);
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            displaySuggestions(data.features);
        } else {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching address suggestions:', error);
    }
}

// Display address suggestions
function displaySuggestions(suggestions) {
    suggestionsContainer.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = suggestion.place_name;
        suggestionItem.addEventListener('click', () => {
            addressInput.value = suggestion.place_name;
            suggestionsContainer.style.display = 'none';
            
            // Store the selected suggestion data
            addressInput.dataset.selectedPlace = JSON.stringify(suggestion);
        });
        
        suggestionsContainer.appendChild(suggestionItem);
    });
    
    suggestionsContainer.style.display = 'block';
}

// Handle analyze property button click
async function handleAnalyzeProperty() {
    const address = addressInput.value.trim();
    
    if (!address) {
        showError('Please enter a valid address');
        return;
    }
    
    // Show loading state
    analyzeButton.disabled = true;
    analyzeButton.textContent = 'Analyzing...';
    
    // Get selected place data if available
    let placeData = null;
    if (addressInput.dataset.selectedPlace) {
        try {
            placeData = JSON.parse(addressInput.dataset.selectedPlace);
        } catch (e) {
            console.error('Error parsing selected place data:', e);
        }
    }
    
    try {
        // Send address to server
        const response = await fetch(`${API_BASE_URL}/process-address`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                address: address,
                place_data: placeData
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store property data and show dashboard
            currentProperty = data.property_data;
            showDashboard(data.property_data);
        } else {
            showError(data.error || 'An error occurred while processing your address');
        }
    } catch (error) {
        console.error('Error submitting address:', error);
        showError('Failed to connect to the server. Please try again later.');
    } finally {
        // Restore button state
        analyzeButton.disabled = false;
        analyzeButton.textContent = 'Analyze Property';
    }
}

// Show dashboard with property data
function showDashboard(propertyData) {
    // Update address display
    propertyAddressElement.textContent = propertyData.formatted_address || propertyData.address;
    
    // Update property details
    document.getElementById('square-footage').textContent = propertyData.property_data.square_feet + ' sq ft';
    document.getElementById('year-built').textContent = propertyData.property_data.year_built;
    document.getElementById('bedrooms').textContent = propertyData.property_data.bedrooms;
    document.getElementById('bathrooms').textContent = propertyData.property_data.bathrooms;
    document.getElementById('energy-score').textContent = '75/100'; // Example static value
    document.getElementById('scanned-rooms').textContent = `0/${propertyData.property_data.bedrooms + 2}`; // Assuming bedrooms + bathroom + kitchen
    
    // Hide address form and show dashboard
    addressFormContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    
    // Initialize 3D model
    initializeHomeModel(propertyData.model_data);
    
    // Load rooms (if any)
    loadRooms(propertyData.property_id || '1');
    
    // Load services
    loadServices();
    
    // Update URL with property ID for sharing
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('property', propertyData.property_id || '1');
    window.history.pushState({}, '', newUrl);
}

// Load property data by ID (for deep linking)
async function loadPropertyData(propertyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/home/${propertyId}`);
        const data = await response.json();
        
        if (data.success) {
            currentProperty = data.property_data;
            showDashboard(data.property_data);
        } else {
            console.error('Error loading property data:', data.error);
        }
    } catch (error) {
        console.error('Error fetching property data:', error);
    }
}

// Load rooms for the property
async function loadRooms(homeId) {
    try {
        // In a real implementation, fetch rooms from server
        // For now, we'll use placeholder data
        roomsData = [
            {
                id: 'room1',
                name: 'Living Room',
                dimensions: '15\' x 20\'',
                last_scan: '2 days ago'
            },
            {
                id: 'room2',
                name: 'Kitchen',
                dimensions: '12\' x 14\'',
                last_scan: '3 days ago'
            },
            {
                id: 'room3',
                name: 'Master Bedroom',
                dimensions: '14\' x 16\'',
                last_scan: 'Not scanned'
            }
        ];
        
        displayRooms(roomsData);
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

// Display rooms in the grid
function displayRooms(rooms) {
    const roomsGrid = document.getElementById('rooms-grid');
    roomsGrid.innerHTML = '';
    
    if (rooms.length === 0) {
        roomsGrid.innerHTML = '<p>No rooms have been scanned yet. Use the "Scan New Room" button to get started.</p>';
        return;
    }
    
    rooms.forEach(room => {
        const roomCard = document.createElement('div');
        roomCard.className = 'room-card';
        roomCard.innerHTML = `
            <div class="room-image">
                <img src="${getRandomRoomImage(room.name)}" alt="${room.name}">
            </div>
            <div class="room-info">
                <div class="room-name">${room.name}</div>
                <div class="room-meta">
                    <span>${room.dimensions}</span>
                    <span>${room.last_scan}</span>
                </div>
            </div>
        `;
        
        roomCard.addEventListener('click', () => {
            // Handle room click (show detail view)
            console.log('Room clicked:', room.id);
        });
        
        roomsGrid.appendChild(roomCard);
    });
}

// Load available services
async function loadServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/services`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            servicesData = data;
            displayServices(data);
        } else {
            console.error('Invalid services data format');
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Display services in the grid
function displayServices(services) {
    const servicesGrid = document.getElementById('services-grid');
    servicesGrid.innerHTML = '';
    
    services.forEach(service => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        serviceCard.innerHTML = `
            <div class="service-icon">
                <img src="${getServiceIcon(service.id)}" alt="${service.name}">
            </div>
            <div class="service-title">${service.name}</div>
            <div class="service-description">${service.description}</div>
            <div class="service-price">${service.price_range}</div>
            <div class="service-providers">${service.providers} providers available</div>
        `;
        
        serviceCard.addEventListener('click', () => {
            requestServiceQuote(service.id);
        });
        
        servicesGrid.appendChild(serviceCard);
    });
}

// Request a service quote
async function requestServiceQuote(serviceId) {
    if (!currentProperty) {
        console.error('No property data available');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/request-quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service_id: serviceId,
                home_id: currentProperty.property_id,
                notes: 'Requested through GlassRain dashboard'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Service request submitted! A provider will contact you soon.');
        } else {
            alert('Error submitting service request: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error requesting service quote:', error);
        alert('Failed to submit service request. Please try again later.');
    }
}

// Initialize the 3D home model
function initializeHomeModel(modelData) {
    if (!modelCanvas) return;
    
    // Set up Three.js scene
    modelScene = new THREE.Scene();
    modelScene.background = new THREE.Color(0xf0f0f0);
    
    // Set up camera
    modelCamera = new THREE.PerspectiveCamera(75, modelCanvas.clientWidth / modelCanvas.clientHeight, 0.1, 1000);
    modelCamera.position.set(0, 5, 10);
    
    // Set up renderer
    modelRenderer = new THREE.WebGLRenderer({ canvas: modelCanvas, antialias: true });
    modelRenderer.setSize(modelCanvas.clientWidth, modelCanvas.clientHeight);
    
    // Add controls
    modelControls = new THREE.OrbitControls(modelCamera, modelRenderer.domElement);
    modelControls.enableDamping = true;
    modelControls.dampingFactor = 0.25;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    modelScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    modelScene.add(directionalLight);
    
    // Create house model based on data
    createHouseModel(modelData);
    
    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x7cba7c });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    modelScene.add(ground);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

// Create house model based on property data
function createHouseModel(modelData) {
    if (!modelData || !modelScene) return;
    
    // Foundation/base
    const width = modelData.foundation.width || 40;
    const length = modelData.foundation.length || 60;
    const stories = modelData.stories || 2;
    const storyHeight = 3;
    
    // Create foundation
    const baseGeometry = new THREE.BoxGeometry(width, 0.2, length);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xbbbbbb });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.1;
    modelScene.add(base);
    
    // Create main house structure
    const houseGeometry = new THREE.BoxGeometry(width, storyHeight * stories, length);
    const houseMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
    const house = new THREE.Mesh(houseGeometry, houseMaterial);
    house.position.y = storyHeight * stories / 2;
    modelScene.add(house);
    
    // Create roof
    if (modelData.roof && modelData.roof.type === 'gable') {
        const roofHeight = 5;
        const roofGeometry = new THREE.ConeGeometry(width * 0.7, roofHeight, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xcc8866 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = storyHeight * stories + roofHeight / 2;
        roof.rotation.y = Math.PI / 4;
        modelScene.add(roof);
    }
    
    // Add some windows
    addWindowsToHouse(house, width, length, stories, storyHeight);
    
    // Add a door
    addDoorToHouse(house, width, length);
}

// Add windows to house model
function addWindowsToHouse(house, width, length, stories, storyHeight) {
    const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x88ccff });
    
    // Front windows
    for (let i = 0; i < 3; i++) {
        const windowGeometry = new THREE.BoxGeometry(5, 4, 0.5);
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.z = length / 2 + 0.1;
        window.position.x = (i - 1) * 10;
        window.position.y = storyHeight / 2;
        modelScene.add(window);
    }
    
    // Side windows
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < stories; j++) {
            const windowGeometry = new THREE.BoxGeometry(0.5, 4, 5);
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.x = width / 2 + 0.1;
            window.position.z = (i - 0.5) * 20;
            window.position.y = j * storyHeight + storyHeight / 2;
            modelScene.add(window);
        }
    }
}

// Add door to house model
function addDoorToHouse(house, width, length) {
    const doorGeometry = new THREE.BoxGeometry(5, 7, 0.5);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.z = length / 2 + 0.1;
    door.position.y = 3.5;
    modelScene.add(door);
}

// Handle window resize
function onWindowResize() {
    if (!modelCamera || !modelRenderer || !modelCanvas) return;
    
    modelCamera.aspect = modelCanvas.clientWidth / modelCanvas.clientHeight;
    modelCamera.updateProjectionMatrix();
    modelRenderer.setSize(modelCanvas.clientWidth, modelCanvas.clientHeight);
}

// Animation loop
function animate() {
    if (!modelRenderer || !modelScene || !modelCamera || !modelControls) return;
    
    requestAnimationFrame(animate);
    modelControls.update();
    modelRenderer.render(modelScene, modelCamera);
}

// Switch between tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

// Helper function: Debounce
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Helper function: Show error message
function showError(message) {
    alert(message); // Simple implementation, could be improved with a toast notification
}

// Helper function: Get random room image based on room name
function getRandomRoomImage(roomName) {
    const roomType = roomName.toLowerCase();
    
    if (roomType.includes('living')) {
        return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&q=80';
    } else if (roomType.includes('kitchen')) {
        return 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=500&q=80';
    } else if (roomType.includes('bedroom')) {
        return 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=500&q=80';
    } else if (roomType.includes('bathroom')) {
        return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80';
    } else {
        return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&q=80';
    }
}

// Helper function: Get service icon based on service ID
function getServiceIcon(serviceId) {
    if (serviceId === 'roof-inspection') {
        return 'https://cdn-icons-png.flaticon.com/128/3074/3074058.png';
    } else if (serviceId === 'hvac-maintenance') {
        return 'https://cdn-icons-png.flaticon.com/128/3153/3153746.png';
    } else if (serviceId === 'plumbing-service') {
        return 'https://cdn-icons-png.flaticon.com/128/1055/1055683.png';
    } else if (serviceId === 'electrical-work') {
        return 'https://cdn-icons-png.flaticon.com/128/3094/3094020.png';
    } else if (serviceId === 'insulation-upgrade') {
        return 'https://cdn-icons-png.flaticon.com/128/8848/8848853.png';
    } else {
        return 'https://cdn-icons-png.flaticon.com/128/4616/4616219.png';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);