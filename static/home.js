/**
 * GlassRain Home Tab - Enhanced Home Model Visualization
 * 
 * This file implements the interactive 3D home model, property data display,
 * and animation functionality for the Home tab.
 */

// Home data and model state
let homeData = null;
let modelLoaded = false;
let activeSection = 'exterior';
let cameraPositions = {
    exterior: { x: 15, y: 10, z: 15 },
    interior: { x: 0, y: 2, z: 0 }
};

// Three.js components
let scene, camera, renderer, controls;
let homeModel, groundPlane, skybox;
let houseObjects = {};
let highlightedFeature = null;
let animationFrameId = null;
let featureLabels = [];

// DOM Ready function
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the 3D model
    initHomeModel();
    
    // Load home data
    loadHomeData();
    
    // Setup section navigation
    setupSectionNav();
    
    // Setup highlight features
    setupFeatureHighlighting();
    
    // Setup animation controls
    setupAnimationControls();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
});

/**
 * Initialize the 3D home model
 */
function initHomeModel() {
    const container = document.getElementById('model-canvas');
    if (!container) return;
    
    // Initialize Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light (sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    
    // Improve shadow map quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    
    scene.add(directionalLight);
    
    // Add hemisphere light for better ambient illumination
    const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x202020, 0.5);
    scene.add(hemisphereLight);
    
    // Setup camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(15, 10, 15);
    camera.lookAt(0, 0, 0);
    
    // Setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Setup orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2;
    
    // Add event listener for model click
    renderer.domElement.addEventListener('click', onModelClick);
    
    // Create detailed terrain based on satellite data
    createDetailedTerrain();
    
    // Create skybox
    createSkybox();
    
    // Create the home model group to contain all house elements
    homeModel = new THREE.Group();
    scene.add(homeModel);
    
    // Initialize object storage
    houseObjects = {};
    
    // Start loading model and animation loop
    loadHouseModel();
    animate();
    
    // Note: loading overlay is handled within loadHouseModel function
}

/**
 * Create more detailed terrain based on satellite data
 */
function createDetailedTerrain() {
    // Create detailed terrain mesh
    const terrainSize = 100;
    const terrainResolution = 128;
    const terrainGeometry = new THREE.PlaneGeometry(
        terrainSize, 
        terrainSize, 
        terrainResolution - 1, 
        terrainResolution - 1
    );
    
    // Generate realistic terrain heights from satellite data
    // In a real implementation, this would use actual elevation data
    const vertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        
        // Create gentle hills and terrain features based on distance from center
        const distance = Math.sqrt(x * x + z * z);
        
        // Create various terrain features
        if (distance > 15) {
            // Outside property - natural terrain
            const noiseValue = simplex3(x * 0.03, 0, z * 0.03) * 0.8 + 
                              simplex3(x * 0.1, 0, z * 0.1) * 0.2;
            vertices[i + 1] = noiseValue * 2;
        } else {
            // Inside property - flatter terrain with subtle variations
            const propertyNoise = simplex3(x * 0.1, 0, z * 0.1) * 0.15;
            vertices[i + 1] = propertyNoise;
        }
    }
    
    // Update the geometry
    terrainGeometry.computeVertexNormals();
    
    // Create terrain material with texture
    const terrainMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a9456,
        roughness: 0.9,
        metalness: 0.1,
        side: THREE.DoubleSide,
        vertexColors: true
    });
    
    // Add color variations to terrain based on height and features
    const colors = [];
    for (let i = 0; i < vertices.length; i += 3) {
        const height = vertices[i + 1];
        
        // Property area - greener
        if (Math.sqrt(vertices[i] * vertices[i] + vertices[i + 2] * vertices[i + 2]) < 15) {
            colors.push(0.4, 0.6, 0.3); // Lawn green
        }
        // Dirt/soil areas
        else if (height < 0.1) {
            colors.push(0.55, 0.4, 0.3); // Brown soil
        }
        // Mid-height terrain - standard grass
        else if (height < 0.8) {
            colors.push(0.5, 0.6, 0.3); // Standard grass green
        }
        // Higher areas - more yellow/brown grass
        else {
            colors.push(0.6, 0.55, 0.35); // Drier grass
        }
    }
    
    // Add colors to the geometry
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // Create and position ground
    groundPlane = new THREE.Mesh(terrainGeometry, terrainMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.5;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);
}

/**
 * Create property boundaries based on satellite data
 */
function createPropertyBoundaries(homeData) {
    // Default property dimensions if no data available
    const propertyWidth = homeData?.property_width || 40;
    const propertyDepth = homeData?.property_depth || 35;
    
    // Create property boundary outline
    const shape = new THREE.Shape();
    shape.moveTo(-propertyWidth/2, -propertyDepth/2);
    shape.lineTo(propertyWidth/2, -propertyDepth/2);
    shape.lineTo(propertyWidth/2, propertyDepth/2);
    shape.lineTo(-propertyWidth/2, propertyDepth/2);
    shape.lineTo(-propertyWidth/2, -propertyDepth/2);
    
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.LineBasicMaterial({ 
        color: 0x2e86c1, 
        linewidth: 3,
        opacity: 0.7,
        transparent: true 
    });
    
    // Create a line from the geometry by extracting the edges
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, material);
    
    // Position just above ground
    line.position.y = 0.05;
    line.rotation.x = -Math.PI / 2;
    
    // Add to model
    homeModel.add(line);
    houseObjects.propertyBoundary = line;
}

/**
 * Create detailed house structure based on home data
 */
function createDetailedHouseStructure(homeData) {
    // Use home data if available, otherwise use defaults
    const houseWidth = homeData?.width || 10;
    const houseDepth = homeData?.depth || 8;
    const houseHeight = homeData?.height || 4;
    const numFloors = homeData?.num_floors || 1;
    const roofType = homeData?.roof_type || 'gable'; // gable, flat, hip
    const exteriorColor = homeData?.exterior_color || 0xFFD700; // Default yellow for highlighted areas
    
    // Create foundation/base
    const foundationGeometry = new THREE.BoxGeometry(houseWidth, 0.5, houseDepth);
    const foundationMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa, // Concrete color
        roughness: 0.8
    });
    const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
    foundation.position.y = 0;
    foundation.receiveShadow = true;
    foundation.castShadow = true;
    homeModel.add(foundation);
    houseObjects.foundation = foundation;
    
    // Main house structure
    const houseGeometry = new THREE.BoxGeometry(houseWidth, houseHeight, houseDepth);
    const houseMaterial = new THREE.MeshStandardMaterial({
        color: exteriorColor,
        roughness: 0.6,
        metalness: 0.1
    });
    const house = new THREE.Mesh(houseGeometry, houseMaterial);
    house.position.y = houseHeight / 2 + 0.5; // Position on top of foundation
    house.receiveShadow = true;
    house.castShadow = true;
    homeModel.add(house);
    houseObjects.exterior = house;
    
    // Create appropriate roof based on type
    let roof;
    if (roofType === 'flat') {
        // Flat roof
        const roofGeometry = new THREE.BoxGeometry(houseWidth + 0.5, 0.5, houseDepth + 0.5);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333, // Dark flat roof
            roughness: 0.9
        });
        roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = houseHeight + 0.5 + 0.25;
    } else if (roofType === 'hip') {
        // Hip roof (pyramid-like)
        const roofGeometry = new THREE.ConeGeometry(
            Math.sqrt((houseWidth/2) * (houseWidth/2) + (houseDepth/2) * (houseDepth/2)),
            houseHeight * 0.6,
            4
        );
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513, // Brown roof
            roughness: 0.7
        });
        roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = houseHeight + 0.5 + (houseHeight * 0.3);
        roof.rotation.y = Math.PI / 4; // 45 degrees
    } else {
        // Default gable roof
        const roofGeometry = new THREE.ConeGeometry(houseWidth * 0.7, houseHeight * 0.8, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513, // Brown roof
            roughness: 0.7
        });
        roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = houseHeight + 0.5 + (houseHeight * 0.4);
        roof.rotation.y = Math.PI / 4; // 45 degrees
    }
    
    roof.receiveShadow = true;
    roof.castShadow = true;
    homeModel.add(roof);
    houseObjects.roof = roof;
    
    // Add windows
    addHomeWindows(houseWidth, houseHeight, houseDepth);
    
    // Add door
    addHomeDoor(houseDepth);
    
    // Add interior rooms (if data available)
    if (homeData?.rooms && homeData.rooms.length > 0) {
        addInteriorRooms(homeData.rooms);
    } else {
        addDefaultInteriorRooms(houseWidth, houseHeight, houseDepth);
    }
    
    // Add highlight effect for digital build areas
    addHighlightEffects();
}

