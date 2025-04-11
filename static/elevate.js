/**
 * GlassRain Elevate Tab Functionality
 * Provides interactive room customization with shopping cart functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the elevate tab
    if (document.getElementById('elevate-tab')) {
        initElevateTab();
    }
});

/**
 * Initialize the Elevate tab
 */
function initElevateTab() {
    console.log('Initializing Elevate Tab');
    
    // Set up core functionality
    initRoomSelector();
    initVersionControls();
    setupProductPlacementListeners();
    setupCartManagement();
    setupSaveAndLoadFunctions();
    
    // Load sample product data
    loadSampleProducts();
    
    // Check if we have a room selected, otherwise show empty state
    if (!getCurrentRoomId()) {
        showEmptyState();
    }
}

/**
 * Initialize room selector
 */
function initRoomSelector() {
    const roomSelector = document.getElementById('room-selector');
    if (!roomSelector) return;
    
    // Fetch user's rooms from the API
    fetch('/api/user/1/homes')
        .then(response => response.json())
        .then(homes => {
            // Flatten the home/room data for display
            let rooms = [];
            homes.forEach(home => {
                if (home.rooms && home.rooms.length > 0) {
                    home.rooms.forEach(room => {
                        rooms.push({
                            id: room.id,
                            name: room.name,
                            homeName: home.address,
                            lastScan: room.last_scan,
                            thumbnail: room.thumbnail || '/static/images/room-placeholder.jpg'
                        });
                    });
                }
            });
            
            if (rooms.length === 0) {
                // No rooms found, show empty state
                roomSelector.innerHTML = `
                    <div class="empty-rooms">
                        <p>You haven't scanned any rooms yet.</p>
                        <a href="/ar-room" class="scan-room-btn">Scan a Room</a>
                    </div>
                `;
                showEmptyState();
            } else {
                // Populate room selector
                roomSelector.innerHTML = `
                    <h3>Your Rooms</h3>
                    <div class="room-cards">
                        ${rooms.map(room => `
                            <div class="room-card" data-room-id="${room.id}">
                                <div class="room-thumbnail" style="background-image: url('${room.thumbnail}')"></div>
                                <div class="room-info">
                                    <h4>${room.name}</h4>
                                    <p>${room.homeName}</p>
                                    <span class="room-scan-date">Last scan: ${formatDate(room.lastScan)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                // Add click handlers for room cards
                document.querySelectorAll('.room-card').forEach(card => {
                    card.addEventListener('click', function() {
                        const roomId = this.getAttribute('data-room-id');
                        selectRoom(roomId);
                        
                        // Update active state
                        document.querySelectorAll('.room-card').forEach(c => c.classList.remove('active'));
                        this.classList.add('active');
                    });
                });
                
                // Select the first room by default
                if (rooms.length > 0) {
                    selectRoom(rooms[0].id);
                    document.querySelector('.room-card').classList.add('active');
                }
            }
        })
        .catch(error => {
            console.error('Error loading rooms:', error);
            roomSelector.innerHTML = `
                <div class="error-message">
                    <p>There was a problem loading your rooms. Please try again.</p>
                    <button onclick="initRoomSelector()">Retry</button>
                </div>
            `;
            showEmptyState();
        });
}

/**
 * Initialize version controls
 */
function initVersionControls() {
    const versionControls = document.getElementById('version-controls');
    if (!versionControls) return;
    
    versionControls.innerHTML = `
        <div class="version-selector-container">
            <label for="version-selector">Room Version:</label>
            <select id="version-selector" disabled>
                <option value="current">Current Version</option>
            </select>
        </div>
        <div class="version-actions">
            <button id="save-version-btn" disabled>Save Version</button>
            <button id="new-version-btn" disabled>New Version</button>
        </div>
    `;
    
    // Add event listeners
    document.getElementById('save-version-btn').addEventListener('click', function() {
        saveCurrentRoomVersion();
    });
    
    document.getElementById('new-version-btn').addEventListener('click', function() {
        // Clear current placements and start fresh
        clearRoomPlacements();
        
        // Show a toast notification
        showToast('New version created. Place products to begin.');
    });
    
    document.getElementById('version-selector').addEventListener('change', function() {
        const versionId = this.value;
        if (versionId !== 'current') {
            loadRoomVersion(versionId);
        }
    });
}

/**
 * Set up product placement listeners
 */
function setupProductPlacementListeners() {
    const productCatalog = document.getElementById('product-catalog');
    if (!productCatalog) return;
    
    // Placeholder for the product catalog UI
    productCatalog.innerHTML = `
        <div class="catalog-controls">
            <h3>Products</h3>
            <div class="catalog-filters">
                <select id="store-filter">
                    <option value="all">All Stores</option>
                    <option value="wayfair">Wayfair</option>
                    <option value="ikea">IKEA</option>
                    <option value="west-elm">West Elm</option>
                    <option value="home-depot">Home Depot</option>
                    <option value="lowes">Lowe's</option>
                </select>
                <select id="category-filter">
                    <option value="all">All Categories</option>
                    <option value="furniture">Furniture</option>
                    <option value="lighting">Lighting</option>
                    <option value="rugs">Rugs</option>
                    <option value="decor">Decor</option>
                    <option value="appliances">Appliances</option>
                </select>
                <input type="text" id="search-products" placeholder="Search products...">
            </div>
        </div>
        <div class="catalog-loading">
            <div class="spinner"></div>
            <p>Loading products...</p>
        </div>
    `;
    
    // Set up filter listeners
    document.getElementById('store-filter').addEventListener('change', filterProducts);
    document.getElementById('category-filter').addEventListener('change', filterProducts);
    document.getElementById('search-products').addEventListener('input', debounce(filterProducts, 300));
}

/**
 * Add a product to the room
 */
function addProductToRoom(product) {
    const roomId = getCurrentRoomId();
    if (!roomId) return;
    
    const roomView = document.getElementById('room-view');
    if (!roomView) return;
    
    // Create a virtual product placement
    const placement = document.createElement('div');
    placement.className = 'product-placement';
    placement.setAttribute('data-product-id', product.id);
    placement.setAttribute('data-store', product.store);
    placement.style.backgroundImage = `url('${product.image}')`;
    
    // Generate random position within the room view
    const left = 10 + Math.random() * 80; // Between 10% and 90%
    const top = 10 + Math.random() * 80;  // Between 10% and 90%
    
    placement.style.left = `${left}%`;
    placement.style.top = `${top}%`;
    
    // Add controls
    placement.innerHTML = `
        <div class="placement-controls">
            <button class="move-placement-btn">Move</button>
            <button class="remove-placement-btn">✕</button>
        </div>
        <div class="placement-info">
            <p>${product.name}</p>
            <p class="placement-price">$${product.price.toFixed(2)}</p>
        </div>
    `;
    
    roomView.appendChild(placement);
    
    // Make placement draggable
    makeDraggable(placement);
    
    // Add event listener for remove button
    placement.querySelector('.remove-placement-btn').addEventListener('click', function() {
        removeProductFromRoom(product.id);
    });
    
    // Add to cart automatically
    addProductToCart(product);
    
    return placement;
}

/**
 * Remove a product from the room
 */
function removeProductFromRoom(productId) {
    const placement = document.querySelector(`.product-placement[data-product-id="${productId}"]`);
    if (placement) {
        placement.parentNode.removeChild(placement);
        
        // Also remove from cart
        removeProductFromCart(productId);
    }
}

/**
 * Update products list in the catalog
 */
function updateProductsList(products) {
    const productCatalog = document.getElementById('product-catalog');
    if (!productCatalog) return;
    
    // Remove loading indicator if present
    const loadingElement = productCatalog.querySelector('.catalog-loading');
    if (loadingElement) {
        productCatalog.removeChild(loadingElement);
    }
    
    // Create or get the products container
    let productsContainer = productCatalog.querySelector('.catalog-products');
    if (!productsContainer) {
        productsContainer = document.createElement('div');
        productsContainer.className = 'catalog-products';
        productCatalog.appendChild(productsContainer);
    }
    
    // Update products list
    if (products.length === 0) {
        productsContainer.innerHTML = `
            <div class="no-products">
                <p>No products found matching your criteria.</p>
                <button onclick="resetFilters()">Reset Filters</button>
            </div>
        `;
    } else {
        productsContainer.innerHTML = products.map(product => `
            <div class="catalog-product" data-product-id="${product.id}" data-store="${product.store}">
                <div class="product-image" style="background-image: url('${product.image}')"></div>
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p class="product-store">${product.store}</p>
                    <p class="product-price">$${product.price.toFixed(2)}</p>
                </div>
                <button class="add-to-room-btn">Add to Room</button>
            </div>
        `).join('');
        
        // Add click handlers for product cards
        document.querySelectorAll('.add-to-room-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const productCard = e.target.closest('.catalog-product');
                const productId = productCard.getAttribute('data-product-id');
                const product = products.find(p => p.id == productId);
                
                if (product) {
                    addProductToRoom(product);
                    showToast(`Added ${product.name} to your room`);
                }
            });
        });
    }
}

