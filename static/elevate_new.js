/**
 * GlassRain Elevate Tab Functionality
 * Provides interactive room customization with shopping cart functionality
 */

// Global state
let currentCart = [];
let currentRoom = null;
let currentRoomPlacements = [];
let roomVersions = {};
let activeFilters = {
    category: 'all',
    store: 'all',
    price: {
        min: 0,
        max: 10000
    },
    search: ''
};

/**
 * Initialize the Elevate tab
 */
function initElevateTab() {
    console.log('Initializing Elevate tab');
    
    // Set up UI elements
    initRoomSelector();
    initVersionControls();
    setupProductPlacementListeners();
    setupCartManagement();
    setupSaveAndLoadFunctions();
    
    // Load products
    loadProductsFromAPI();
    
    // Add event listeners for filters
    setupFilterListeners();
    
    // Setup auto-save
    setupAutoSave();
    
    // Show initial room state
    updateUIState();
}

/**
 * Initialize room selector
 */
function initRoomSelector() {
    const roomSelector = document.getElementById('room-selector');
    if (roomSelector) {
        roomSelector.addEventListener('change', function() {
            selectRoom(this.value);
        });
        
        // Get first room
        if (roomSelector.options.length > 0) {
            selectRoom(roomSelector.options[0].value);
        }
    }
}

/**
 * Initialize version controls
 */
function initVersionControls() {
    const saveBtn = document.getElementById('save-version-btn');
    const versionsDropdown = document.getElementById('versions-dropdown');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentRoomVersion);
    }
    
    if (versionsDropdown) {
        versionsDropdown.addEventListener('change', function() {
            if (this.value) {
                loadRoomVersion(this.value);
            }
        });
    }
}

/**
 * Set up product placement listeners
 */
function setupProductPlacementListeners() {
    const roomDisplay = document.getElementById('room-display');
    
    if (roomDisplay) {
        // Listen for double-clicks on the room for product placement
        roomDisplay.addEventListener('dblclick', function(e) {
            // Only if a product is selected
            const selectedProduct = document.querySelector('.product-item.selected');
            if (selectedProduct) {
                const productId = selectedProduct.dataset.productId;
                const product = window.sampleProducts.find(p => p.id == productId);
                
                if (product) {
                    // Calculate position as percentage
                    const rect = roomDisplay.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    
                    // Add product at this position
                    addProductToRoom(product, x, y);
                }
            }
        });
    }
}

/**
 * Add a product to the room
 */
function addProductToRoom(product, x = 50, y = 50) {
    if (!currentRoom) return;
    
    const roomDisplay = document.getElementById('room-display');
    
    // Create placement element
    const placement = document.createElement('div');
    placement.className = 'product-placement';
    placement.dataset.productId = product.id;
    placement.style.left = x + '%';
    placement.style.top = y + '%';
    
    // Add product image
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.name;
    placement.appendChild(img);
    
    // Add product info
    const info = document.createElement('div');
    info.className = 'placement-info';
    info.innerHTML = `
        <h4>${product.name}</h4>
        <p>${product.store} - $${product.price.toFixed(2)}</p>
        <button class="add-to-cart-btn">Add to Cart</button>
        <button class="remove-placement-btn">Remove</button>
        <button class="move-placement-btn">Move</button>
    `;
    placement.appendChild(info);
    
    // Add to room
    roomDisplay.appendChild(placement);
    
    // Make it draggable
    makeDraggable(placement);
    
    // Add to placements array
    currentRoomPlacements.push({
        id: product.id,
        name: product.name,
        left: x,
        top: y,
        image: product.image,
        price: product.price,
        store: product.store
    });
    
    // Add event listeners
    const addBtn = placement.querySelector('.add-to-cart-btn');
    const removeBtn = placement.querySelector('.remove-placement-btn');
    
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addProductToCart(product);
            showToast(product.name + ' added to cart');
        });
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            removeProductFromRoom(product.id);
        });
    }
}

/**
 * Remove a product from the room
 */