/**
 * Add windows to the house structure
 */
function addHomeWindows(width, height, depth) {
    const windowGeometry = new THREE.PlaneGeometry(1.5, 1.2);
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x87ceeb, // Light blue for windows
        roughness: 0.2,
        metalness: 0.6,
        side: THREE.DoubleSide
    });
    
    // Windows array to track all windows
    const windows = [];
    
    // Front windows
    const frontWindowLeft = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindowLeft.position.set(-width / 4, height / 2, depth / 2 + 0.01);
    frontWindowLeft.receiveShadow = true;
    homeModel.add(frontWindowLeft);
    windows.push(frontWindowLeft);
    
    const frontWindowRight = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindowRight.position.set(width / 4, height / 2, depth / 2 + 0.01);
    frontWindowRight.receiveShadow = true;
    homeModel.add(frontWindowRight);
    windows.push(frontWindowRight);
    
    // Back windows
    const backWindowLeft = new THREE.Mesh(windowGeometry, windowMaterial);
    backWindowLeft.position.set(-width / 4, height / 2, -depth / 2 - 0.01);
    backWindowLeft.rotation.y = Math.PI;
    backWindowLeft.receiveShadow = true;
    homeModel.add(backWindowLeft);
    windows.push(backWindowLeft);
    
    const backWindowRight = new THREE.Mesh(windowGeometry, windowMaterial);
    backWindowRight.position.set(width / 4, height / 2, -depth / 2 - 0.01);
    backWindowRight.rotation.y = Math.PI;
    backWindowRight.receiveShadow = true;
    homeModel.add(backWindowRight);
    windows.push(backWindowRight);
    
    // Side windows
    const leftWindowFront = new THREE.Mesh(windowGeometry, windowMaterial);
    leftWindowFront.position.set(-width / 2 - 0.01, height / 2, depth / 4);
    leftWindowFront.rotation.y = Math.PI / 2;
    leftWindowFront.receiveShadow = true;
    homeModel.add(leftWindowFront);
    windows.push(leftWindowFront);
    
    const leftWindowBack = new THREE.Mesh(windowGeometry, windowMaterial);
    leftWindowBack.position.set(-width / 2 - 0.01, height / 2, -depth / 4);
    leftWindowBack.rotation.y = Math.PI / 2;
    leftWindowBack.receiveShadow = true;
    homeModel.add(leftWindowBack);
    windows.push(leftWindowBack);
    
    const rightWindowFront = new THREE.Mesh(windowGeometry, windowMaterial);
    rightWindowFront.position.set(width / 2 + 0.01, height / 2, depth / 4);
    rightWindowFront.rotation.y = -Math.PI / 2;
    rightWindowFront.receiveShadow = true;
    homeModel.add(rightWindowFront);
    windows.push(rightWindowFront);
    
    const rightWindowBack = new THREE.Mesh(windowGeometry, windowMaterial);
    rightWindowBack.position.set(width / 2 + 0.01, height / 2, -depth / 4);
    rightWindowBack.rotation.y = -Math.PI / 2;
    rightWindowBack.receiveShadow = true;
    homeModel.add(rightWindowBack);
    windows.push(rightWindowBack);
    
    // Store windows in house objects
    houseObjects.windows = windows;
}

/**
 * Add door to house structure
 */
function addHomeDoor(depth) {
    const doorGeometry = new THREE.PlaneGeometry(1.8, 3);
    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c4033, // Brown door
        roughness: 0.8,
        side: THREE.DoubleSide
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.5, depth / 2 + 0.01);
    door.receiveShadow = true;
    homeModel.add(door);
    houseObjects.door = door;
}

/**
 * Add landscaping elements around the house
 */
function addLandscapingElements() {
    // Add trees
    addTrees();
    
    // Add smaller plants and bushes
    addPlants();
    
    // Add walkways and driveway
    addPavedAreas();
}

/**
 * Create trees for the property
 */
function addTrees() {
    // Tree locations
    const treeLocations = [
        {x: -12, z: 10}, 
        {x: 15, z: -8}, 
        {x: -18, z: -12}, 
        {x: 10, z: 15}
    ];
    
    treeLocations.forEach(loc => {
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.65, 4, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(loc.x, 2, loc.z);
        trunk.castShadow = true;
        homeModel.add(trunk);
        
        // Tree foliage
        const foliageGeometry = new THREE.SphereGeometry(2.5, 8, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22, // Forest green
            roughness: 0.8
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.set(loc.x, 5, loc.z);
        foliage.castShadow = true;
        homeModel.add(foliage);
    });
}

/**
 * Add plants and bushes to the property
 */
function addPlants() {
    // Bush locations 
    const bushLocations = [
        {x: -5, z: 7, scale: 1},
        {x: 5, z: 7, scale: 0.8},
        {x: -7, z: -5, scale: 1.2},
        {x: 7, z: -6, scale: 0.9}
    ];
    
    bushLocations.forEach(loc => {
        const bushGeometry = new THREE.SphereGeometry(1 * loc.scale, 8, 8);
        const bushMaterial = new THREE.MeshStandardMaterial({
            color: 0x9ACD32, // Yellow-green
            roughness: 0.8
        });
        const bush = new THREE.Mesh(bushGeometry, bushMaterial);
        bush.position.set(loc.x, 0.5 * loc.scale, loc.z);
        bush.castShadow = true;
        homeModel.add(bush);
    });
}

/**
 * Add walkways and driveways to the property
 */
function addPavedAreas() {
    // Create driveway
    const drivewayShape = new THREE.Shape();
    drivewayShape.moveTo(-3, 20);
    drivewayShape.lineTo(3, 20);
    drivewayShape.lineTo(5, 6);
    drivewayShape.lineTo(-5, 6);
    drivewayShape.lineTo(-3, 20);
    
    const drivewayGeometry = new THREE.ShapeGeometry(drivewayShape);
    const drivewayMaterial = new THREE.MeshStandardMaterial({
        color: 0x7b7b7b, // Asphalt gray
        roughness: 0.8
    });
    
    const driveway = new THREE.Mesh(drivewayGeometry, drivewayMaterial);
    driveway.rotation.x = -Math.PI / 2;
    driveway.position.y = 0.05; // Just above ground
    driveway.receiveShadow = true;
    homeModel.add(driveway);
    
    // Create walkway from driveway to front door
    const walkwayShape = new THREE.Shape();
    walkwayShape.moveTo(-1.5, 6);
    walkwayShape.lineTo(1.5, 6);
    walkwayShape.lineTo(1.5, 4);
    walkwayShape.lineTo(-1.5, 4);
    walkwayShape.lineTo(-1.5, 6);
    
    const walkwayGeometry = new THREE.ShapeGeometry(walkwayShape);
    const walkwayMaterial = new THREE.MeshStandardMaterial({
        color: 0x9e9e9e, // Concrete gray
        roughness: 0.7
    });
    
    const walkway = new THREE.Mesh(walkwayGeometry, walkwayMaterial);
    walkway.rotation.x = -Math.PI / 2;
    walkway.position.y = 0.07; // Just above ground
    walkway.receiveShadow = true;
    homeModel.add(walkway);
}

/**
 * Add default interior rooms for demonstration
 */
function addDefaultInteriorRooms(width, height, depth) {
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff, // White walls
        roughness: 0.9
    });
    
    // Living room (largest room at front of house)
    const livingRoomWidth = width * 0.6;
    const livingRoomDepth = depth * 0.5;
    const livingRoomGeometry = new THREE.BoxGeometry(livingRoomWidth, height * 0.9, livingRoomDepth);
    const livingRoom = new THREE.Mesh(livingRoomGeometry, wallMaterial);
    livingRoom.position.set(-width * 0.15, height / 2, depth * 0.15);
    livingRoom.visible = false; // Initially hidden
    homeModel.add(livingRoom);
    houseObjects.livingRoom = livingRoom;
    
    // Kitchen (back left)
    const kitchenGeometry = new THREE.BoxGeometry(width * 0.4, height * 0.9, depth * 0.4);
    const kitchenMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0e68c, // Light yellow for kitchen
        roughness: 0.7
    });
    const kitchen = new THREE.Mesh(kitchenGeometry, kitchenMaterial);
    kitchen.position.set(width * 0.25, height / 2, -depth * 0.2);
    kitchen.visible = false; // Initially hidden
    homeModel.add(kitchen);
    houseObjects.kitchen = kitchen;
    
    // Bathroom (smaller room)
    const bathroomGeometry = new THREE.BoxGeometry(width * 0.3, height * 0.9, depth * 0.3);
    const bathroomMaterial = new THREE.MeshStandardMaterial({
        color: 0xadd8e6, // Light blue for bathroom
        roughness: 0.6
    });
    const bathroom = new THREE.Mesh(bathroomGeometry, bathroomMaterial);
    bathroom.position.set(width * 0.3, height / 2, -depth * 0.3);
    bathroom.visible = false; // Initially hidden
    homeModel.add(bathroom);
    houseObjects.bathroom = bathroom;
    
    // Bedroom (back right)
    const bedroomGeometry = new THREE.BoxGeometry(width * 0.4, height * 0.9, depth * 0.4);
    const bedroomMaterial = new THREE.MeshStandardMaterial({
        color: 0xd8bfd8, // Light purple for bedroom
        roughness: 0.8
    });
    const bedroom = new THREE.Mesh(bedroomGeometry, bedroomMaterial);
    bedroom.position.set(-width * 0.25, height / 2, -depth * 0.25);
    bedroom.visible = false; // Initially hidden
    homeModel.add(bedroom);
    houseObjects.bedroom = bedroom;
}