/**
 * Set up cart management
 */
function setupCartManagement() {
    const cartContainer = document.getElementById('cart-container');
    if (!cartContainer) return;
    
    cartContainer.innerHTML = `
        <div class="cart-header">
            <h3>Shopping Cart</h3>
            <span class="cart-count">0 items</span>
        </div>
        <div class="cart-items"></div>
        <div class="cart-summary">
            <div class="cart-total">
                <span>Total:</span>
                <span id="cart-total-amount">$0.00</span>
            </div>
            <div class="cart-actions">
                <button id="checkout-btn" disabled>Checkout</button>
                <button id="clear-cart-btn" disabled>Clear Cart</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    document.getElementById('checkout-btn').addEventListener('click', function() {
        // Group items by store
        const storeGroups = groupCartItemsByStore();
        
        if (Object.keys(storeGroups).length === 0) {
            showToast('Your cart is empty');
            return;
        }
        
        // If multiple stores, ask which one to checkout
        if (Object.keys(storeGroups).length > 1) {
            showStoreSelection(storeGroups);
        } else {
            // Only one store, checkout directly
            const store = Object.keys(storeGroups)[0];
            checkoutStore(store);
        }
    });
    
    document.getElementById('clear-cart-btn').addEventListener('click', function() {
        clearCart();
        showToast('Cart cleared');
    });
    
    // Initialize empty cart
    updateCartView();
}

/**
 * Update cart view
 */
function updateCartView() {
    const cartItems = document.querySelector('.cart-items');
    const cartCount = document.querySelector('.cart-count');
    const cartTotalAmount = document.getElementById('cart-total-amount');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    
    if (!cartItems || !cartCount || !cartTotalAmount) return;
    
    // Get cart data from the room (all placed products)
    const placements = document.querySelectorAll('.product-placement');
    
    if (placements.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <p>Your cart is empty.</p>
                <p>Add products to your room to see them here.</p>
            </div>
        `;
        cartCount.textContent = '0 items';
        cartTotalAmount.textContent = '$0.00';
        checkoutBtn.disabled = true;
        clearCartBtn.disabled = true;
        return;
    }
    
    // Get cart contents and total
    const cartProducts = [];
    let cartTotal = 0;
    
    placements.forEach(placement => {
        const productId = placement.getAttribute('data-product-id');
        const store = placement.getAttribute('data-store');
        
        // Find the product data
        // In a real implementation, we would have this data in a state/store
        // For this example, we'll find it in the catalog
        const productCard = document.querySelector(`.catalog-product[data-product-id="${productId}"]`);
        if (productCard) {
            const name = productCard.querySelector('h4').textContent;
            const priceText = productCard.querySelector('.product-price').textContent;
            const price = parseFloat(priceText.replace('$', ''));
            
            cartProducts.push({ id: productId, name, price, store });
            cartTotal += price;
        }
    });
    
    // Update the view
    cartItems.innerHTML = cartProducts.map(product => `
        <div class="cart-item" data-product-id="${product.id}">
            <div class="cart-item-info">
                <h4>${product.name}</h4>
                <p class="cart-item-store">${product.store}</p>
            </div>
            <div class="cart-item-price">$${product.price.toFixed(2)}</div>
            <button class="remove-from-cart-btn" data-product-id="${product.id}">×</button>
        </div>
    `).join('');
    
    // Group items by store for summary
    const storeGroups = {};
    cartProducts.forEach(product => {
        if (!storeGroups[product.store]) {
            storeGroups[product.store] = { count: 0, total: 0 };
        }
        storeGroups[product.store].count++;
        storeGroups[product.store].total += product.price;
    });
    
    // Add store summary
    const storeSummary = document.createElement('div');
    storeSummary.className = 'store-summary';
    storeSummary.innerHTML = Object.entries(storeGroups).map(([store, data]) => `
        <div class="store-summary-item">
            <span>${store} (${data.count} item${data.count !== 1 ? 's' : ''})</span>
            <span>$${data.total.toFixed(2)}</span>
        </div>
    `).join('');
    
    cartItems.appendChild(storeSummary);
    
    // Update cart summary
    cartCount.textContent = `${cartProducts.length} item${cartProducts.length !== 1 ? 's' : ''}`;
    cartTotalAmount.textContent = `$${cartTotal.toFixed(2)}`;
    checkoutBtn.disabled = cartProducts.length === 0;
    clearCartBtn.disabled = cartProducts.length === 0;
    
    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-from-cart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            removeProductFromRoom(productId);
        });
    });
}