function removeProductFromRoom(productId) {
    const roomDisplay = document.getElementById('room-display');
    const placement = roomDisplay.querySelector(`.product-placement[data-product-id="${productId}"]`);
    
    if (placement) {
        roomDisplay.removeChild(placement);
        
        // Remove from placements array
        currentRoomPlacements = currentRoomPlacements.filter(p => p.id != productId);
    }
}

/**
 * Update products list in the catalog
 */
function updateProductsList(products) {
    const productsList = document.getElementById('products-list');
    
    if (productsList) {
        productsList.innerHTML = '';
        
        if (products.length === 0) {
            productsList.innerHTML = '<div class="no-products">No products found matching your criteria.</div>';
            return;
        }
        
        // Filter products based on active filters
        const filteredProducts = products.filter(product => {
            // Category filter
            if (activeFilters.category !== 'all' && product.category !== activeFilters.category) {
                return false;
            }
            
            // Store filter
            if (activeFilters.store !== 'all' && product.store !== activeFilters.store) {
                return false;
            }
            
            // Price filter
            if (product.price < activeFilters.price.min || product.price > activeFilters.price.max) {
                return false;
            }
            
            // Search filter
            if (activeFilters.search && !product.name.toLowerCase().includes(activeFilters.search.toLowerCase()) && 
                !product.description.toLowerCase().includes(activeFilters.search.toLowerCase())) {
                return false;
            }
            
            return true;
        });
        
        if (filteredProducts.length === 0) {
            productsList.innerHTML = '<div class="no-products">No products found matching your criteria. Try adjusting your filters.</div>';
            return;
        }
        
        // Add products to list
        filteredProducts.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.dataset.productId = product.id;
            
            // Apply a special class if the product is on sale
            if (product.on_sale) {
                productItem.classList.add('on-sale');
            }
            
            // Build the product card HTML
            const salePrice = product.sale_price ? `<span class="sale-price">$${product.sale_price.toFixed(2)}</span>` : '';
            const originalPrice = product.on_sale ? `<span class="original-price">$${product.price.toFixed(2)}</span>` : `<span class="price">$${product.price.toFixed(2)}</span>`;
            
            productItem.innerHTML = `
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}">
                    ${product.on_sale ? '<div class="sale-badge">SALE</div>' : ''}
                </div>
                <div class="product-details">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-store">${product.store}</p>
                    <p class="product-price">
                        ${salePrice}
                        ${originalPrice}
                    </p>
                    <div class="product-actions">
                        <button class="add-to-room-btn">Place in Room</button>
                        <button class="add-to-cart-btn">Add to Cart</button>
                    </div>
                </div>
            `;
            
            productsList.appendChild(productItem);
            
            // Add event listeners
            const addToRoomBtn = productItem.querySelector('.add-to-room-btn');
            const addToCartBtn = productItem.querySelector('.add-to-cart-btn');
            
            if (addToRoomBtn) {
                addToRoomBtn.addEventListener('click', function() {
                    // Clear previously selected product
                    document.querySelectorAll('.product-item.selected').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    // Select this product
                    productItem.classList.add('selected');
                    
                    // Show placement instructions
                    showToast('Double-click in the room to place this item');
                });
            }
            
            if (addToCartBtn) {
                addToCartBtn.addEventListener('click', function() {
                    addProductToCart(product);
                    showToast(product.name + ' added to cart');
                });
            }
        });
    }
}

/**
 * Set up cart management
 */
function setupCartManagement() {
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            if (currentCart.length === 0) {
                showToast('Your cart is empty');
                return;
            }
            
            // Group items by store
            const storeGroups = groupCartItemsByStore();
            showStoreSelection(storeGroups);
        });
    }
    
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }
}

/**
 * Update cart view
 */
function updateCartView() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');
    
    if (cartItems) {
        cartItems.innerHTML = '';
        
        if (currentCart.length === 0) {
            cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        } else {
            currentCart.forEach((item, index) => {
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                
                cartItem.innerHTML = `
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p>${item.store} - $${item.price.toFixed(2)}</p>
                    </div>
                    <button class="remove-cart-item-btn" data-index="${index}">×</button>
                `;
                
                cartItems.appendChild(cartItem);
                
                // Add event listener to remove button
                const removeBtn = cartItem.querySelector('.remove-cart-item-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', function() {
                        removeProductFromCart(parseInt(this.dataset.index));
                    });
                }
            });
        }
    }
    
    // Update total
    const total = currentCart.reduce((sum, item) => sum + item.price, 0);
    if (cartTotal) {
        cartTotal.textContent = '$' + total.toFixed(2);
    }
    
    // Update count
    if (cartCount) {
        cartCount.textContent = currentCart.length;
    }
}