/**
 * Add highlight effects to show active improvement areas
 */
function addHighlightEffects() {
    // Create a pulsing glow effect for highlighted areas
    
    // 1. Roof highlight (solar potential)
    const roofHighlightGeo = new THREE.ConeGeometry(7.5, 3.2, 4);
    const roofHighlightMat = new THREE.MeshBasicMaterial({
        color: 0xffff00, // Yellow highlight
        transparent: true,
        opacity: 0.3,
        wireframe: true
    });
    const roofHighlight = new THREE.Mesh(roofHighlightGeo, roofHighlightMat);
    roofHighlight.position.copy(houseObjects.roof.position);
    roofHighlight.rotation.copy(houseObjects.roof.rotation);
    roofHighlight.scale.set(1.05, 1.05, 1.05);
    homeModel.add(roofHighlight);
    houseObjects.roofHighlight = roofHighlight;
    
    // 2. Windows highlight (energy efficiency)
    houseObjects.windows.forEach(window => {
        const winHighlightGeo = new THREE.PlaneGeometry(1.6, 1.3);
        const winHighlightMat = new THREE.MeshBasicMaterial({
            color: 0xffff00, // Yellow highlight
            transparent: true,
            opacity: 0.3,
            wireframe: true,
            side: THREE.DoubleSide
        });
        const winHighlight = new THREE.Mesh(winHighlightGeo, winHighlightMat);
        winHighlight.position.copy(window.position);
        winHighlight.rotation.copy(window.rotation);
        homeModel.add(winHighlight);
        
        // Store the highlight object with the window
        window.userData = { highlight: winHighlight };
    });
    
    // Start highlight animation
    animateHighlights();
}

/**
 * Animate the highlight effects
 */
function animateHighlights() {
    let highlightIntensity = 0;
    let increasing = true;
    
    // Pulse animation function
    function pulseHighlights() {
        // Update intensity
        if (increasing) {
            highlightIntensity += 0.01;
            if (highlightIntensity >= 0.5) increasing = false;
        } else {
            highlightIntensity -= 0.01;
            if (highlightIntensity <= 0.1) increasing = true;
        }
        
        // Update roof highlight
        if (houseObjects.roofHighlight) {
            houseObjects.roofHighlight.material.opacity = highlightIntensity;
        }
        
        // Update window highlights
        houseObjects.windows.forEach(window => {
            if (window.userData && window.userData.highlight) {
                window.userData.highlight.material.opacity = highlightIntensity;
            }
        });
        
        // Continue animation
        requestAnimationFrame(pulseHighlights);
    }
    
    // Start the pulse animation
    pulseHighlights();
}

/**
 * Generates simplex noise for terrain
 */
function simplex3(x, y, z) {
    // Simple noise implementation for terrain
    // In real implementation, would use a proper noise library
    const p = new Uint8Array(512);
    for (let i = 0; i < 256; i++) p[i] = i;
    
    // Shuffle
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    
    // Copy to second half
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    
    // Simplex-like noise function (simplified for this example)
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t, a, b) { return a + t * (b - a); }
    function grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    // Get unit grid cell containing point
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    // Get relative xyz coordinates of point within cell
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    // Compute fade curves
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    
    // Hash coordinates of the 8 cube corners
    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;
    
    // And add blended results from 8 corners of cube
    return lerp(w, 
      lerp(v, 
        lerp(u, 
          grad(p[AA], x, y, z),
          grad(p[BA], x - 1, y, z)
        ),
        lerp(u, 
          grad(p[AB], x, y - 1, z),
          grad(p[BB], x - 1, y - 1, z)
        )
      ),
      lerp(v, 
        lerp(u, 
          grad(p[AA + 1], x, y, z - 1),
          grad(p[BA + 1], x - 1, y, z - 1)
        ),
        lerp(u, 
          grad(p[AB + 1], x, y - 1, z - 1),
          grad(p[BB + 1], x - 1, y - 1, z - 1)
        )
      )
    );
}

/**
 * Create a simple skybox
 */
function createSkybox() {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x87ceeb, // Sky blue color
        side: THREE.BackSide
    });
    
    skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skybox);
}

/**
 * Load the house model with satellite data integration
 */
function loadHouseModel() {
    // Show building animation - direct house construction animation
    const loadingOverlay = document.getElementById('model-loading-overlay');
    loadingOverlay.style.display = 'flex';
    loadingOverlay.innerHTML = `
        <div class="house-construction-animation">
            <div class="construction-beam"></div>
            <div class="construction-foundation"></div>
            <div class="construction-walls"></div>
            <div class="construction-roof"></div>
        </div>
        <p>Building your digital home...</p>
        <div class="loading-progress-container">
            <div class="loading-progress-bar" id="model-loading-progress"></div>
        </div>
        <p id="loading-status">Constructing 3D model...</p>
    `;
    
    // Simulate building progress with construction-focused messaging
    const progressBar = document.getElementById('model-loading-progress');
    const loadingStatus = document.getElementById('loading-status');
    const buildStages = [
        { progress: 15, message: "Analyzing property data..." },
        { progress: 30, message: "Creating foundation..." },
        { progress: 45, message: "Building walls..." },
        { progress: 60, message: "Adding roof structure..." },
        { progress: 75, message: "Installing windows and doors..." },
        { progress: 90, message: "Finishing exterior details..." },
        { progress: 100, message: "Your digital home is ready!" }
    ];
    
    // Start immediately building the house model
    createHouseFromSatelliteData();
    
    // Show the build progress animation
    let currentStage = 0;
    const stageInterval = setInterval(() => {
        if (currentStage >= buildStages.length) {
            clearInterval(stageInterval);
            
            // Hide loading and show controls once the model is ready
            setTimeout(() => {
                document.getElementById('model-loading-overlay').style.display = 'none';
                
                if (document.getElementById('model-controls')) {
                    document.getElementById('model-controls').style.display = 'flex';
                }
                
                modelLoaded = true;
                
                // Start intro animation
                // Note: Intro animation is now started from initHomeModel
            }, 800);
            
            return;
        }
        
        const stage = buildStages[currentStage];
        progressBar.style.width = `${stage.progress}%`;
        loadingStatus.textContent = stage.message;
        currentStage++;
    }, 800);
}

/**
 * Create house model using satellite data
 */
function createHouseFromSatelliteData() {
    // Get home data if available, otherwise use placeholder
    const homeData = window.homeData || null;
    
    // Create the model group
    homeModel = new THREE.Group();
    
    // In a real implementation, we would use the actual satellite data
    // and property boundary information from the API response
    // For now, we'll create an enhanced model that simulates satellite-based creation
    
    // Note: Terrain is already created in initHomeModel
    
    // Create house structure with accurate dimensions
    createDetailedHouseStructure(homeData);
    
    // Add property boundaries
    createPropertyBoundaries(homeData);
    
    // Add landscaping elements (trees, shrubs, etc.)
    addLandscapingElements();
    
    // Add the house model to the scene
    homeModel.position.y = 0.25; // Raise slightly above terrain
    scene.add(homeModel);
    
    // Create feature labels
    createFeatureLabels();
}

/**
 * Create a placeholder house model (for demonstration)
 */