/**
 * Add product to cart
 */
function addProductToCart(product) {
    // In this implementation, the cart is just a view of the products placed in the room
    // Update the cart view whenever a product is added
    updateCartView();
}

/**
 * Remove product from cart
 */
function removeProductFromCart(productId) {
    // In this implementation, removing from cart means removing from the room
    updateCartView();
}

/**
 * Group cart items by store
 */
function groupCartItemsByStore() {
    const placements = document.querySelectorAll('.product-placement');
    const storeGroups = {};
    
    placements.forEach(placement => {
        const productId = placement.getAttribute('data-product-id');
        const store = placement.getAttribute('data-store');
        
        // Find the product data
        const productCard = document.querySelector(`.catalog-product[data-product-id="${productId}"]`);
        if (productCard) {
            const name = productCard.querySelector('h4').textContent;
            const priceText = productCard.querySelector('.product-price').textContent;
            const price = parseFloat(priceText.replace('$', ''));
            
            if (!storeGroups[store]) {
                storeGroups[store] = { items: [] };
            }
            
            storeGroups[store].items.push({ id: productId, name, price });
        }
    });
    
    return storeGroups;
}

/**
 * Show store selection dialog for checkout
 */
function showStoreSelection(storeGroups) {
    // Create dialog element
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'store-selection-dialog';
    
    dialog.innerHTML = `
        <h3>Choose a Store to Checkout</h3>
        <p>Your cart contains items from multiple stores. Please select which store you'd like to check out with:</p>
        <div class="store-options">
            ${Object.entries(storeGroups).map(([store, data]) => `
                <div class="store-option">
                    <input type="radio" name="store" id="store-${store}" value="${store}">
                    <label for="store-${store}">
                        <strong>${store}</strong>
                        <span>${data.items.length} item${data.items.length !== 1 ? 's' : ''}</span>
                        <span>$${data.items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</span>
                    </label>
                </div>
            `).join('')}
        </div>
        <div class="dialog-actions">
            <button class="cancel-btn">Cancel</button>
            <button class="checkout-selected-btn" disabled>Checkout Selected Store</button>
        </div>
    `;
    
    // Add to DOM
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    // Select first store by default
    const firstRadio = dialog.querySelector('input[type="radio"]');
    if (firstRadio) {
        firstRadio.checked = true;
        dialog.querySelector('.checkout-selected-btn').disabled = false;
    }
    
    // Add event listeners
    dialog.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            dialog.querySelector('.checkout-selected-btn').disabled = false;
        });
    });
    
    dialog.querySelector('.cancel-btn').addEventListener('click', function() {
        document.body.removeChild(dialogOverlay);
    });
    
    dialog.querySelector('.checkout-selected-btn').addEventListener('click', function() {
        const selectedStore = dialog.querySelector('input[type="radio"]:checked').value;
        document.body.removeChild(dialogOverlay);
        checkoutStore(selectedStore);
    });
    
    // Close on click outside
    dialogOverlay.addEventListener('click', function(e) {
        if (e.target === dialogOverlay) {
            document.body.removeChild(dialogOverlay);
        }
    });
}