/**
 * Add product to cart
 */
function addProductToCart(product) {
    currentCart.push({
        id: product.id,
        name: product.name,
        price: product.on_sale ? (product.sale_price || product.price) : product.price,
        image: product.image,
        store: product.store
    });
    
    updateCartView();
}

/**
 * Remove product from cart
 */
function removeProductFromCart(index) {
    if (index >= 0 && index < currentCart.length) {
        currentCart.splice(index, 1);
        updateCartView();
    }
}

/**
 * Group cart items by store
 */
function groupCartItemsByStore() {
    const storeGroups = {};
    
    currentCart.forEach(item => {
        if (!storeGroups[item.store]) {
            storeGroups[item.store] = [];
        }
        
        storeGroups[item.store].push(item);
    });
    
    return storeGroups;
}

/**
 * Show store selection dialog for checkout
 */
function showStoreSelection(storeGroups) {
    const modal = document.createElement('div');
    modal.className = 'modal store-selection-modal';
    
    // Calculate store totals
    const storeTotals = {};
    Object.keys(storeGroups).forEach(store => {
        storeTotals[store] = storeGroups[store].reduce((sum, item) => sum + item.price, 0);
    });
    
    // Build modal content
    let modalContent = `
        <div class="modal-content">
            <h2>Choose a Store to Checkout</h2>
            <p>Your cart contains items from multiple stores. Choose one to complete your purchase:</p>
            <div class="store-list">
    `;
    
    Object.keys(storeGroups).forEach(store => {
        modalContent += `
            <div class="store-option">
                <h3>${store}</h3>
                <p>${storeGroups[store].length} items - $${storeTotals[store].toFixed(2)}</p>
                <button class="checkout-store-btn" data-store="${store}">Checkout at ${store}</button>
            </div>
        `;
    });
    
    modalContent += `
            </div>
            <button class="close-modal-btn">Cancel</button>
        </div>
    `;
    
    modal.innerHTML = modalContent;
    
    // Add to document
    document.body.appendChild(modal);
    
    // Add event listeners
    const checkoutBtns = modal.querySelectorAll('.checkout-store-btn');
    const closeBtn = modal.querySelector('.close-modal-btn');
    
    checkoutBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const store = this.dataset.store;
            checkoutStore(store);
            document.body.removeChild(modal);
        });
    });
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
    }
}

/**
 * Checkout with a specific store
 */
function checkoutStore(store) {
    // Get items for this store
    const storeItems = currentCart.filter(item => item.store === store);
    
    if (storeItems.length === 0) {
        showToast('No items found for ' + store);
        return;
    }
    
    // In a real app, this would make an API call to generate a checkout link
    fetch('/api/cart-checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            store: store,
            items: storeItems.map(item => ({ id: item.id, quantity: 1 }))
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to create checkout');
        }
        return response.json();
    })
    .then(data => {
        // Open checkout URL in new tab
        if (data.checkout_url) {
            window.open(data.checkout_url, '_blank');
            
            // Remove these items from cart
            storeItems.forEach(item => {
                const index = currentCart.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    currentCart.splice(index, 1);
                }
            });
            
            updateCartView();
            showToast('Checkout started for ' + store);
        } else {
            showToast('No checkout URL returned');
        }
    })
    .catch(error => {
        console.error('Checkout error:', error);
        showToast('Error creating checkout: ' + error.message);
    });
}

/**
 * Save current room version
 */