function createPlaceholderHouse() {
    homeModel = new THREE.Group();
    
    // House base/foundation
    const foundationGeometry = new THREE.BoxGeometry(10, 0.5, 8);
    const foundationMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa, // Concrete color
        roughness: 0.8
    });
    const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
    foundation.position.y = 0;
    foundation.receiveShadow = true;
    foundation.castShadow = true;
    homeModel.add(foundation);
    houseObjects.foundation = foundation;
    
    // Main house structure
    const houseGeometry = new THREE.BoxGeometry(10, 4, 8);
    const houseMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Yellow color for live digital build
        roughness: 0.6
    });
    const house = new THREE.Mesh(houseGeometry, houseMaterial);
    house.position.y = 2.25;
    house.receiveShadow = true;
    house.castShadow = true;
    homeModel.add(house);
    houseObjects.exterior = house;
    
    // Roof
    const roofGeometry = new THREE.ConeGeometry(7, 3, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513, // Brown color for roof
        roughness: 0.7
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 5.75;
    roof.rotation.y = Math.PI / 4;
    roof.receiveShadow = true;
    roof.castShadow = true;
    homeModel.add(roof);
    houseObjects.roof = roof;
    
    // Windows (front)
    const windowGeometry = new THREE.PlaneGeometry(1.5, 1.2);
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x87ceeb, // Light blue for windows
        roughness: 0.2,
        metalness: 0.5,
        side: THREE.DoubleSide
    });
    
    // Front windows
    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(-2, 2.5, 4.01);
    window1.receiveShadow = true;
    homeModel.add(window1);
    
    const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
    window2.position.set(2, 2.5, 4.01);
    window2.receiveShadow = true;
    homeModel.add(window2);
    
    houseObjects.windows = [window1, window2];
    
    // Door
    const doorGeometry = new THREE.PlaneGeometry(1.8, 3);
    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c4033, // Brown door
        roughness: 0.8,
        side: THREE.DoubleSide
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.5, 4.01);
    door.receiveShadow = true;
    homeModel.add(door);
    houseObjects.door = door;
    
    // Interior rooms (simplified boxes)
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff, // White walls
        roughness: 0.9
    });
    
    // Living room
    const livingRoomGeometry = new THREE.BoxGeometry(4, 3.5, 3.5);
    const livingRoom = new THREE.Mesh(livingRoomGeometry, wallMaterial);
    livingRoom.position.set(-2, 2, 0);
    livingRoom.visible = false; // Initially hidden
    homeModel.add(livingRoom);
    houseObjects.livingRoom = livingRoom;
    
    // Kitchen
    const kitchenGeometry = new THREE.BoxGeometry(4, 3.5, 3.5);
    const kitchenMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0e68c, // Light yellow for kitchen
        roughness: 0.7
    });
    const kitchen = new THREE.Mesh(kitchenGeometry, kitchenMaterial);
    kitchen.position.set(2, 2, 0);
    kitchen.visible = false; // Initially hidden
    homeModel.add(kitchen);
    houseObjects.kitchen = kitchen;
    
    // Bathroom
    const bathroomGeometry = new THREE.BoxGeometry(3, 3.5, 3);
    const bathroomMaterial = new THREE.MeshStandardMaterial({
        color: 0xadd8e6, // Light blue for bathroom
        roughness: 0.6
    });
    const bathroom = new THREE.Mesh(bathroomGeometry, bathroomMaterial);
    bathroom.position.set(2, 2, -2);
    bathroom.visible = false; // Initially hidden
    homeModel.add(bathroom);
    houseObjects.bathroom = bathroom;
    
    // Bedroom
    const bedroomGeometry = new THREE.BoxGeometry(4, 3.5, 4);
    const bedroomMaterial = new THREE.MeshStandardMaterial({
        color: 0xd8bfd8, // Light purple for bedroom
        roughness: 0.8
    });
    const bedroom = new THREE.Mesh(bedroomGeometry, bedroomMaterial);
    bedroom.position.set(-2, 2, -1.5);
    bedroom.visible = false; // Initially hidden
    homeModel.add(bedroom);
    houseObjects.bedroom = bedroom;
    
    // Add the house model to the scene
    homeModel.position.y = 0.25; // Raise slightly above ground
    scene.add(homeModel);
    
    // Create feature labels
    createFeatureLabels();
}

/**
 * Create labels for home features
 */
function createFeatureLabels() {
    const features = [
        { name: 'Roof', position: { x: 0, y: 6.5, z: 0 }, target: 'roof' },
        { name: 'Windows', position: { x: -2, y: 2.5, z: 5 }, target: 'windows' },
        { name: 'Door', position: { x: 0, y: 1.5, z: 5 }, target: 'door' },
        { name: 'Living Room', position: { x: -2, y: 2, z: 0 }, target: 'livingRoom' },
        { name: 'Kitchen', position: { x: 2, y: 2, z: 0 }, target: 'kitchen' },
        { name: 'Bathroom', position: { x: 2, y: 2, z: -2 }, target: 'bathroom' },
        { name: 'Bedroom', position: { x: -2, y: 2, z: -1.5 }, target: 'bedroom' }
    ];
    
    features.forEach(feature => {
        // Create canvas for label
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        // Draw label background
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw label text
        context.font = 'bold 36px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#ffffff';
        context.fillText(feature.name, canvas.width / 2, canvas.height / 2);
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        // Position the sprite
        sprite.position.set(
            feature.position.x,
            feature.position.y,
            feature.position.z
        );
        
        // Scale sprite to reasonable size
        sprite.scale.set(3, 1.5, 1);
        
        // Store target info on sprite
        sprite.userData = { target: feature.target };
        
        // Hide labels initially
        sprite.visible = false;
        
        // Add to scene and track
        scene.add(sprite);
        featureLabels.push(sprite);
    });
}

/**
 * Toggle visibility of feature labels
 * @param {boolean} visible - Whether labels should be visible
 */
function toggleFeatureLabels(visible) {
    featureLabels.forEach(label => {
        // Show only labels for the active section
        if (activeSection === 'exterior') {
            const target = label.userData.target;
            if (['roof', 'windows', 'door'].includes(target)) {
                label.visible = visible;
            } else {
                label.visible = false;
            }
        } else if (activeSection === 'interior') {
            const target = label.userData.target;
            if (['livingRoom', 'kitchen', 'bathroom', 'bedroom'].includes(target)) {
                label.visible = visible;
            } else {
                label.visible = false;
            }
        }
    });
}

/**
 * Load home data from API
 */
function loadHomeData() {
    // Get the home ID from data attribute or localStorage
    const homeId = document.getElementById('home-tab').getAttribute('data-home-id') || 
                  localStorage.getItem('selectedHomeId');
    
    if (!homeId) {
        console.warn('No home ID found for home tab');
        return;
    }
    
    // Fetch home data
    fetch(`/api/home/${homeId}`)
        .then(response => response.json())
        .then(data => {
            homeData = data;
            
            // Update UI with home details
            updateHomeDetails(data);
            
            // Show any relevant alerts or notifications
            checkHomeAlerts(data);
        })
        .catch(error => {
            console.error('Error fetching home data:', error);
            showErrorMessage('Could not load your home data. Please try again later.');
        });
}

/**
 * Update the home details display
 * @param {Object} data - Home data from API
 */
function updateHomeDetails(data) {
    // Update address
    document.querySelectorAll('.home-address').forEach(el => {
        el.textContent = data.address || 'Address not available';
    });
    
    // Update basic details
    if (document.getElementById('home-sqft')) {
        document.getElementById('home-sqft').textContent = 
            data.square_feet ? `${data.square_feet.toLocaleString()} sq ft` : 'Not available';
    }
    
    if (document.getElementById('home-beds')) {
        document.getElementById('home-beds').textContent = 
            data.bedrooms ? data.bedrooms : 'Not available';
    }
    
    if (document.getElementById('home-baths')) {
        document.getElementById('home-baths').textContent = 
            data.bathrooms ? data.bathrooms : 'Not available';
    }
    
    if (document.getElementById('home-year')) {
        document.getElementById('home-year').textContent = 
            data.year_built ? data.year_built : 'Not available';
    }
    
    // Update energy score if available
    if (data.energy_score) {
        window.homeEnergyScore = data.energy_score;
        
        if (document.getElementById('energy-score-value')) {
            document.getElementById('energy-score-value').textContent = data.energy_score;
            
            // Update the visual score display if it exists
            const scoreDisplay = document.querySelector('.score-display');
            if (scoreDisplay) {
                const percentage = Math.min(100, Math.max(0, data.energy_score));
                scoreDisplay.style.background = `conic-gradient(var(--primary-color) 0% ${percentage}%, #f0f0f0 ${percentage}% 100%)`;
            }
        }
    } else {
        // Default energy score for demonstration
        window.homeEnergyScore = 75;
    }
    
    // Update recommendations if available
    if (data.recommendations && data.recommendations.length > 0) {
        const recContainer = document.querySelector('.home-recommendations');
        if (recContainer) {
            const recList = recContainer.querySelector('.recommendation-list');
            if (recList) {
                recList.innerHTML = '';
                
                data.recommendations.forEach(rec => {
                    const recItem = document.createElement('div');
                    recItem.className = 'recommendation-item';
                    recItem.innerHTML = `
                        <h4 class="recommendation-title">${rec.title}</h4>
                        <p class="recommendation-description">${rec.description}</p>
                        <div class="recommendation-meta">
                            <span class="recommendation-priority">${rec.priority} Priority</span>
                            ${rec.estimated_cost ? `<span class="recommendation-cost">Est. Cost: $${rec.estimated_cost.toLocaleString()}</span>` : ''}
                        </div>
                        <button class="recommendation-action-btn" data-rec-id="${rec.id}">Take Action</button>
                    `;
                    
                    recList.appendChild(recItem);
                });
                
                // Add action button event listeners
                document.querySelectorAll('.recommendation-action-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const recId = e.target.getAttribute('data-rec-id');
                        takeRecommendationAction(recId);
                    });
                });
            }
        }
    }
}

