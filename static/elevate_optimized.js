/**
 * GlassRain Elevate Optimized JS
 * Provides interactive room customization with client-side-only AR and 3D functionality
 * Uses Three.js for rendering and implements performance optimizations
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the Elevate tab once the document is loaded
    if (document.getElementById('elevate-tab-content')) {
        initElevateTab();
    }
});

let roomProducts = []; // Products currently in the room
let cartItems = []; // Items in the cart
let allProducts = []; // All available products
let currentRoom = 'living-room'; // Default room
let roomVersions = {}; // Saved room versions

// Three.js global variables
let scene, camera, renderer, controls;
let roomContainer;
let isThreeJsInitialized = false;

// Debounce function to prevent frequent calls
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Initialize the Elevate tab
function initElevateTab() {
    console.log('Initializing Elevate tab...');
    
    // Get DOM elements
    roomContainer = document.getElementById('room-container');
    const roomSelector = document.getElementById('room-selector');
    const saveVersionBtn = document.getElementById('save-version-btn');
    const versionsDropdown = document.getElementById('versions-dropdown');
    const loadBtn = document.getElementById('load-btn');
    const clearRoomBtn = document.getElementById('clear-room-btn');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    
    // Initialize room 3D view
    initializeThreeJs();
    
    // Initialize room selector
    initRoomSelector();
    
    // Initialize version controls
    initVersionControls();
    
    // Setup product placement listeners
    setupProductPlacementListeners();
    
    // Setup cart management
    setupCartManagement();
    
    // Load products
    loadProducts();
    
    // Clear room button
    clearRoomBtn.addEventListener('click', function() {
        clearRoom();
    });
    
    // If AR is supported, initialize AR features
    if (isArSupported()) {
        initializeAR();
    }
    
    // Initialize UI components
    initializeUIComponents();
}

// Initialize Three.js for 3D room visualization
function initializeThreeJs() {
    if (isThreeJsInitialized) return;
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, roomContainer.clientWidth / roomContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(roomContainer.clientWidth, roomContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    roomContainer.appendChild(renderer.domElement);
    
    // Add OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Create a floor
    createRoom(currentRoom);
    
    // Start animation loop
    animate();
    
    // Handle window resize
    window.addEventListener('resize', debounce(function() {
        camera.aspect = roomContainer.clientWidth / roomContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(roomContainer.clientWidth, roomContainer.clientHeight);
    }, 250));
    
    isThreeJsInitialized = true;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Create a room based on the selected room type
function createRoom(roomType) {
    // Clear existing room objects
    while(scene.children.length > 0) { 
        scene.remove(scene.children[0]); 
    }
    
    // Add lights back
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xeeeeee,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Create walls based on room type
    createWalls(roomType);
    
    // Reset camera position
    camera.position.set(0, 5, 10);
    controls.target.set(0, 2, 0);
    controls.update();
}

// Create walls based on room type
function createWalls(roomType) {
    let wallColor, roomWidth, roomLength, hasWindows;
    
    // Set room properties based on room type
    switch(roomType) {
        case 'living-room':
            wallColor = 0xf5f5f5;
            roomWidth = 18;
            roomLength = 18;
            hasWindows = true;
            break;
        case 'bedroom':
            wallColor = 0xf0e6e6;
            roomWidth = 16;
            roomLength = 14;
            hasWindows = true;
            break;
        case 'kitchen':
            wallColor = 0xecf0f1;
            roomWidth = 14;
            roomLength = 12;
            hasWindows = true;
            break;
        case 'bathroom':
            wallColor = 0xe6f0ef;
            roomWidth = 10;
            roomLength = 8;
            hasWindows = false;
            break;
        case 'office':
            wallColor = 0xe6e6f0;
            roomWidth = 12;
            roomLength = 12;
            hasWindows = true;
            break;
        case 'dining':
            wallColor = 0xf0eee6;
            roomWidth = 14;
            roomLength = 14;
            hasWindows = true;
            break;
        default:
            wallColor = 0xf5f5f5;
            roomWidth = 16;
            roomLength = 16;
            hasWindows = true;
    }
    
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: wallColor,
        roughness: 0.9
    });
    
    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(roomWidth, 8);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 4, -roomLength/2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);
    
    // Left wall
    const leftWallGeometry = new THREE.PlaneGeometry(roomLength, 8);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-roomWidth/2, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    
    // Right wall
    const rightWallGeometry = new THREE.PlaneGeometry(roomLength, 8);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(roomWidth/2, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);
    
    // Add windows if the room has them
    if (hasWindows) {
        addWindows(roomType, roomWidth, roomLength);
    }
}

// Add windows to the room
function addWindows(roomType, roomWidth, roomLength) {
    // Window material
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x88ccff,
        transparent: true,
        opacity: 0.6,
        roughness: 0.1
    });
    
    // Add windows based on room type
    if (roomType === 'living-room' || roomType === 'dining') {
        // Large window on back wall
        const windowGeometry = new THREE.PlaneGeometry(6, 4);
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(0, 4, -roomLength/2 + 0.1);
        scene.add(window1);
    } else if (roomType === 'bedroom' || roomType === 'office') {
        // Window on right wall
        const windowGeometry = new THREE.PlaneGeometry(4, 3);
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(roomWidth/2 - 0.1, 4, -roomLength/4);
        window1.rotation.y = -Math.PI / 2;
        scene.add(window1);
    } else if (roomType === 'kitchen') {
        // Window above sink area
        const windowGeometry = new THREE.PlaneGeometry(3, 2);
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(0, 5, -roomLength/2 + 0.1);
        scene.add(window1);
    }
}

// Initialize room selector
function initRoomSelector() {
    const roomSelector = document.getElementById('room-selector');
    
    roomSelector.addEventListener('change', function() {
        currentRoom = this.value;
        console.log('Room changed to:', currentRoom);
        
        // Create new room
        createRoom(currentRoom);
        
        // Clear products from the scene
        clearRoom();
        
        // Load saved version if available
        loadRoomVersion();
    });
}

// Initialize version controls
function initVersionControls() {
    const saveVersionBtn = document.getElementById('save-version-btn');
    const versionsDropdown = document.getElementById('versions-dropdown');
    const loadBtn = document.getElementById('load-btn');
    
    // Save version button
    saveVersionBtn.addEventListener('click', function() {
        saveRoomVersion();
    });
    
    // Load version from dropdown selection
    versionsDropdown.addEventListener('change', function() {
        const versionId = this.value;
        if (versionId) {
            loadVersion(versionId);
        }
    });
    
    // Load button
    loadBtn.addEventListener('click', function() {
        const versionId = versionsDropdown.value;
        if (versionId) {
            loadVersion(versionId);
        }
    });
    
    // Load room versions for current room
    loadRoomVersions();
}

// Save current room version in local storage
function saveRoomVersion() {
    const versionName = prompt('Enter a name for this room version:', `${currentRoom} - ${new Date().toLocaleDateString()}`);
    
    if (!versionName) return;
    
    const versionId = `room_${currentRoom}_${Date.now()}`;
    const version = {
        id: versionId,
        name: versionName,
        room: currentRoom,
        products: roomProducts,
        date: new Date().toISOString()
    };
    
    // Get existing versions from local storage
    let savedVersions = JSON.parse(localStorage.getItem('roomVersions') || '{}');
    
    // Add new version
    if (!savedVersions[currentRoom]) {
        savedVersions[currentRoom] = [];
    }
    
    savedVersions[currentRoom].push(version);
    
    // Save to local storage
    localStorage.setItem('roomVersions', JSON.stringify(savedVersions));
    
    // Update versions dropdown
    loadRoomVersions();
    
    // Show success message
    showToast('Room version saved successfully!');
}

// Load saved room versions from local storage
function loadRoomVersions() {
    const versionsDropdown = document.getElementById('versions-dropdown');
    
    // Clear dropdown
    versionsDropdown.innerHTML = '<option value="">-- Saved Versions --</option>';
    
    // Get saved versions from local storage
    let savedVersions = JSON.parse(localStorage.getItem('roomVersions') || '{}');
    
    // Update roomVersions object
    roomVersions = savedVersions;
    
    // Add versions for current room to dropdown
    if (savedVersions[currentRoom]) {
        savedVersions[currentRoom].forEach(version => {
            const option = document.createElement('option');
            option.value = version.id;
            option.textContent = version.name;
            versionsDropdown.appendChild(option);
        });
    }
}

// Load a specific version
function loadVersion(versionId) {
    // Get saved versions from local storage
    let savedVersions = JSON.parse(localStorage.getItem('roomVersions') || '{}');
    
    // Find the version
    let version = null;
    if (savedVersions[currentRoom]) {
        version = savedVersions[currentRoom].find(v => v.id === versionId);
    }
    
    if (version) {
        // Clear current room
        clearRoom();
        
        // Load products from version
        version.products.forEach(product => {
            addProductToRoom(product, product.posX, product.posY, product.rotation);
        });
        
        // Show success message
        showToast('Room version loaded successfully!');
    } else {
        // Show error message
        showToast('Error: Could not load version', 'error');
    }
}

// Setup product placement listeners
function setupProductPlacementListeners() {
    const roomDisplay = document.getElementById('room-container');
    
    // Setup click listener for product placement
    roomDisplay.addEventListener('click', function(e) {
        // This will be handled by Three.js raycaster
    });
}

// Add a product to the room
function addProductToRoom(product, x = 0, y = 0, rotation = 0) {
    // Check if product already has a unique ID
    if (!product.uniqueId) {
        product.uniqueId = `product_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    
    // Add position and rotation if not specified
    product.posX = x;
    product.posY = y;
    product.rotation = rotation || 0;
    
    // Add product to roomProducts array
    roomProducts.push(product);
    
    // Add 3D model to scene
    add3DModelToScene(product);
    
    // Show toast notification
    showToast(`Added ${product.name} to room`);
    
    console.log('Product added to room:', product);
}

// Add 3D model to Three.js scene
function add3DModelToScene(product) {
    // Use placeholder geometry based on product type
    let geometry;
    let material;
    let scale = 1;
    
    switch (product.category) {
        case 'sofa':
        case 'couch':
            geometry = new THREE.BoxGeometry(2, 0.8, 1);
            material = new THREE.MeshStandardMaterial({ color: product.color || 0x8B4513 });
            scale = 1;
            break;
        case 'chair':
            geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            material = new THREE.MeshStandardMaterial({ color: product.color || 0x8B4513 });
            scale = 1;
            break;
        case 'table':
            geometry = new THREE.BoxGeometry(1.5, 0.05, 1);
            material = new THREE.MeshStandardMaterial({ color: product.color || 0x8B4513 });
            geometry.translate(0, 0.5, 0);
            scale = 1;
            break;
        case 'bed':
            geometry = new THREE.BoxGeometry(2, 0.5, 3);
            material = new THREE.MeshStandardMaterial({ color: product.color || 0xFFFFFF });
            scale = 1;
            break;
        case 'lamp':
            geometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 32);
            material = new THREE.MeshStandardMaterial({ color: product.color || 0xFFD700 });
            scale = 1;
            break;
        default:
            geometry = new THREE.BoxGeometry(1, 1, 1);
            material = new THREE.MeshStandardMaterial({ color: product.color || 0x8B4513 });
            scale = 1;
    }
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Set position and rotation
    const x = (product.posX / 100 * 16) - 8; // Convert from 0-100 range to -8 to 8
    const z = (product.posY / 100 * 16) - 8; // Convert from 0-100 range to -8 to 8
    mesh.position.set(x, product.category === 'lamp' ? 0.8 : 0.5, z);
    mesh.rotation.y = product.rotation || 0;
    mesh.scale.set(scale, scale, scale);
    
    // Store product ID in mesh userData
    mesh.userData.productId = product.uniqueId;
    
    // Add to scene
    scene.add(mesh);
}

// Remove a product from the room
function removeProductFromRoom(productId) {
    // Remove from roomProducts array
    const index = roomProducts.findIndex(p => p.uniqueId === productId);
    if (index !== -1) {
        roomProducts.splice(index, 1);
    }
    
    // Remove from scene
    const objectToRemove = scene.children.find(child => 
        child.userData && child.userData.productId === productId
    );
    
    if (objectToRemove) {
        scene.remove(objectToRemove);
    }
    
    console.log('Product removed from room:', productId);
}

// Clear all products from the room
function clearRoom() {
    // Clear roomProducts array
    roomProducts = [];
    
    // Remove all product objects from scene (preserve lights, room, etc)
    scene.children.forEach(child => {
        if (child.userData && child.userData.productId) {
            scene.remove(child);
        }
    });
    
    console.log('Room cleared');
}

// Update the products list display
function updateProductsList(products) {
    const productsList = document.getElementById('products-list');
    
    // Clear products list
    productsList.innerHTML = '';
    
    // Apply filters
    const filteredProducts = filterProducts(products);
    
    if (filteredProducts.length === 0) {
        productsList.innerHTML = '<div class="no-products">No products match your filters</div>';
        return;
    }
    
    // Add products to list
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // Calculate display price based on sale status
        let priceDisplay = `$${product.price.toFixed(2)}`;
        if (product.is_on_sale && product.sale_price) {
            priceDisplay = `
                <span class="sale-price">$${product.sale_price.toFixed(2)}</span>
                <span class="original-price">$${product.price.toFixed(2)}</span>
            `;
        }
        
        // Format dimensions if available
        let dimensionsDisplay = '';
        if (product.width && product.depth && product.height) {
            dimensionsDisplay = `<p class="product-dimensions">${product.width}" W × ${product.depth}" D × ${product.height}" H</p>`;
        }
        
        // Create store logo display
        let storeDisplay = '';
        if (product.store_logo) {
            storeDisplay = `
                <div class="store-info">
                    <img src="${product.store_logo}" alt="${product.store}" class="store-logo">
                    <span>${product.store}</span>
                </div>
            `;
        } else {
            storeDisplay = `<p class="product-store">${product.store}</p>`;
        }
        
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image_url || '/static/images/placeholder.png'}" alt="${product.name}">
                ${product.is_on_sale ? '<span class="sale-badge">SALE</span>' : ''}
            </div>
            <div class="product-info">
                <h4 class="product-name">${product.name}</h4>
                <div class="product-price-container">${priceDisplay}</div>
                ${dimensionsDisplay}
                ${storeDisplay}
            </div>
            <div class="product-actions">
                <button class="add-to-room-btn" data-product-id="${product.id}" title="Place in Room">
                    <i class="fas fa-cube"></i> Place
                </button>
                <button class="add-to-cart-btn" data-product-id="${product.id}" title="Add to Cart">
                    <i class="fas fa-shopping-cart"></i> Add to Cart
                </button>
                ${product.product_url ? `<a href="${product.product_url}" target="_blank" class="view-details-btn" title="View on Store Website"><i class="fas fa-external-link-alt"></i></a>` : ''}
            </div>
        `;
        
        productsList.appendChild(productCard);
        
        // Add event listeners
        const addToRoomBtn = productCard.querySelector('.add-to-room-btn');
        const addToCartBtn = productCard.querySelector('.add-to-cart-btn');
        
        addToRoomBtn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const product = products.find(p => p.id == productId);
            
            if (product) {
                // Adding at random position for simplicity
                const randomX = Math.floor(Math.random() * 60) + 20; // 20-80 range
                const randomY = Math.floor(Math.random() * 60) + 20; // 20-80 range
                addProductToRoom(product, randomX, randomY);
            }
        });
        
        addToCartBtn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const product = products.find(p => p.id == productId);
            
            if (product) {
                addProductToCart(product);
            }
        });
    });
}

// Apply filters to products
function filterProducts(products) {
    const categoryFilter = document.getElementById('category-filter').value;
    const storeFilter = document.getElementById('store-filter').value;
    const priceFilter = parseInt(document.getElementById('price-slider').value);
    const searchFilter = document.getElementById('search-products').value.toLowerCase();
    
    return products.filter(product => {
        // Category filter
        if (categoryFilter !== 'all' && product.category !== categoryFilter) {
            return false;
        }
        
        // Store filter
        if (storeFilter !== 'all' && product.store !== storeFilter) {
            return false;
        }
        
        // Price filter
        if (product.price > priceFilter) {
            return false;
        }
        
        // Search filter
        if (searchFilter && !product.name.toLowerCase().includes(searchFilter) && 
            !product.description.toLowerCase().includes(searchFilter)) {
            return false;
        }
        
        return true;
    });
}

// Setup cart management
function setupCartManagement() {
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    
    // Checkout button
    checkoutBtn.addEventListener('click', function() {
        if (cartItems.length === 0) {
            showToast('Your cart is empty', 'error');
            return;
        }
        
        // Group items by store
        const storeGroups = {};
        cartItems.forEach(item => {
            if (!storeGroups[item.store_id]) {
                storeGroups[item.store_id] = {
                    store: item.store,
                    website: item.store_website,
                    items: []
                };
            }
            storeGroups[item.store_id].items.push(item);
        });
        
        // Create modal for store selection
        const modal = document.createElement('div');
        modal.className = 'cart-checkout-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>Complete Your Purchase</h2>
                <p>Your items are from multiple stores. Select where to complete your purchase:</p>
                <div class="store-list"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const storeList = modal.querySelector('.store-list');
        
        // Add each store to the list
        Object.values(storeGroups).forEach(group => {
            const storeItem = document.createElement('div');
            storeItem.className = 'store-checkout-item';
            
            const totalPrice = group.items.reduce((sum, item) => sum + (item.is_on_sale && item.sale_price ? item.sale_price : item.price), 0);
            
            storeItem.innerHTML = `
                <div class="store-checkout-info">
                    <h3>${group.store}</h3>
                    <p>${group.items.length} item(s) · $${totalPrice.toFixed(2)}</p>
                </div>
                <button class="checkout-store-btn" data-store-website="${group.website}">
                    Go to Store
                </button>
            `;
            
            storeList.appendChild(storeItem);
            
            // Add event listener to checkout button
            const checkoutStoreBtn = storeItem.querySelector('.checkout-store-btn');
            checkoutStoreBtn.addEventListener('click', function() {
                const website = this.getAttribute('data-store-website');
                window.open(website, '_blank');
                showToast(`Redirecting to ${group.store}...`, 'success');
            });
        });
        
        // Close modal when clicking the X
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        // Close modal when clicking outside of it
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Log the action
        console.log('Checkout cart by store:', storeGroups);
    });
    
    // Clear cart button
    clearCartBtn.addEventListener('click', function() {
        cartItems = [];
        updateCartView();
        showToast('Cart cleared');
    });
    
    // Initialize price slider display
    const priceSlider = document.getElementById('price-slider');
    const priceDisplay = document.getElementById('price-display');
    
    priceSlider.addEventListener('input', function() {
        const value = this.value;
        priceDisplay.textContent = `$0 - $${value}`;
        
        // Debounce the filter update to avoid excessive re-rendering
        debounce(() => updateProductsList(allProducts), 300)();
    });
    
    // Reset filters button
    const resetFiltersBtn = document.getElementById('reset-filters');
    resetFiltersBtn.addEventListener('click', function() {
        document.getElementById('category-filter').value = 'all';
        document.getElementById('store-filter').value = 'all';
        document.getElementById('price-slider').value = 10000;
        document.getElementById('search-products').value = '';
        priceDisplay.textContent = '$0 - $10000';
        
        updateProductsList(allProducts);
    });
    
    // Search products input
    const searchInput = document.getElementById('search-products');
    searchInput.addEventListener('input', debounce(function() {
        updateProductsList(allProducts);
    }, 300));
    
    // Category and store filter dropdowns
    const categoryFilter = document.getElementById('category-filter');
    const storeFilter = document.getElementById('store-filter');
    
    categoryFilter.addEventListener('change', function() {
        updateProductsList(allProducts);
    });
    
    storeFilter.addEventListener('change', function() {
        updateProductsList(allProducts);
    });
}

// Update cart view
function updateCartView() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    
    // Update cart count
    cartCount.textContent = cartItems.length;
    
    // Clear cart items
    cartItemsContainer.innerHTML = '';
    
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        cartTotal.textContent = '$0.00';
        return;
    }
    
    // Calculate total
    let total = cartItems.reduce((sum, item) => sum + item.price, 0);
    
    // Update cart items
    cartItems.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                <p class="cart-item-store">${item.store}</p>
            </div>
            <button class="remove-from-cart" data-product-id="${item.uniqueId || item.id}">×</button>
        `;
        
        cartItemsContainer.appendChild(cartItem);
        
        // Add event listener for remove button
        const removeBtn = cartItem.querySelector('.remove-from-cart');
        removeBtn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            
            // Remove from cart
            const index = cartItems.findIndex(p => (p.uniqueId || p.id) == productId);
            if (index !== -1) {
                cartItems.splice(index, 1);
                updateCartView();
                showToast('Item removed from cart');
            }
        });
    });
    
    // Update total
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

// Add a product to the cart
function addProductToCart(product) {
    // Clone the product to avoid reference issues
    const productCopy = { ...product };
    
    // Add a unique ID if not already present
    if (!productCopy.uniqueId) {
        productCopy.uniqueId = `cart_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    
    // Add to cart
    cartItems.push(productCopy);
    
    // Update cart view
    updateCartView();
    
    // Show toast notification
    showToast(`Added ${product.name} to cart`);
    
    console.log('Product added to cart:', product);
}

// Show a toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(function() {
        toast.classList.add('fade-out');
        setTimeout(function() {
            toastContainer.removeChild(toast);
        }, 500);
    }, 3000);
}

// Load products from local storage or fallback to demo products
function loadProducts() {
    // Show loading state
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = '<div class="loading-products">Loading products...</div>';
    
    // Fetch store data first
    fetch('/api/stores')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch stores');
            }
            return response.json();
        })
        .then(storesData => {
            // Store the stores data globally
            window.storesList = storesData;
            
            // Fetch product data 
            return fetch('/api/products');
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            return response.json();
        })
        .then(categoriesData => {
            // Process the products data structure
            // Flatten the structure for our product list
            let flattenedProducts = [];
            
            categoriesData.forEach(category => {
                category.products.forEach(product => {
                    // Add the category name for easier filtering
                    flattenedProducts.push({
                        ...product,
                        category_name: category.name,
                        id: product.id,
                        name: product.name,
                        description: product.description,
                        price: parseFloat(product.price),
                        sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
                        is_on_sale: product.is_on_sale || false,
                        image_url: product.image_url,
                        width: product.width,
                        depth: product.depth,
                        height: product.height,
                        store_id: product.store_id,
                        store: product.store_name,
                        store_website: product.store_website,
                        store_logo: product.store_logo,
                        category: product.category_name,  // Use category_name from the parent
                        product_url: product.product_url || null
                    });
                });
            });
            
            // Save the products
            allProducts = flattenedProducts;
            
            // Save to localStorage to avoid frequent API calls
            localStorage.setItem('elevateProducts', JSON.stringify(allProducts));
            localStorage.setItem('elevateProductsTimestamp', Date.now());
            
            // Update the UI
            updateProductsList(allProducts);
            populateFilterOptions(allProducts);
        })
        .catch(error => {
            console.error('Error loading products:', error);
            // If API fails, check if we have cached data
            const storedProducts = localStorage.getItem('elevateProducts');
            
            if (storedProducts) {
                allProducts = JSON.parse(storedProducts);
                updateProductsList(allProducts);
                populateFilterOptions(allProducts);
                showToast('Using cached product data', 'warning');
            } else {
                // If no cached data, use demo data
                showToast('Failed to load products from server', 'error');
                useDemoProducts();
            }
        });
}

// Load demo products when API is not available
function useDemoProducts() {
    console.log('Using demo products');
    
    // Demo products data
    const demoProducts = [
        {
            id: 1,
            name: "Modern Leather Sofa",
            description: "A sleek, modern leather sofa in rich brown color.",
            price: 899.99,
            category: "sofa",
            store: "FurniturePlus",
            image_url: "/static/images/products/sofa1.jpg",
            color: 0x8B4513
        },
        {
            id: 2,
            name: "Mid-Century Armchair",
            description: "Stylish mid-century design armchair with wooden legs.",
            price: 349.99,
            category: "chair",
            store: "ModernHome",
            image_url: "/static/images/products/chair1.jpg",
            color: 0x2E8B57
        },
        {
            id: 3,
            name: "Glass Coffee Table",
            description: "Elegant glass coffee table with chrome accents.",
            price: 249.99,
            category: "table",
            store: "FurniturePlus",
            image_url: "/static/images/products/table1.jpg",
            color: 0xC0C0C0
        },
        {
            id: 4,
            name: "Queen Platform Bed",
            description: "Modern queen platform bed with headboard.",
            price: 599.99,
            category: "bed",
            store: "SleepWell",
            image_url: "/static/images/products/bed1.jpg",
            color: 0x696969
        },
        {
            id: 5,
            name: "Floor Lamp with Reading Light",
            description: "Adjustable floor lamp with additional reading light.",
            price: 129.99,
            category: "lamp",
            store: "LightItUp",
            image_url: "/static/images/products/lamp1.jpg",
            color: 0xFFD700
        },
        {
            id: 6,
            name: "Sectional Sofa with Chaise",
            description: "Large sectional sofa with right-facing chaise.",
            price: 1299.99,
            category: "sofa",
            store: "FurniturePlus",
            image_url: "/static/images/products/sofa2.jpg",
            color: 0x708090
        },
        {
            id: 7,
            name: "Dining Table Set",
            description: "Wooden dining table with 6 matching chairs.",
            price: 899.99,
            category: "table",
            store: "DiningDirect",
            image_url: "/static/images/products/dining1.jpg",
            color: 0x8B4513
        },
        {
            id: 8,
            name: "Bedside Table with Drawer",
            description: "Compact bedside table with storage drawer.",
            price: 79.99,
            category: "table",
            store: "SleepWell",
            image_url: "/static/images/products/bedside1.jpg",
            color: 0xA0522D
        }
    ];
    
    // Set to allProducts
    allProducts = demoProducts;
    
    // Update UI
    updateProductsList(demoProducts);
    populateFilterOptions(demoProducts);
    
    // Save to localStorage for future use
    localStorage.setItem('elevateProducts', JSON.stringify(demoProducts));
}

// Populate filter options based on available products
function populateFilterOptions(products) {
    const categoryFilter = document.getElementById('category-filter');
    const storeFilter = document.getElementById('store-filter');
    
    // Clear existing options (keep "All" option)
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    storeFilter.innerHTML = '<option value="all">All Stores</option>';
    
    // Extract unique categories and stores
    const categories = [...new Set(products.map(p => p.category))];
    const stores = [...new Set(products.map(p => p.store))];
    
    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1); // Capitalize
        categoryFilter.appendChild(option);
    });
    
    // Add store options
    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store;
        option.textContent = store;
        storeFilter.appendChild(option);
    });
}

// Check if AR is supported in the browser
function isArSupported() {
    return !!(navigator.xr && navigator.xr.isSessionSupported && window.isSecureContext);
}

// Initialize AR features if supported
function initializeAR() {
    console.log('AR support detected, initializing AR features');
    
    // Add AR button to UI
    const controlsContainer = document.querySelector('.room-controls');
    
    if (controlsContainer) {
        const arButton = document.createElement('button');
        arButton.className = 'room-control-btn';
        arButton.id = 'ar-view-btn';
        arButton.title = 'View in AR';
        arButton.innerHTML = '<i class="fas fa-vr-cardboard"></i> View in AR';
        
        controlsContainer.appendChild(arButton);
        
        // Add event listener
        arButton.addEventListener('click', function() {
            launchARView();
        });
    }
}

// Launch AR view
function launchARView() {
    // Show toast notification
    showToast('Preparing AR view...', 'info');
    
    // In a real implementation, this would launch the AR experience
    // For now, just show a toast message
    setTimeout(() => {
        showToast('AR view launched in new window!', 'success');
        
        // Open AR room in a new tab/window
        window.open('/ar-room', '_blank');
    }, 1500);
}

// Initialize UI components
function initializeUIComponents() {
    // Override default CSS to ensure the Three.js canvas fits properly
    const style = document.createElement('style');
    style.textContent = `
        #room-container {
            width: 100%;
            height: 400px;
            position: relative;
            overflow: hidden;
            border-radius: 8px;
            background-color: #f0f0f0;
        }
        
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
    `;
    document.head.appendChild(style);
}