/**
 * Checkout with a specific store
 */
function checkoutStore(store) {
    const storeGroups = groupCartItemsByStore();
    
    if (!storeGroups[store]) {
        showToast('No items found for this store');
        return;
    }
    
    const items = storeGroups[store].items;
    
    // Show loading toast
    showToast(`Creating checkout for ${store}...`);
    
    // In a real implementation, we would call the API to create a checkout
    // Simulating API call with timeout
    setTimeout(() => {
        // Call the cart checkout API
        fetch('/api/cart/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                store: store,
                items: items.map(item => ({ product_id: item.id, quantity: 1 }))
            })
        })
        .then(response => response.json())
        .then(data => {
            // Show success message with link
            if (data.checkout_url) {
                // Show confirmation dialog
                const dialogOverlay = document.createElement('div');
                dialogOverlay.className = 'dialog-overlay';
                
                const dialog = document.createElement('div');
                dialog.className = 'checkout-dialog';
                
                dialog.innerHTML = `
                    <h3>Ready to Checkout with ${store}</h3>
                    <p>Your cart with ${items.length} item${items.length !== 1 ? 's' : ''} is ready for checkout.</p>
                    <div class="checkout-summary">
                        <div class="checkout-items">
                            ${items.map(item => `
                                <div class="checkout-item">
                                    <span>${item.name}</span>
                                    <span>$${item.price.toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="checkout-total">
                            <span>Total:</span>
                            <span>$${items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="dialog-actions">
                        <button class="cancel-btn">Cancel</button>
                        <a href="${data.checkout_url}" target="_blank" class="checkout-btn">Continue to ${store}</a>
                    </div>
                `;
                
                // Add to DOM
                dialogOverlay.appendChild(dialog);
                document.body.appendChild(dialogOverlay);
                
                // Add event listeners
                dialog.querySelector('.cancel-btn').addEventListener('click', function() {
                    document.body.removeChild(dialogOverlay);
                });
                
                // Close on click outside
                dialogOverlay.addEventListener('click', function(e) {
                    if (e.target === dialogOverlay) {
                        document.body.removeChild(dialogOverlay);
                    }
                });
            } else {
                showToast('Could not create checkout');
            }
        })
        .catch(error => {
            console.error('Error creating checkout:', error);
            showToast('Error creating checkout. Please try again.');
        });
    }, 1000);
}

/**
 * Save current room version
 */
function saveCurrentRoomVersion() {
    const roomId = getCurrentRoomId();
    if (!roomId) {
        showToast('No room selected');
        return;
    }
    
    // Collect all product placements
    const placements = [];
    document.querySelectorAll('.product-placement').forEach(placement => {
        placements.push({
            product_id: placement.getAttribute('data-product-id'),
            store: placement.getAttribute('data-store'),
            position_x: parseFloat(placement.style.left) / 100,
            position_y: parseFloat(placement.style.top) / 100,
            rotation: placement.getAttribute('data-rotation') || 0,
            scale: placement.getAttribute('data-scale') || 1
        });
    });
    
    // Get cart items
    const cartItems = [];
    document.querySelectorAll('.product-placement').forEach(placement => {
        const productId = placement.getAttribute('data-product-id');
        const store = placement.getAttribute('data-store');
        
        // Find the product data from catalog
        const productCard = document.querySelector(`.catalog-product[data-product-id="${productId}"]`);
        if (productCard) {
            const name = productCard.querySelector('h4').textContent;
            const priceText = productCard.querySelector('.product-price').textContent;
            const price = parseFloat(priceText.replace('$', ''));
            
            cartItems.push({
                product_id: productId,
                store: store,
                name: name,
                price: price,
                quantity: 1
            });
        }
    });
    
    // Collect version data
    const versionData = {
        room_id: roomId,
        name: `Version ${new Date().toLocaleString()}`,
        placements: placements,
        cart_items: cartItems
    };
    
    // Show loading toast
    showToast('Saving room version...');
    
    // Save the version
    fetch('/api/room/version', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(versionData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.version_id) {
            showToast('Room version saved successfully');
            
            // Update versions dropdown
            loadRoomVersions(roomId);
        } else {
            showToast('Error saving room version');
        }
    })
    .catch(error => {
        console.error('Error saving room version:', error);
        showToast('Error saving room version. Please try again.');
    });
}

/**
 * Load room versions for a room
 */
function loadRoomVersions(roomId) {
    if (!roomId) return;
    
    const versionSelector = document.getElementById('version-selector');
    if (!versionSelector) return;
    
    // Show loading state
    versionSelector.disabled = true;
    versionSelector.innerHTML = '<option value="">Loading versions...</option>';
    
    // Fetch the versions
    fetch(`/api/user/1/room/${roomId}/versions`)
        .then(response => response.json())
        .then(versions => {
            // Update the dropdown
            updateVersionsDropdown(versions);
        })
        .catch(error => {
            console.error('Error loading room versions:', error);
            versionSelector.innerHTML = '<option value="current">Current Version</option>';
            versionSelector.disabled = false;
        });
}

/**
 * Update versions dropdown
 */
function updateVersionsDropdown(versions) {
    const versionSelector = document.getElementById('version-selector');
    if (!versionSelector) return;
    
    // Reset dropdown
    versionSelector.innerHTML = '<option value="current">Current Version</option>';
    
    // Add versions
    if (versions && versions.length > 0) {
        versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version.id;
            option.textContent = version.name || `Version ${new Date(version.created_at).toLocaleString()}`;
            versionSelector.appendChild(option);
        });
    }
    
    // Enable the dropdown and buttons
    versionSelector.disabled = false;
    document.getElementById('save-version-btn').disabled = false;
    document.getElementById('new-version-btn').disabled = false;
}

/**
 * Load a specific room version
 */
function loadRoomVersion(versionId) {
    // Show loading toast
    showToast('Loading room version...');
    
    // Fetch the version data
    fetch(`/api/room/version/${versionId}`)
        .then(response => response.json())
        .then(versionData => {
            // Clear current placements
            clearRoomPlacements();
            
            // Load the placements
            if (versionData.placements && versionData.placements.length > 0) {
                // For each placement, we need to find the product data
                versionData.placements.forEach(placement => {
                    // Find product from cart items
                    const productData = versionData.cart_items.find(item => item.product_id === placement.product_id);
                    
                    if (productData) {
                        // Create a product object
                        const product = {
                            id: productData.product_id,
                            name: productData.name,
                            price: productData.price,
                            store: productData.store,
                            image: `/static/images/products/${productData.product_id}.jpg` // Fallback image path
                        };
                        
                        // Add the product to the room
                        const placementElement = addProductToRoom(product);
                        
                        // Set the position
                        if (placementElement) {
                            placementElement.style.left = `${placement.position_x * 100}%`;
                            placementElement.style.top = `${placement.position_y * 100}%`;
                            
                            if (placement.rotation) {
                                placementElement.style.transform = `rotate(${placement.rotation}deg)`;
                                placementElement.setAttribute('data-rotation', placement.rotation);
                            }
                            
                            if (placement.scale) {
                                placementElement.style.transform = `${placementElement.style.transform || ''} scale(${placement.scale})`;
                                placementElement.setAttribute('data-scale', placement.scale);
                            }
                        }
                    }
                });
                
                showToast('Room version loaded successfully');
            } else {
                showToast('No placements found in this version');
            }
        })
        .catch(error => {
            console.error('Error loading room version:', error);
            showToast('Error loading room version. Please try again.');
        });
}

/**
 * Setup save and load functions
 */
function setupSaveAndLoadFunctions() {
    // These are already set up in the initVersionControls function
}

/**
 * Clear room placements
 */
function clearRoomPlacements() {
    const roomView = document.getElementById('room-view');
    if (!roomView) return;
    
    // Remove all product placements
    document.querySelectorAll('.product-placement').forEach(placement => {
        placement.parentNode.removeChild(placement);
    });
    
    // Update cart view
    updateCartView();
}

/**
 * Clear the cart
 */
function clearCart() {
    // In this implementation, clearing the cart means clearing the room
    clearRoomPlacements();
}

/**
 * Show empty state
 */
function showEmptyState() {
    const roomView = document.getElementById('room-view');
    if (!roomView) return;
    
    roomView.innerHTML = `
        <div class="empty-room-state">
            <h3>No Room Selected</h3>
            <p>Please select a room from your scanned rooms or scan a new room.</p>
            <div class="empty-actions">
                <button onclick="initRoomSelector()">Refresh Rooms</button>
                <a href="/ar-room" class="scan-room-btn">Scan a New Room</a>
            </div>
        </div>
    `;
    
    // Disable version controls
    document.getElementById('save-version-btn').disabled = true;
    document.getElementById('new-version-btn').disabled = true;
    document.getElementById('version-selector').disabled = true;
}

/**
 * Get current room ID
 */
function getCurrentRoomId() {
    const activeRoom = document.querySelector('.room-card.active');
    return activeRoom ? activeRoom.getAttribute('data-room-id') : null;
}

/**
 * Select a room
 */
function selectRoom(roomId) {
    if (!roomId) return;
    
    const roomView = document.getElementById('room-view');
    if (!roomView) return;
    
    // Show loading state
    roomView.innerHTML = `
        <div class="loading-room">
            <div class="spinner"></div>
            <p>Loading room...</p>
        </div>
    `;
    
    // Fetch room data
    fetch(`/api/home/room/${roomId}`)
        .then(response => response.json())
        .then(roomData => {
            // Create the room view
            roomView.innerHTML = `
                <div class="room-canvas" style="background-image: url('${roomData.image || '/static/images/room-placeholder.jpg'}')">
                    <!-- Products will be placed here -->
                </div>
                <div class="room-controls">
                    <button id="reset-room-btn">Reset Room</button>
                    <button id="undo-placement-btn">Undo Last Placement</button>
                </div>
            `;
            
            // Enable version controls
            document.getElementById('save-version-btn').disabled = false;
            document.getElementById('new-version-btn').disabled = false;
            
            // Load room versions
            loadRoomVersions(roomId);
            
            // Add event listeners for room controls
            document.getElementById('reset-room-btn').addEventListener('click', function() {
                if (confirm('Are you sure you want to reset the room? This will remove all product placements.')) {
                    clearRoomPlacements();
                }
            });
            
            document.getElementById('undo-placement-btn').addEventListener('click', function() {
                const placements = document.querySelectorAll('.product-placement');
                if (placements.length > 0) {
                    const lastPlacement = placements[placements.length - 1];
                    removeProductFromRoom(lastPlacement.getAttribute('data-product-id'));
                }
            });
        })
        .catch(error => {
            console.error('Error loading room:', error);
            roomView.innerHTML = `
                <div class="error-message">
                    <p>There was a problem loading the room. Please try again.</p>
                    <button onclick="selectRoom('${roomId}')">Retry</button>
                </div>
            `;
        });
}

/**
 * Show toast message
 */
function showToast(message, duration = 3000) {
    // Remove any existing toasts
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

/**
 * Filter products
 */
function filterProducts() {
    const storeFilter = document.getElementById('store-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    const searchTerm = document.getElementById('search-products').value.toLowerCase();
    
    // Show loading state
    const productsContainer = document.querySelector('.catalog-products');
    if (productsContainer) {
        productsContainer.innerHTML = `
            <div class="catalog-loading">
                <div class="spinner"></div>
                <p>Filtering products...</p>
            </div>
        `;
    }
    
    // Filter the products
    // In a real implementation, we would call the API with filter parameters
    // For this example, we'll filter the sample products in memory
    let filteredProducts = window.sampleProducts || [];
    
    if (storeFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
            product.store.toLowerCase() === storeFilter.toLowerCase()
        );
    }
    
    if (categoryFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
            product.category.toLowerCase() === categoryFilter.toLowerCase()
        );
    }
    
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) || 
            product.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Update the products list
    setTimeout(() => {
        updateProductsList(filteredProducts);
    }, 300); // Simulate loading delay
}

/**
 * Reset filters
 */
function resetFilters() {
    document.getElementById('store-filter').value = 'all';
    document.getElementById('category-filter').value = 'all';
    document.getElementById('search-products').value = '';
    filterProducts();
}

/**
 * Load sample products
 */
/**
 * Update the product catalog with loaded products
 */
function updateProductCatalog() {
    if (window.sampleProducts && window.sampleProducts.length > 0) {
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
        
        // Update products list
        updateProductsList(window.sampleProducts);
    }
}

/**
 * Load products from API
 */
function loadSampleProducts() {
    // Fetch products from the API instead of using hardcoded samples
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
            // After loading products, update the product catalog
            updateProductCatalog();
        })
        .catch(error => {
            console.error('Error loading products:', error);
            // If there was an error, try to get the data one more time
            fetch('/api/store-products')
                .then(response => response.json())
                .then(products => {
                    if (products && products.length > 0) {
                        window.sampleProducts = products.map(product => ({
                            id: product.id,
                            name: product.name,
                            description: product.description || '',
                            price: product.price || 0,
                            category: (product.category || 'other').toLowerCase(),
                            store: product.store || 'Unknown',
                            image: product.image_url || '/static/furniture/sofa.svg'
                        }));
                        updateProductCatalog();
                    } else {
                        throw new Error('Failed to load products on retry');
                    }
                })
                .catch(finalError => {
                    console.error('Failed to load products after retry:', finalError);
                    console.log('Loading fallback products due to API failure');
                    
                    // Create a single error product
                    window.sampleProducts = [{
                        id: 'error-1',
                        name: 'Product Data Unavailable',
                        description: 'Unable to load products from the database. Please try refreshing the page.',
                        price: 0,
                        category: 'error',
                        store: 'Error',
                        image: '/static/images/product-placeholder.jpg'
                    }];
                    
                    // Update products catalog with error message
                    updateProductCatalog();
                });
            {
                id: 'chair-1',
                name: 'Accent Armchair',
                description: 'Stylish accent armchair with wooden legs',
                price: 349.99,
                category: 'furniture',
                store: 'West Elm',
                image: '/static/images/products/chair-1.jpg'
            },
            {
                id: 'coffee-table-1',
                name: 'Marble Coffee Table',
                description: 'Modern coffee table with marble top and metal base',
                price: 599.99,
                category: 'furniture',
                store: 'West Elm',
                image: '/static/images/products/coffee-table-1.jpg'
            },
            {
                id: 'lamp-1',
                name: 'Floor Lamp',
                description: 'Modern floor lamp with adjustable head',
                price: 129.99,
                category: 'lighting',
                store: 'IKEA',
                image: '/static/images/products/lamp-1.jpg'
            },
            {
                id: 'rug-1',
                name: 'Area Rug 5x8',
                description: 'Soft area rug with geometric pattern',
                price: 249.99,
                category: 'rugs',
                store: 'Wayfair',
                image: '/static/images/products/rug-1.jpg'
            },
            {
                id: 'bookshelf-1',
                name: 'Bookshelf',
                description: '5-tier bookshelf with metal frame',
                price: 179.99,
                category: 'furniture',
                store: 'IKEA',
                image: '/static/images/products/bookshelf-1.jpg'
            },
            {
                id: 'tv-stand-1',
                name: 'TV Stand',
                description: 'Media console for TVs up to 65 inches',
                price: 399.99,
                category: 'furniture',
                store: 'Home Depot',
                image: '/static/images/products/tv-stand-1.jpg'
            },
            {
                id: 'plant-1',
                name: 'Fiddle Leaf Fig',
                description: 'Live indoor plant in decorative pot',
                price: 89.99,
                category: 'decor',
                store: "Lowe's",
                image: '/static/images/products/plant-1.jpg'
            },
            {
                id: 'curtains-1',
                name: 'Blackout Curtains',
                description: 'Set of 2 blackout curtains, 84 inches',
                price: 49.99,
                category: 'decor',
                store: 'Wayfair',
                image: '/static/images/products/curtains-1.jpg'
            },
            {
                id: 'dining-table-1',
                name: 'Dining Table',
                description: 'Wooden dining table for 6 people',
                price: 799.99,
                category: 'furniture',
                store: 'West Elm',
                image: '/static/images/products/dining-table-1.jpg'
            },
            {
                id: 'dining-chair-1',
                name: 'Dining Chair',
                description: 'Upholstered dining chair with wooden legs',
                price: 149.99,
                category: 'furniture',
                store: 'IKEA',
                image: '/static/images/products/dining-chair-1.jpg'
            },
            {
                id: 'pendant-light-1',
                name: 'Pendant Light',
                description: 'Modern pendant light for dining area',
                price: 199.99,
                category: 'lighting',
                store: "Lowe's",
                image: '/static/images/products/pendant-light-1.jpg'
            },
            {
                id: 'wall-art-1',
                name: 'Canvas Wall Art',
                description: 'Abstract canvas wall art, set of 3',
                price: 129.99,
                category: 'decor',
                store: 'Wayfair',
                image: '/static/images/products/wall-art-1.jpg'
            },
            {
                id: 'sideboard-1',
                name: 'Sideboard',
                description: 'Storage sideboard with drawers and cabinets',
                price: 549.99,
                category: 'furniture',
                store: 'West Elm',
                image: '/static/images/products/sideboard-1.jpg'
            },
            {
                id: 'mirror-1',
                name: 'Wall Mirror',
                description: 'Round wall mirror with gold frame',
                price: 199.99,
                category: 'decor',
                store: 'Home Depot',
                image: '/static/images/products/mirror-1.jpg'
            },
            {
                id: 'bed-1',
                name: 'Queen Bed Frame',
                description: 'Upholstered queen bed frame with headboard',
                price: 899.99,
                category: 'furniture',
                store: 'Wayfair',
                image: '/static/images/products/bed-1.jpg'
            },
            {
                id: 'nightstand-1',
                name: 'Nightstand',
                description: 'Bedside nightstand with drawer and shelf',
                price: 149.99,
                category: 'furniture',
                store: 'IKEA',
                image: '/static/images/products/nightstand-1.jpg'
            },
            {
                id: 'dresser-1',
                name: '6-Drawer Dresser',
                description: 'Wooden dresser with six drawers',
                price: 699.99,
                category: 'furniture',
                store: 'West Elm',
                image: '/static/images/products/dresser-1.jpg'
            },
            {
                id: 'desk-1',
                name: 'Home Office Desk',
                description: 'Work desk with drawers',
                price: 349.99,
                category: 'furniture',
                store: "Lowe's",
                image: '/static/images/products/desk-1.jpg'
            },
            {
                id: 'office-chair-1',
                name: 'Ergonomic Office Chair',
                description: 'Adjustable office chair with lumbar support',
                price: 279.99,
                category: 'furniture',
                store: 'Home Depot',
                image: '/static/images/products/office-chair-1.jpg'
            }
        ];
        
        // Fallback image paths in case the actual images aren't available
        window.sampleProducts.forEach(product => {
            // If this is a real implementation, we would use actual product images from the API
            product.image = product.image || '/static/images/product-placeholder.jpg';
        });
    }
    
    // Update products in the catalog
    updateProductsList(window.sampleProducts);
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