/**
 * Check for home alerts or notifications
 * @param {Object} data - Home data
 */
function checkHomeAlerts(data) {
    const alerts = [];
    
    // Check for overdue maintenance items
    if (data.maintenance_items) {
        const overdueItems = data.maintenance_items.filter(item => {
            const dueDate = new Date(item.due_date);
            return dueDate < new Date() && !item.completed;
        });
        
        if (overdueItems.length > 0) {
            alerts.push({
                type: 'warning',
                message: `You have ${overdueItems.length} overdue maintenance ${overdueItems.length === 1 ? 'item' : 'items'}.`,
                action: 'View Maintenance'
            });
        }
    }
    
    // Check for extreme weather alerts
    if (data.weather_alerts && data.weather_alerts.length > 0) {
        data.weather_alerts.forEach(alert => {
            alerts.push({
                type: 'danger',
                message: `Weather alert: ${alert.description}`,
                action: 'View Details'
            });
        });
    }
    
    // Display alerts if any exist
    const alertsContainer = document.querySelector('.home-alerts');
    if (alertsContainer && alerts.length > 0) {
        alertsContainer.innerHTML = '';
        
        alerts.forEach(alert => {
            const alertEl = document.createElement('div');
            alertEl.className = `alert alert-${alert.type}`;
            alertEl.innerHTML = `
                <div class="alert-content">
                    <span class="alert-icon">⚠️</span>
                    <span class="alert-message">${alert.message}</span>
                </div>
                <button class="alert-action">${alert.action}</button>
            `;
            
            alertsContainer.appendChild(alertEl);
        });
        
        alertsContainer.style.display = 'block';
    }
}

/**
 * Handle taking action on a recommendation
 * @param {string} recId - Recommendation ID
 */
function takeRecommendationAction(recId) {
    // Find the recommendation
    const recommendation = homeData.recommendations.find(r => r.id === recId);
    
    if (!recommendation) {
        console.error(`Recommendation ${recId} not found`);
        return;
    }
    
    // Show appropriate modal or navigate to correct tab based on recommendation type
    switch (recommendation.type) {
        case 'maintenance':
            // Show maintenance scheduling modal
            showScheduleModal(recommendation);
            break;
        case 'upgrade':
            // Navigate to services tab with correct category
            navigateToServicesTab(recommendation.service_category);
            break;
        case 'energy':
            // Navigate to energy tab
            navigateToTab('energy');
            break;
        default:
            console.log(`Taking action on recommendation: ${recommendation.title}`);
    }
}

/**
 * Show scheduling modal for a recommendation
 * @param {Object} recommendation - Recommendation data
 */
function showScheduleModal(recommendation) {
    // Create modal HTML
    let modalHTML = `
        <div class="schedule-modal-content">
            <button class="close-modal">&times;</button>
            <h2 class="schedule-modal-title">Schedule Maintenance</h2>
            <h3 class="schedule-service-name">${recommendation.title}</h3>
            
            <div class="schedule-service-details">
                <p>${recommendation.description}</p>
                ${recommendation.estimated_cost ? `<p class="estimated-cost">Estimated Cost: $${recommendation.estimated_cost.toLocaleString()}</p>` : ''}
            </div>
            
            <form id="schedule-form">
                <div class="form-group">
                    <label>When would you like to schedule this?</label>
                    <div class="schedule-options">
                        <button type="button" class="schedule-option" data-value="asap">As soon as possible</button>
                        <button type="button" class="schedule-option" data-value="this-week">This week</button>
                        <button type="button" class="schedule-option" data-value="this-month">This month</button>
                        <button type="button" class="schedule-option" data-value="custom">Choose a date</button>
                    </div>
                    <div class="custom-date-selector" style="display: none;">
                        <input type="date" id="custom-date" name="custom-date">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="schedule-notes">Additional notes</label>
                    <textarea id="schedule-notes" rows="3" placeholder="Add any specific details or requests..."></textarea>
                </div>
                
                <div class="schedule-actions">
                    <button type="button" class="cancel-schedule">Cancel</button>
                    <button type="submit" class="submit-schedule">Schedule Service</button>
                </div>
            </form>
        </div>
    `;
    
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'schedule-modal';
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);
    
    // Show the modal with animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Close button functionality
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', closeModal);
    
    // Cancel button
    const cancelBtn = modal.querySelector('.cancel-schedule');
    cancelBtn.addEventListener('click', closeModal);
    
    // Schedule option buttons
    const scheduleOptions = modal.querySelectorAll('.schedule-option');
    scheduleOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            // Remove active class from all options
            scheduleOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            e.target.classList.add('active');
            
            // Show/hide custom date selector
            const customDateSelector = modal.querySelector('.custom-date-selector');
            customDateSelector.style.display = e.target.getAttribute('data-value') === 'custom' ? 'block' : 'none';
        });
    });
    
    // Form submission
    const form = modal.querySelector('#schedule-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get selected option
        const selectedOption = modal.querySelector('.schedule-option.active');
        const scheduleType = selectedOption ? selectedOption.getAttribute('data-value') : 'asap';
        
        // Get custom date if applicable
        let scheduledDate = null;
        if (scheduleType === 'custom') {
            scheduledDate = modal.querySelector('#custom-date').value;
        }
        
        // Get notes
        const notes = modal.querySelector('#schedule-notes').value;
        
        // Submit scheduling request
        submitScheduleRequest({
            recommendation_id: recommendation.id,
            schedule_type: scheduleType,
            scheduled_date: scheduledDate,
            notes: notes
        });
        
        // Close modal
        closeModal();
    });
    
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    }
}

/**
 * Submit a schedule request to the API
 * @param {Object} scheduleData - Schedule request data
 */
function submitScheduleRequest(scheduleData) {
    // In a real implementation, this would make an API call
    console.log('Submitting schedule request:', scheduleData);
    
    // Show success toast
    showToast('Service scheduled successfully!', 'success');
}

/**
 * Navigate to the Services tab with a specific category selected
 * @param {string} category - Service category ID
 */
function navigateToServicesTab(category) {
    // Navigate to services tab
    navigateToTab('services');
    
    // Wait for the tab to load, then select the category
    setTimeout(() => {
        // Dispatch a custom event that the services tab can listen for
        const event = new CustomEvent('selectServiceCategory', {
            detail: { category: category }
        });
        document.dispatchEvent(event);
    }, 300);
}

/**
 * Navigate to a specific tab
 * @param {string} tabId - The ID of the tab to navigate to
 */
function navigateToTab(tabId) {
    const tab = document.querySelector(`.tab[data-tab="${tabId}"]`);
    if (tab) {
        tab.click();
    }
}

/**
 * Show error message on the home tab
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
    const homeContent = document.querySelector('.home-content');
    if (homeContent) {
        const errorEl = document.createElement('div');
        errorEl.className = 'home-error-message';
        errorEl.innerHTML = `
            <div class="error-icon">❌</div>
            <p>${message}</p>
            <button class="retry-btn">Retry</button>
        `;
        
        homeContent.appendChild(errorEl);
        
        // Add retry button functionality
        const retryBtn = errorEl.querySelector('.retry-btn');
        retryBtn.addEventListener('click', () => {
            errorEl.remove();
            loadHomeData();
        });
    }
}

/**
 * Setup section navigation (exterior vs interior)
 */
function setupSectionNav() {
    const sectionBtns = document.querySelectorAll('.section-nav-btn');
    if (sectionBtns.length === 0) return;
    
    sectionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            if (section) {
                switchSection(section);
            }
        });
    });
}