function saveCurrentRoomVersion() {
    if (!currentRoom) return;
    
    const versionName = prompt('Enter a name for this room version:', 'Version ' + new Date().toLocaleDateString());
    
    if (!versionName) return;
    
    // Create version data
    const versionData = {
        id: Date.now().toString(),
        name: versionName,
        room_id: currentRoom,
        date: new Date().toISOString(),
        placements: currentRoomPlacements,
        cart: currentCart
    };
    
    // Save to server
    fetch('/api/save-room-version', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(versionData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save room version');
        }
        return response.json();
    })
    .then(data => {
        // Update local storage
        if (!roomVersions[currentRoom]) {
            roomVersions[currentRoom] = [];
        }
        
        roomVersions[currentRoom].push(versionData);
        updateVersionsDropdown(roomVersions[currentRoom]);
        
        showToast('Room version saved: ' + versionName);
    })
    .catch(error => {
        console.error('Save error:', error);
        showToast('Error saving room version: ' + error.message);
        
        // Still update local version for demo purposes
        if (!roomVersions[currentRoom]) {
            roomVersions[currentRoom] = [];
        }
        
        roomVersions[currentRoom].push(versionData);
        updateVersionsDropdown(roomVersions[currentRoom]);
    });
}

/**
 * Load room versions for a room
 */
function loadRoomVersions(roomId) {
    // Fetch versions from server
    fetch(`/api/get-room-versions?room_id=${roomId}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load room versions');
        }
        return response.json();
    })
    .then(data => {
        if (data && Array.isArray(data)) {
            roomVersions[roomId] = data;
            updateVersionsDropdown(data);
        }
    })
    .catch(error => {
        console.error('Load versions error:', error);
        // If versions aren't available from server, check if we have local versions
        updateVersionsDropdown(roomVersions[roomId] || []);
    });
}

/**
 * Update versions dropdown
 */
function updateVersionsDropdown(versions) {
    const versionsDropdown = document.getElementById('versions-dropdown');
    
    if (versionsDropdown) {
        // Clear current options
        while (versionsDropdown.options.length > 1) {
            versionsDropdown.remove(1);
        }
        
        // Add versions
        if (versions && versions.length > 0) {
            versions.forEach(version => {
                const option = document.createElement('option');
                option.value = version.id;
                option.textContent = version.name + ' (' + formatDate(version.date) + ')';
                versionsDropdown.appendChild(option);
            });
            
            versionsDropdown.disabled = false;
        } else {
            versionsDropdown.disabled = true;
        }
    }
}

/**
 * Load a specific room version
 */
function loadRoomVersion(versionId) {
    // Find version in local cache
    let version = null;
    
    Object.values(roomVersions).forEach(roomVersionList => {
        const found = roomVersionList.find(v => v.id === versionId);
        if (found) {
            version = found;
        }
    });
    
    if (!version) {
        // Try to fetch from server
        fetch(`/api/get-room-version?version_id=${versionId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load room version');
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                applyRoomVersion(data);
            }
        })
        .catch(error => {
            console.error('Load version error:', error);
            showToast('Error loading room version: ' + error.message);
        });
    } else {
        applyRoomVersion(version);
    }
}

/**
 * Apply a room version to the current display
 */
function applyRoomVersion(version) {
    if (version.room_id !== currentRoom) {
        // Change room if needed
        selectRoom(version.room_id);
    }
    
    // Clear current placements and cart
    clearRoomPlacements();
    clearCart();
    
    // Load placements
    if (version.placements && Array.isArray(version.placements)) {
        version.placements.forEach(placement => {
            const product = {
                id: placement.id,
                name: placement.name,
                price: placement.price,
                image: placement.image,
                store: placement.store
            };
            
            addProductToRoom(product, placement.left, placement.top);
        });
    }
    
    // Load cart
    if (version.cart && Array.isArray(version.cart)) {
        version.cart.forEach(item => {
            currentCart.push(item);
        });
        
        updateCartView();
    }
    
    showToast('Loaded room version: ' + version.name);
}

/**
 * Setup save and load functions
 */
function setupSaveAndLoadFunctions() {
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentRoomVersion);
    }
    
    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            const versionsDropdown = document.getElementById('versions-dropdown');
            if (versionsDropdown && versionsDropdown.value) {
                loadRoomVersion(versionsDropdown.value);
            } else {
                showToast('No version selected');
            }
        });
    }
}