/**
 * Switch between exterior and interior views
 * @param {string} section - 'exterior' or 'interior'
 */
function switchSection(section) {
    if (section === activeSection) return;
    
    // Update active button
    document.querySelectorAll('.section-nav-btn').forEach(btn => {
        if (btn.getAttribute('data-section') === section) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Transition to new section
    if (section === 'exterior') {
        // Switch to exterior view
        showExteriorView();
    } else if (section === 'interior') {
        // Switch to interior view
        showInteriorView();
    }
    
    // Update active section
    activeSection = section;
    
    // Update feature labels
    const showLabels = document.getElementById('toggle-labels')?.checked || false;
    toggleFeatureLabels(showLabels);
}

/**
 * Show exterior view of the house
 */
function showExteriorView() {
    // Animate camera transition
    animateCamera(cameraPositions.exterior, new THREE.Vector3(0, 0, 0));
    
    // Show exterior elements, hide interior elements
    Object.keys(houseObjects).forEach(key => {
        if (['foundation', 'exterior', 'roof', 'windows', 'door'].includes(key)) {
            if (Array.isArray(houseObjects[key])) {
                houseObjects[key].forEach(obj => {
                    obj.visible = true;
                });
            } else {
                houseObjects[key].visible = true;
            }
        } else {
            if (Array.isArray(houseObjects[key])) {
                houseObjects[key].forEach(obj => {
                    obj.visible = false;
                });
            } else {
                houseObjects[key].visible = false;
            }
        }
    });
    
    // Make house exterior visible
    houseObjects.exterior.material.transparent = false;
    houseObjects.exterior.material.opacity = 1.0;
}

/**
 * Show interior view of the house
 */
function showInteriorView() {
    // Animate camera transition
    animateCamera(cameraPositions.interior, new THREE.Vector3(0, 0, 0));
    
    // Make exterior semi-transparent
    houseObjects.exterior.material.transparent = true;
    houseObjects.exterior.material.opacity = 0.3;
    
    // Show interior elements
    Object.keys(houseObjects).forEach(key => {
        if (['foundation', 'exterior', 'roof'].includes(key)) {
            if (Array.isArray(houseObjects[key])) {
                houseObjects[key].forEach(obj => {
                    obj.visible = true;
                });
            } else {
                houseObjects[key].visible = true;
            }
        } else if (['livingRoom', 'kitchen', 'bathroom', 'bedroom'].includes(key)) {
            if (Array.isArray(houseObjects[key])) {
                houseObjects[key].forEach(obj => {
                    obj.visible = true;
                });
            } else {
                houseObjects[key].visible = true;
            }
        }
    });
}

/**
 * Animate camera to new position and target
 * @param {Object} newPosition - {x, y, z} coordinates
 * @param {THREE.Vector3} newTarget - Target point to look at
 */
function animateCamera(newPosition, newTarget) {
    // Store original values
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    
    // Define animation duration
    const duration = 1000; // milliseconds
    const startTime = Date.now();
    
    // Animation function
    function animateCameraMove() {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Use an easing function for smoother animation
        const easedProgress = easeInOutCubic(progress);
        
        // Interpolate position
        camera.position.x = startPos.x + (newPosition.x - startPos.x) * easedProgress;
        camera.position.y = startPos.y + (newPosition.y - startPos.y) * easedProgress;
        camera.position.z = startPos.z + (newPosition.z - startPos.z) * easedProgress;
        
        // Interpolate target
        controls.target.x = startTarget.x + (newTarget.x - startTarget.x) * easedProgress;
        controls.target.y = startTarget.y + (newTarget.y - startTarget.y) * easedProgress;
        controls.target.z = startTarget.z + (newTarget.z - startTarget.z) * easedProgress;
        
        // Update controls
        controls.update();
        
        // Continue animation if not finished
        if (progress < 1) {
            requestAnimationFrame(animateCameraMove);
        }
    }
    
    // Start animation
    animateCameraMove();
}

/**
 * Easing function for smoother animation
 * @param {number} t - Progress value (0-1)
 * @returns {number} - Eased value
 */
function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Handle click on the model
 * @param {Event} event - Mouse click event
 */
function onModelClick(event) {
    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2(x, y);
    
    // Set the raycaster from the camera and mouse position
    raycaster.setFromCamera(mouseVector, camera);
    
    // Get all objects intersected by the ray
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Check for intersections
    if (intersects.length > 0) {
        // Get the first intersected object
        const object = intersects[0].object;
        
        // Check if it's a part of the house
        for (const key in houseObjects) {
            if (Array.isArray(houseObjects[key])) {
                if (houseObjects[key].includes(object)) {
                    highlightFeature(key);
                    return;
                }
            } else if (houseObjects[key] === object) {
                highlightFeature(key);
                return;
            }
        }
        
        // Check if it's a feature label sprite
        if (object.isSprite && object.userData.target) {
            highlightFeature(object.userData.target);
            return;
        }
    }
}

/**
 * Highlight a specific feature of the house
 * @param {string} featureKey - Key of the feature to highlight
 */
function highlightFeature(featureKey) {
    // Remove previous highlight
    if (highlightedFeature) {
        if (Array.isArray(houseObjects[highlightedFeature])) {
            houseObjects[highlightedFeature].forEach(obj => {
                if (obj.material._originalColor) {
                    obj.material.color.set(obj.material._originalColor);
                    delete obj.material._originalColor;
                }
            });
        } else if (houseObjects[highlightedFeature] && houseObjects[highlightedFeature].material) {
            if (houseObjects[highlightedFeature].material._originalColor) {
                houseObjects[highlightedFeature].material.color.set(houseObjects[highlightedFeature].material._originalColor);
                delete houseObjects[highlightedFeature].material._originalColor;
            }
        }
    }
    
    // Apply new highlight
    if (houseObjects[featureKey]) {
        if (Array.isArray(houseObjects[featureKey])) {
            houseObjects[featureKey].forEach(obj => {
                if (!obj.material._originalColor) {
                    obj.material._originalColor = obj.material.color.clone();
                }
                obj.material.color.set(0xffff00); // Highlight with yellow color
            });
        } else if (houseObjects[featureKey].material) {
            if (!houseObjects[featureKey].material._originalColor) {
                houseObjects[featureKey].material._originalColor = houseObjects[featureKey].material.color.clone();
            }
            houseObjects[featureKey].material.color.set(0xffff00); // Highlight with yellow color
        }
    }
    
    // Store currently highlighted feature
    highlightedFeature = featureKey;
    
    // Show feature info
    showFeatureInfo(featureKey);
}

/**
 * Show information about a feature
 * @param {string} featureKey - Key of the feature
 */
function showFeatureInfo(featureKey) {
    // Define feature information
    const featureInfo = {
        roof: {
            title: 'Roof',
            details: 'Asphalt shingle roof installed in 2015. Last inspection: 2022.'
        },
        windows: {
            title: 'Windows',
            details: 'Double-pane vinyl windows installed in 2018. Energy efficient with UV protection.'
        },
        door: {
            title: 'Front Door',
            details: 'Solid wood door with deadbolt security lock. Installed in 2020.'
        },
        livingRoom: {
            title: 'Living Room',
            details: '300 sq ft living room with hardwood floors and south-facing windows.'
        },
        kitchen: {
            title: 'Kitchen',
            details: '200 sq ft kitchen with granite countertops and stainless steel appliances.'
        },
        bathroom: {
            title: 'Bathroom',
            details: '80 sq ft bathroom with walk-in shower and modern fixtures.'
        },
        bedroom: {
            title: 'Bedroom',
            details: '180 sq ft primary bedroom with walk-in closet and ceiling fan.'
        }
    };
    
    // Get feature description
    const info = featureInfo[featureKey] || { title: featureKey, details: 'No additional information available.' };
    
    // Create and show feature info tooltip
    const tooltip = document.getElementById('feature-tooltip') || document.createElement('div');
    tooltip.id = 'feature-tooltip';
    tooltip.className = 'feature-tooltip';
    tooltip.innerHTML = `
        <h3>${info.title}</h3>
        <p>${info.details}</p>
    `;
    
    // Add to document if it doesn't exist
    if (!document.getElementById('feature-tooltip')) {
        document.body.appendChild(tooltip);
    }
    
    // Position tooltip near the cursor
    document.addEventListener('mousemove', positionTooltip);
    
    // Add close button functionality
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-tooltip';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', removeTooltip);
    tooltip.appendChild(closeBtn);
    
    // Remove tooltip when clicking elsewhere
    document.addEventListener('click', removeTooltip);
    
    function positionTooltip(e) {
        const windowWidth = window.innerWidth;
        const tooltipWidth = tooltip.offsetWidth;
        
        // Position tooltip to avoid going off-screen
        if (e.clientX + tooltipWidth + 20 > windowWidth) {
            tooltip.style.left = (e.clientX - tooltipWidth - 10) + 'px';
        } else {
            tooltip.style.left = (e.clientX + 20) + 'px';
        }
        
        tooltip.style.top = (e.clientY + 20) + 'px';
    }
    
    function removeTooltip() {
        document.removeEventListener('mousemove', positionTooltip);
        document.removeEventListener('click', removeTooltip);
        if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    }
}

/**
 * Setup feature highlighting functionality
 */
function setupFeatureHighlighting() {
    // Toggle feature labels
    const labelsToggle = document.getElementById('toggle-labels');
    if (labelsToggle) {
        labelsToggle.addEventListener('change', (e) => {
            toggleFeatureLabels(e.target.checked);
        });
    }
}

/**
 * Setup animation controls
 */
function setupAnimationControls() {
    // Auto-rotate toggle
    const rotateToggle = document.getElementById('toggle-rotate');
    if (rotateToggle) {
        rotateToggle.addEventListener('change', (e) => {
            controls.autoRotate = e.target.checked;
        });
    }
    
    // Reset view button
    const resetViewBtn = document.getElementById('reset-view');
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', () => {
            if (activeSection === 'exterior') {
                animateCamera(cameraPositions.exterior, new THREE.Vector3(0, 0, 0));
            } else {
                animateCamera(cameraPositions.interior, new THREE.Vector3(0, 0, 0));
            }
        });
    }
}

/**
 * Handle window resize
 */
function onWindowResize() {
    const container = document.getElementById('model-canvas');
    if (!container) return;
    
    // Update camera
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    
    // Update renderer
    renderer.setSize(container.clientWidth, container.clientHeight);
}

/**
 * Animation loop
 */
function animate() {
    animationFrameId = requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Update any active animations
    if (cameraAnimation && cameraAnimation.isActive) {
        cameraAnimation.update();
    }
    
    // Render scene
    renderer.render(scene, camera);
}

/**
 * Start the model intro animation sequence
 */
function startModelIntroAnimation() {
    // Create a sequence of camera movements to showcase the property
    
    // Initial position (aerial view)
    camera.position.set(0, 30, 30);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    
    // Define camera animation paths
    const cameraPath = [
        {
            position: { x: 0, y: 30, z: 30 },
            target: { x: 0, y: 0, z: 0 },
            duration: 2000
        },
        {
            position: { x: 20, y: 15, z: 0 },
            target: { x: 0, y: 2, z: 0 },
            duration: 3000
        },
        {
            position: { x: 0, y: 10, z: -20 },
            target: { x: 0, y: 2, z: 0 },
            duration: 3000
        },
        {
            position: { x: -20, y: 15, z: 0 },
            target: { x: 0, y: 2, z: 0 },
            duration: 3000
        },
        {
            position: { x: 0, y: 10, z: 20 },
            target: { x: 0, y: 3, z: 0 },
            duration: 3000
        },
        {
            position: { x: 15, y: 10, z: 15 }, // Final position
            target: { x: 0, y: 2, z: 0 },
            duration: 2000
        }
    ];
    
    // Start the camera animation sequence
    startCameraSequence(cameraPath);
    
    // Create the energy score indicator after a delay
    setTimeout(createEnergyScoreIndicator, 2000);
}

/**
 * Create the 3D energy score indicator that floats above the house
 */
function createEnergyScoreIndicator() {
    // Get energy score from window object (should have been set by updateHomeDetails)
    const energyScore = window.homeEnergyScore || 75;
    
    // Create a container for the energy score
    const energyIndicator = new THREE.Group();
    energyIndicator.position.set(-12, 10, 0); // Position to the left of the house
    
    // Create the energy score ring
    const ringGeometry = new THREE.RingGeometry(2, 2.5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // Flat ring in xz plane
    energyIndicator.add(ring);
    
    // Create energy score arc (representing the score percentage)
    const arcGeometry = new THREE.CircleGeometry(2.25, 32, 0, (energyScore / 100) * Math.PI * 2);
    const arcMaterial = new THREE.MeshBasicMaterial({
        color: getScoreColor(energyScore),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const arc = new THREE.Mesh(arcGeometry, arcMaterial);
    arc.rotation.x = -Math.PI / 2;
    energyIndicator.add(arc);
    
    // Add energy label using canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw circular background
    context.beginPath();
    context.arc(128, 128, 100, 0, Math.PI * 2);
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fill();
    
    // Draw score text
    context.font = 'bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = getScoreColorHex(energyScore);
    context.fillText(energyScore, 128, 110);
    
    // Draw "Energy" text
    context.font = '24px Arial';
    context.fillStyle = '#ffffff';
    context.fillText('Energy', 128, 160);
    
    // Draw "Click for details" text
    context.font = '18px Arial';
    context.fillStyle = '#cccccc';
    context.fillText('Click for details', 128, 190);
    
    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(5, 5, 1);
    sprite.position.set(0, 0, 0);
    energyIndicator.add(sprite);
    
    // Add to scene
    scene.add(energyIndicator);
    
    // Store in house objects
    houseObjects.energyIndicator = energyIndicator;
    
    // Add click handler
    makeEnergyIndicatorClickable(energyIndicator);
    
    // Add hover animation
    animateEnergyIndicator(energyIndicator);
}

/**
 * Make the energy indicator clickable
 */
function makeEnergyIndicatorClickable(indicator) {
    if (!indicator) return;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Get the canvas element
    const canvas = renderer.domElement;
    
    // Add click event listener
    canvas.addEventListener('click', onCanvasClick);
    
    function onCanvasClick(event) {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / canvas.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / canvas.clientHeight) * 2 + 1;
        
        // Set the raycaster
        raycaster.setFromCamera(mouse, camera);
        
        // Check for intersections with energy indicator
        const intersects = raycaster.intersectObject(indicator, true);
        
        if (intersects.length > 0) {
            // User clicked on energy indicator
            showEnergyDetailsModal();
        }
    }
}

/**
 * Animate the energy indicator to attract user attention
 */
function animateEnergyIndicator(indicator) {
    if (!indicator) return;
    
    const initialY = indicator.position.y;
    let hoverDirection = 1; // 1 for up, -1 for down
    let hoverSpeed = 0.01;
    let hoverDistance = 0.5;
    let pulseScale = 1.0;
    let pulseDirection = 1; // 1 for growing, -1 for shrinking
    
    // Animate in render loop
    function updateEnergyAnimation() {
        if (!indicator) return;
        
        // Hover animation
        indicator.position.y += hoverDirection * hoverSpeed;
        
        // Reverse direction at extremes
        if (indicator.position.y > initialY + hoverDistance) {
            hoverDirection = -1;
        } else if (indicator.position.y < initialY - hoverDistance) {
            hoverDirection = 1;
        }
        
        // Subtle pulse animation
        pulseScale += pulseDirection * 0.002;
        if (pulseScale > 1.1) {
            pulseDirection = -1;
        } else if (pulseScale < 0.95) {
            pulseDirection = 1;
        }
        
        // Apply pulse to sprite
        if (indicator.children[2]) {
            indicator.children[2].scale.set(5 * pulseScale, 5 * pulseScale, 1);
        }
        
        // Continue animation
        requestAnimationFrame(updateEnergyAnimation);
    }
    
    // Start the animation
    updateEnergyAnimation();
}

/**
 * Show detailed energy information modal
 */
function showEnergyDetailsModal() {
    // Get energy score
    const energyScore = window.homeEnergyScore || 75;
    
    // Create modal HTML
    const modalHTML = `
        <div class="energy-modal">
            <div class="energy-modal-content">
                <div class="energy-modal-header">
                    <h2>Energy Efficiency Score</h2>
                    <button class="close-modal-btn">&times;</button>
                </div>
                <div class="energy-modal-body">
                    <div class="energy-score-display">
                        <div class="circular-progress" style="background: conic-gradient(${getScoreColorHex(energyScore)} 0% ${energyScore}%, #e0e0e0 ${energyScore}% 100%)">
                            <div class="circular-inner">
                                <span class="score-number">${energyScore}</span>
                                <span class="score-label">Score</span>
                            </div>
                        </div>
                        <div class="score-rating">
                            <h3>${getScoreRating(energyScore)}</h3>
                            <p>${getScoreDescription(energyScore)}</p>
                        </div>
                    </div>
                    
                    <div class="energy-details">
                        <div class="energy-detail-section">
                            <h3>Energy Consumption Breakdown</h3>
                            <div class="energy-breakdown">
                                <div class="breakdown-item">
                                    <div class="breakdown-label">Heating & Cooling</div>
                                    <div class="breakdown-bar">
                                        <div class="breakdown-fill" style="width: 45%"></div>
                                    </div>
                                    <div class="breakdown-value">45%</div>
                                </div>
                                <div class="breakdown-item">
                                    <div class="breakdown-label">Water Heating</div>
                                    <div class="breakdown-bar">
                                        <div class="breakdown-fill" style="width: 20%"></div>
                                    </div>
                                    <div class="breakdown-value">20%</div>
                                </div>
                                <div class="breakdown-item">
                                    <div class="breakdown-label">Appliances</div>
                                    <div class="breakdown-bar">
                                        <div class="breakdown-fill" style="width: 15%"></div>
                                    </div>
                                    <div class="breakdown-value">15%</div>
                                </div>
                                <div class="breakdown-item">
                                    <div class="breakdown-label">Lighting</div>
                                    <div class="breakdown-bar">
                                        <div class="breakdown-fill" style="width: 10%"></div>
                                    </div>
                                    <div class="breakdown-value">10%</div>
                                </div>
                                <div class="breakdown-item">
                                    <div class="breakdown-label">Other</div>
                                    <div class="breakdown-bar">
                                        <div class="breakdown-fill" style="width: 10%"></div>
                                    </div>
                                    <div class="breakdown-value">10%</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="energy-recommendations">
                            <h3>Recommendations</h3>
                            <ul class="recommendation-list">
                                ${getEnergyRecommendations(energyScore).map(rec => `
                                    <li class="energy-recommendation">
                                        <div class="recommendation-header">
                                            <span class="recommendation-title">${rec.title}</span>
                                            <span class="recommendation-savings">Save $${rec.savings}/yr</span>
                                        </div>
                                        <p>${rec.description}</p>
                                        <button class="recommendation-action" data-action="${rec.action}">Learn More</button>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="energy-modal-footer">
                    <button class="energy-action-btn">View Full Energy Report</button>
                    <button class="energy-schedule-btn">Schedule Energy Audit</button>
                    <button class="close-modal-btn secondary">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Create modal element
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-overlay';
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Show modal with animation
    setTimeout(() => {
        modalContainer.classList.add('show');
    }, 10);
    
    // Close button handlers
    const closeButtons = modalContainer.querySelectorAll('.close-modal-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modalContainer.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modalContainer);
            }, 300);
        });
    });
    
    // Action button handlers
    const actionButtons = modalContainer.querySelectorAll('.recommendation-action');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            console.log('Recommendation action:', action);
            
            // Close the modal
            modalContainer.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modalContainer);
            }, 300);
            
            // Navigate to appropriate section or show appropriate modal
            if (action === 'schedule_audit') {
                // Show scheduling modal
                showScheduleModal({
                    title: 'Professional Energy Audit',
                    description: 'A professional energy auditor will inspect your home and identify ways to improve energy efficiency.',
                    estimated_cost: 299,
                    id: 'energy-audit',
                    type: 'energy'
                });
            } else if (action === 'view_hvac') {
                // Navigate to services tab
                navigateToServicesTab('hvac');
            } else if (action === 'view_insulation') {
                navigateToServicesTab('insulation');
            }
        });
    });
    
    // Schedule energy audit button
    const scheduleBtn = modalContainer.querySelector('.energy-schedule-btn');
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', () => {
            modalContainer.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modalContainer);
                
                // Show scheduling modal
                showScheduleModal({
                    title: 'Professional Energy Audit',
                    description: 'A professional energy auditor will inspect your home and identify ways to improve energy efficiency.',
                    estimated_cost: 299,
                    id: 'energy-audit',
                    type: 'energy'
                });
            }, 300);
        });
    }
    
    // View full report button
    const reportBtn = modalContainer.querySelector('.energy-action-btn');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            console.log('View full energy report');
            
            // Could navigate to energy tab or open detailed report
            alert('Full energy report would be displayed here');
        });
    }
}