/**
 * Setup auto-save
 */
function setupAutoSave() {
    // Auto-save every 3 minutes
    setInterval(function() {
        if (currentRoom && currentRoomPlacements.length > 0) {
            // Auto-save with timestamp
            const versionData = {
                id: 'auto-' + Date.now().toString(),
                name: 'Auto-save ' + new Date().toLocaleTimeString(),
                room_id: currentRoom,
                date: new Date().toISOString(),
                placements: currentRoomPlacements,
                cart: currentCart
            };
            
            // Save only in local storage for auto-saves
            if (!roomVersions[currentRoom]) {
                roomVersions[currentRoom] = [];
            }
            
            // Add auto-save version
            roomVersions[currentRoom].push(versionData);
            
            // Update dropdown
            updateVersionsDropdown(roomVersions[currentRoom]);
            
            console.log('Auto-saved room version');
        }
    }, 3 * 60 * 1000); // 3 minutes
}

/**
 * Clear room placements
 */
function clearRoomPlacements() {
    const roomDisplay = document.getElementById('room-display');
    
    if (roomDisplay) {
        // Remove all placements
        const placements = roomDisplay.querySelectorAll('.product-placement');
        placements.forEach(placement => {
            roomDisplay.removeChild(placement);
        });
        
        // Clear array
        currentRoomPlacements = [];
    }
}

/**
 * Clear the cart
 */
function clearCart() {
    currentCart = [];
    updateCartView();
}

/**
 * Show empty state
 */
function showEmptyState() {
    const roomDisplay = document.getElementById('room-display');
    
    if (roomDisplay) {
        roomDisplay.innerHTML = `
            <div class="empty-state">
                <h3>No Room Selected</h3>
                <p>Please select a room to start customizing</p>
            </div>
        `;
    }
}

/**
 * Get current room ID
 */
function getCurrentRoomId() {
    return currentRoom;
}

/**
 * Select a room
 */
function selectRoom(roomId) {
    if (!roomId) return;
    
    currentRoom = roomId;
    
    // Update room selector
    const roomSelector = document.getElementById('room-selector');
    if (roomSelector) {
        roomSelector.value = roomId;
    }
    
    // Clear current placements
    clearRoomPlacements();
    
    // Load room image
    const roomDisplay = document.getElementById('room-display');
    if (roomDisplay) {
        // Set room background image
        roomDisplay.style.backgroundImage = `url('/static/images/rooms/${roomId}.jpg')`;
        
        // Clear any empty state
        roomDisplay.innerHTML = '';
    }
    
    // Load room versions
    loadRoomVersions(roomId);
}

/**
 * Setup filter listeners
 */
function setupFilterListeners() {
    const categoryFilter = document.getElementById('category-filter');
    const storeFilter = document.getElementById('store-filter');
    const priceSlider = document.getElementById('price-slider');
    const searchInput = document.getElementById('search-products');
    const resetFiltersBtn = document.getElementById('reset-filters');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            activeFilters.category = this.value;
            filterProducts();
        });
    }
    
    if (storeFilter) {
        storeFilter.addEventListener('change', function() {
            activeFilters.store = this.value;
            filterProducts();
        });
    }
    
    if (priceSlider) {
        priceSlider.addEventListener('input', function() {
            const priceDisplay = document.getElementById('price-display');
            if (priceDisplay) {
                priceDisplay.textContent = '$0 - $' + this.value;
            }
            
            activeFilters.price.max = parseInt(this.value);
            filterProducts();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            activeFilters.search = this.value;
            filterProducts();
        }, 300));
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
}

/**
 * Filter products
 */
function filterProducts() {
    if (window.sampleProducts) {
        updateProductsList(window.sampleProducts);
    }
}

/**
 * Reset filters
 */
function resetFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const storeFilter = document.getElementById('store-filter');
    const priceSlider = document.getElementById('price-slider');
    const searchInput = document.getElementById('search-products');
    
    if (categoryFilter) categoryFilter.value = 'all';
    if (storeFilter) storeFilter.value = 'all';
    if (priceSlider) {
        priceSlider.value = 10000;
        const priceDisplay = document.getElementById('price-display');
        if (priceDisplay) {
            priceDisplay.textContent = '$0 - $10000';
        }
    }
    if (searchInput) searchInput.value = '';
    
    activeFilters = {
        category: 'all',
        store: 'all',
        price: {
            min: 0,
            max: 10000
        },
        search: ''
    };
    
    filterProducts();
}

/**
 * Load products from API
 */
function loadProductsFromAPI() {
    // Fetch products from the API
    fetch('/api/store-products')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load products from API');
            }
            return response.json();
        })
        .then(products => {
            console.log('Loaded products from API:', products);
            
            if (!products || products.length === 0) {
                throw new Error('No products returned from API');
            }
            
            window.sampleProducts = products.map(product => ({
                id: product.id,
                name: product.name,
                description: product.description || '',
                price: product.price,
                sale_price: product.sale_price,
                category: product.category ? product.category.toLowerCase() : 'other',
                store: product.store,
                image: product.image_url || '/static/furniture/sofa.svg',
                on_sale: product.is_on_sale,
                coupon_code: product.coupon_code,
                dimensions: {
                    width: product.width || 0,
                    depth: product.depth || 0,
                    height: product.height || 0
                }
            }));
            
            // Update catalog after loading products
            updateCatalogFilters();
            updateProductsList(window.sampleProducts);
        })
        .catch(error => {
            console.error('Error loading products:', error);
            // Create a fallback product for error state
            window.sampleProducts = [{
                id: 'error-1',
                name: 'Product Data Unavailable',
                description: 'Unable to load products from the database. Please try refreshing the page.',
                price: 0,
                category: 'error',
                store: 'Error',
                image: '/static/images/product-placeholder.jpg'
            }];
            
            // Update catalog with error state
            updateProductsList(window.sampleProducts);
        });
}

/**
 * Update catalog filters based on loaded products
 */
function updateCatalogFilters() {
    if (!window.sampleProducts || window.sampleProducts.length === 0) return;
    
    // Get unique categories
    const categories = [...new Set(window.sampleProducts.map(product => product.category))];
    
    // Update filter dropdowns
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        // Clear existing options except for the first one (All)
        while (categoryFilter.options.length > 1) {
            categoryFilter.remove(1);
        }
        
        // Add categories from the API data
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categoryFilter.appendChild(option);
        });
    }
    
    // Update store filter
    const stores = [...new Set(window.sampleProducts.map(product => product.store))];
    const storeFilter = document.getElementById('store-filter');
    if (storeFilter) {
        // Clear existing options except for the first one (All)
        while (storeFilter.options.length > 1) {
            storeFilter.remove(1);
        }
        
        // Add stores from the API data
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store;
            option.textContent = store;
            storeFilter.appendChild(option);
        });
    }
}

/**
 * Update the UI state based on current data
 */
function updateUIState() {
    // Update room selection
    const roomSelector = document.getElementById('room-selector');
    if (roomSelector && currentRoom) {
        roomSelector.value = currentRoom;
    }
    
    // Update versions dropdown
    if (currentRoom && roomVersions[currentRoom]) {
        updateVersionsDropdown(roomVersions[currentRoom]);
    }
    
    // Update cart view
    updateCartView();
    
    // Update products list
    if (window.sampleProducts) {
        updateProductsList(window.sampleProducts);
    }
}

/**
 * Show toast message
 */
function showToast(message, duration = 3000) {
    let toast = document.getElementById('toast-message');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-message';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = 'show';
    
    setTimeout(function() {
        toast.className = '';
    }, duration);
}