/**
 * Get score color based on energy score
 */
function getScoreColor(score) {
    if (score >= 90) return 0x00c853; // Green
    if (score >= 75) return 0x7cb342; // Light green
    if (score >= 60) return 0xffd600; // Yellow
    if (score >= 40) return 0xff9100; // Orange
    return 0xd50000; // Red
}

/**
 * Get score color as hex string
 */
function getScoreColorHex(score) {
    if (score >= 90) return '#00c853'; // Green
    if (score >= 75) return '#7cb342'; // Light green
    if (score >= 60) return '#ffd600'; // Yellow
    if (score >= 40) return '#ff9100'; // Orange
    return '#d50000'; // Red
}

/**
 * Get score rating based on score
 */
function getScoreRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
}

/**
 * Get score description based on score
 */
function getScoreDescription(score) {
    if (score >= 90) {
        return 'Your home is extremely energy efficient. It meets or exceeds modern efficiency standards.';
    } else if (score >= 75) {
        return 'Your home has good energy efficiency with some room for improvement in specific areas.';
    } else if (score >= 60) {
        return 'Your home has average energy efficiency. Several improvements could significantly reduce energy costs.';
    } else if (score >= 40) {
        return 'Your home has below-average efficiency. Consider prioritizing energy improvements.';
    } else {
        return 'Your home has poor energy efficiency. Substantial improvements are recommended to reduce energy costs.';
    }
}

/**
 * Get energy recommendations based on score
 */
function getEnergyRecommendations(score) {
    const recommendations = [];
    
    // Common recommendations for all scores
    recommendations.push({
        title: 'Professional Energy Audit',
        description: 'Get a detailed assessment of your home\'s energy usage and customized recommendations.',
        savings: 250,
        action: 'schedule_audit'
    });
    
    // Score-specific recommendations
    if (score < 75) {
        recommendations.push({
            title: 'HVAC System Upgrade',
            description: 'Replace your aging HVAC system with a high-efficiency model.',
            savings: 350,
            action: 'view_hvac'
        });
    }
    
    if (score < 60) {
        recommendations.push({
            title: 'Improved Insulation',
            description: 'Upgrade attic and wall insulation to prevent heat loss/gain.',
            savings: 200,
            action: 'view_insulation'
        });
    }
    
    if (score < 50) {
        recommendations.push({
            title: 'Window Replacement',
            description: 'Replace single-pane windows with Energy Star certified ones.',
            savings: 180,
            action: 'view_windows'
        });
    }
    
    if (score < 40) {
        recommendations.push({
            title: 'Air Sealing',
            description: 'Seal air leaks around doors, windows, and other openings.',
            savings: 120,
            action: 'view_air_sealing'
        });
    }
    
    return recommendations;
}

/**
 * Camera animation object
 */
let cameraAnimation = {
    isActive: false,
    startPosition: null,
    endPosition: null,
    startTarget: null,
    endTarget: null,
    startTime: null,
    duration: 1000,
    onComplete: null,
    
    start: function(startPos, endPos, startTarget, endTarget, duration, onComplete) {
        this.startPosition = startPos.clone();
        this.endPosition = endPos.clone();
        this.startTarget = startTarget.clone();
        this.endTarget = endTarget.clone();
        this.startTime = Date.now();
        this.duration = duration;
        this.onComplete = onComplete;
        this.isActive = true;
    },
    
    update: function() {
        if (!this.isActive) return;
        
        const elapsed = Date.now() - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        
        // Use easing function for smoother movement
        const t = easeInOutCubic(progress);
        
        // Interpolate camera position
        camera.position.lerpVectors(this.startPosition, this.endPosition, t);
        
        // Interpolate target position
        controls.target.lerpVectors(this.startTarget, this.endTarget, t);
        
        // If animation is complete
        if (progress >= 1) {
            this.isActive = false;
            if (this.onComplete) this.onComplete();
        }
    }
};

/**
 * Start a sequence of camera animations
 */
function startCameraSequence(path, index = 0) {
    if (index >= path.length) return;
    
    const current = path[index];
    
    // Get start position (current camera position)
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    
    // Get end position from path
    const endPos = new THREE.Vector3(
        current.position.x,
        current.position.y,
        current.position.z
    );
    
    const endTarget = new THREE.Vector3(
        current.target.x,
        current.target.y,
        current.target.z
    );
    
    // Start the animation
    cameraAnimation.start(
        startPos, 
        endPos, 
        startTarget,
        endTarget,
        current.duration,
        () => {
            // When animation completes, move to next in sequence
            setTimeout(() => {
                startCameraSequence(path, index + 1);
            }, 500); // Short pause between segments
        }
    );
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, info)
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}-toast`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }
    }, 5000);
}