/**
 * Make an element draggable
 */
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let active = false;
    
    // Add the move handle
    const moveBtn = element.querySelector('.move-placement-btn');
    
    if (moveBtn) {
        moveBtn.onmousedown = dragMouseDown;
        moveBtn.ontouchstart = dragTouchStart;
    } else {
        // If there's no move button, make the whole element draggable
        element.onmousedown = dragMouseDown;
        element.ontouchstart = dragTouchStart;
    }
    
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        
        // Get mouse position at start
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // Add active class
        element.classList.add('dragging');
        active = true;
        
        // Set up the drag events
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function dragTouchStart(e) {
        e = e || window.event;
        if (e.touches && e.touches[0]) {
            e.preventDefault();
            
            // Get touch position at start
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
            
            // Add active class
            element.classList.add('dragging');
            active = true;
            
            // Set up the drag events
            document.ontouchend = closeDragElement;
            document.ontouchcancel = closeDragElement;
            document.ontouchmove = elementDragTouch;
        }
    }
    
    function elementDrag(e) {
        if (!active) return;
        
        e = e || window.event;
        e.preventDefault();
        
        // Calculate new positions
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // Move the element
        const parent = element.parentElement;
        const parentRect = parent.getBoundingClientRect();
        
        // Get current position as percentages
        let leftPercent = parseFloat(element.style.left) || 0;
        let topPercent = parseFloat(element.style.top) || 0;
        
        // Convert to pixels for calculation
        let leftPixels = (leftPercent / 100) * parentRect.width;
        let topPixels = (topPercent / 100) * parentRect.height;
        
        // Apply the movement
        leftPixels = leftPixels - pos1;
        topPixels = topPixels - pos2;
        
        // Convert back to percentages and apply constraints
        leftPercent = (leftPixels / parentRect.width) * 100;
        topPercent = (topPixels / parentRect.height) * 100;
        
        // Constrain to parent boundaries (with some padding)
        leftPercent = Math.max(0, Math.min(leftPercent, 100));
        topPercent = Math.max(0, Math.min(topPercent, 100));
        
        // Apply the new position
        element.style.left = leftPercent + "%";
        element.style.top = topPercent + "%";
        
        // Update placement in the currentRoomPlacements array
        const productId = element.dataset.productId;
        const placement = currentRoomPlacements.find(p => p.id == productId);
        if (placement) {
            placement.left = leftPercent;
            placement.top = topPercent;
        }
    }
    
    function elementDragTouch(e) {
        if (!active || !e.touches || !e.touches[0]) return;
        
        // Calculate new positions
        pos1 = pos3 - e.touches[0].clientX;
        pos2 = pos4 - e.touches[0].clientY;
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;
        
        // Move the element (same logic as elementDrag)
        const parent = element.parentElement;
        const parentRect = parent.getBoundingClientRect();
        
        let leftPercent = parseFloat(element.style.left) || 0;
        let topPercent = parseFloat(element.style.top) || 0;
        
        let leftPixels = (leftPercent / 100) * parentRect.width;
        let topPixels = (topPercent / 100) * parentRect.height;
        
        leftPixels = leftPixels - pos1;
        topPixels = topPixels - pos2;
        
        leftPercent = (leftPixels / parentRect.width) * 100;
        topPercent = (topPixels / parentRect.height) * 100;
        
        leftPercent = Math.max(0, Math.min(leftPercent, 100));
        topPercent = Math.max(0, Math.min(topPercent, 100));
        
        element.style.left = leftPercent + "%";
        element.style.top = topPercent + "%";
        
        // Update placement in the currentRoomPlacements array
        const productId = element.dataset.productId;
        const placement = currentRoomPlacements.find(p => p.id == productId);
        if (placement) {
            placement.left = leftPercent;
            placement.top = topPercent;
        }
    }
    
    function closeDragElement() {
        // Stop tracking mouse/touch movement
        active = false;
        element.classList.remove('dragging');
        
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchcancel = null;
        document.ontouchmove = null;
    }
}

/**
 * Format a date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date)) return 'N/A';
    
    return date.toLocaleDateString();
}

/**
 * Debounce function to limit how often a function can be called
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the Elevate tab
    initElevateTab();
});

// Export functions for use in other scripts
window.addProductToRoom = addProductToRoom;
window.removeProductFromRoom = removeProductFromRoom;
window.addProductToCart = addProductToCart;
window.removeProductFromCart = removeProductFromCart;
window.clearCart = clearCart;
window.saveCurrentRoomVersion = saveCurrentRoomVersion;
window.loadRoomVersion = loadRoomVersion;
window.initElevateTab = initElevateTab;