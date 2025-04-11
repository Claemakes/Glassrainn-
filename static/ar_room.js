// AR Room Scanner with Virtual Furniture Placement and Store Integration
// GlassRain Application

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Main UI
    const instructions = document.getElementById('instructions');
    const startArButton = document.getElementById('start-ar');
    const arContainer = document.getElementById('ar-container');
    const backButton = document.getElementById('back-button');
    const saveButton = document.getElementById('save-button');
    const uiContainer = document.getElementById('ui-container');
    const loadingElement = document.getElementById('loading');
    
    // Room Tools Tab
    const furnitureCarousel = document.getElementById('furniture-carousel');
    const scanButton = document.getElementById('scan-button');
    const furnitureButton = document.getElementById('furniture-button');
    const measureButton = document.getElementById('measure-button');
    const resetButton = document.getElementById('reset-button');
    const undoButton = document.getElementById('undo-button');
    const captureButton = document.getElementById('capture-button');
    
    // Store Products Tab
    const productBar = document.getElementById('product-bar');
    const productSearch = document.getElementById('product-search');
    const storeFilter = document.getElementById('store-filter');
    
    // Cart UI
    const cartButton = document.getElementById('cart-button');
    const cartPanel = document.getElementById('cart-panel');
    const closeCartButton = document.getElementById('close-cart');
    const cartBadge = document.getElementById('cart-badge');
    const cartStoresContainer = document.getElementById('cart-stores-container');
    
    // Tab Navigation
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // AR Scene and Camera
    let scene, camera, renderer;
    let arToolkitSource, arToolkitContext;
    
    // Room scanning variables
    let isScanning = false;
    let roomData = {
        walls: [],
        floor: null,
        dimensions: {
            width: 0,
            length: 0,
            height: 0
        },
        scanId: generateId(),
        furniture: []
    };
    
    // Furniture placement variables
    let selectedFurniture = null;
    let selectedProduct = null;
    let placedFurniture = [];
    let measurePoints = [];
    let activeMode = 'scan'; // Options: scan, furniture, measure
    
    // Sample furniture data - this would come from an API in production
    const furnitureItems = [
        { id: 1, name: "Sofa", image: "/static/furniture/sofa.svg", model: "/static/models/sofa.gltf", width: 2, depth: 0.8, height: 0.7 },
        { id: 2, name: "Chair", image: "/static/furniture/chair.svg", model: "/static/models/chair.gltf", width: 0.7, depth: 0.7, height: 0.8 },
        { id: 3, name: "Table", image: "/static/furniture/table.svg", model: "/static/models/table.gltf", width: 1.2, depth: 0.8, height: 0.75 },
        { id: 4, name: "Bed", image: "/static/furniture/bed.svg", model: "/static/models/bed.gltf", width: 1.8, depth: 2, height: 0.5 },
        { id: 5, name: "Lamp", image: "/static/furniture/lamp.svg", model: "/static/models/lamp.gltf", width: 0.4, depth: 0.4, height: 1.5 },
        { id: 6, name: "Bookshelf", image: "/static/furniture/bookshelf.svg", model: "/static/models/bookshelf.gltf", width: 0.8, depth: 0.3, height: 1.8 },
        { id: 7, name: "TV Stand", image: "/static/furniture/tv_stand.svg", model: "/static/models/tv_stand.gltf", width: 1.5, depth: 0.5, height: 0.6 },
        { id: 8, name: "Plant", image: "/static/furniture/plant.svg", model: "/static/models/plant.gltf", width: 0.5, depth: 0.5, height: 1.2 }
    ];
    
    // Sample store products data
    // In a real implementation, this would come from store APIs or scrapers
    const storeProducts = [
        { id: "p1", name: "Modern Gray Sectional Sofa", price: 1299.99, store: "Home Depot", category: "Furniture", image: "/static/furniture/sofa.svg", onSale: true, salePrice: 999.99, coupon: "HOME15", width: 2.5, depth: 1.0, height: 0.8 },
        { id: "p2", name: "Ergonomic Office Chair", price: 249.99, store: "Home Depot", category: "Furniture", image: "/static/furniture/chair.svg", onSale: false, width: 0.6, depth: 0.6, height: 1.0 },
        { id: "p3", name: "Solid Wood Coffee Table", price: 399.99, store: "Wayfair", category: "Furniture", image: "/static/furniture/table.svg", onSale: true, salePrice: 329.99, width: 1.2, depth: 0.6, height: 0.45 },
        { id: "p4", name: "Queen Memory Foam Mattress", price: 799.99, store: "Wayfair", category: "Bedding", image: "/static/furniture/bed.svg", onSale: false, width: 1.52, depth: 2.03, height: 0.3 },
        { id: "p5", name: "Adjustable Floor Lamp", price: 129.99, store: "IKEA", category: "Lighting", image: "/static/furniture/lamp.svg", onSale: true, salePrice: 99.99, coupon: "LIGHT10", width: 0.4, depth: 0.4, height: 1.6 },
        { id: "p6", name: "5-Shelf Bookcase", price: 179.99, store: "Lowe's", category: "Furniture", image: "/static/furniture/bookshelf.svg", onSale: false, width: 0.8, depth: 0.35, height: 1.8 },
        { id: "p7", name: "Entertainment Center", price: 499.99, store: "Lowe's", category: "Furniture", image: "/static/furniture/tv_stand.svg", onSale: true, salePrice: 399.99, width: 1.8, depth: 0.5, height: 0.7 },
        { id: "p8", name: "Artificial Fiddle Leaf Fig Plant", price: 89.99, store: "West Elm", category: "Decor", image: "/static/furniture/plant.svg", onSale: false, width: 0.6, depth: 0.6, height: 1.5 },
        { id: "p9", name: "Two-Drawer Nightstand", price: 149.99, store: "West Elm", category: "Furniture", image: "/static/furniture/table.svg", onSale: false, width: 0.5, depth: 0.5, height: 0.6 },
        { id: "p10", name: "Bamboo Room Divider", price: 199.99, store: "IKEA", category: "Furniture", image: "/static/furniture/bookshelf.svg", onSale: true, salePrice: 159.99, width: 1.5, depth: 0.2, height: 1.8 }
    ];
    
    // Shopping cart by store
    let shoppingCart = {};
    
    // Initialize the application
    function init() {
        setupEventListeners();
        loadFurnitureItems();
        loadStoreProducts();
        initializeTabSystem();
        
        // Check if there's a product suggestion from DIY chatbot
        checkForProductSuggestion();
        
        // Initialize AR.js scene
        initARScene();
    }
    
    // Check if there's a product suggestion from DIY chatbot
    function checkForProductSuggestion() {
        // Check if there's a product suggestion in localStorage from DIY chatbot
        const productSuggestion = localStorage.getItem('ar_product_suggestion');
        
        if (productSuggestion) {
            try {
                const suggestion = JSON.parse(productSuggestion);
                
                // Clear the suggestion from localStorage to avoid repeatedly showing it
                localStorage.removeItem('ar_product_suggestion');
                
                // Switch to the store tab
                switchTab('store-tab');
                
                // Search for the product
                if (suggestion.name) {
                    // If the search input exists, set its value and trigger search
                    if (productSearch) {
                        productSearch.value = suggestion.name;
                        loadStoreProducts(suggestion.name);
                        
                        // Show a toast notification
                        showToast(`Searching for "${suggestion.name}" from DIY chat suggestion`);
                    }
                }
            } catch (e) {
                console.error('Error parsing product suggestion:', e);
            }
        }
        
        // Also check URL parameters for tab switching
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        
        if (tabParam === 'store') {
            switchTab('store-tab');
        }
    }

    // Set up all event listeners
    function setupEventListeners() {
        // Main UI
        startArButton.addEventListener('click', startAR);
        backButton.addEventListener('click', goBack);
        saveButton.addEventListener('click', saveRoomData);
        
        // Room Tools
        scanButton.addEventListener('click', () => setMode('scan'));
        furnitureButton.addEventListener('click', () => setMode('furniture'));
        measureButton.addEventListener('click', () => setMode('measure'));
        resetButton.addEventListener('click', resetRoom);
        undoButton.addEventListener('click', undoLastAction);
        captureButton.addEventListener('click', captureRoomSnapshot);
        
        // Event delegation for furniture carousel clicks
        furnitureCarousel.addEventListener('click', (e) => {
            const item = e.target.closest('.furniture-item');
            if (item) {
                const furnitureId = parseInt(item.dataset.id);
                selectFurniture(furnitureId);
            }
        });
        
        // Store Products
        productSearch.addEventListener('input', debounce(filterProducts, 300));
        storeFilter.addEventListener('change', filterProducts);
        
        // Event delegation for product clicks
        productBar.addEventListener('click', (e) => {
            const item = e.target.closest('.product-item');
            if (item) {
                const productId = item.dataset.id;
                selectStoreProduct(productId);
            }
        });
        
        // Cart
        cartButton.addEventListener('click', toggleCart);
        closeCartButton.addEventListener('click', toggleCart);
        
        // Add touch/click events for the AR scene
        document.addEventListener('click', handleSceneInteraction);
        
        // Tab Navigation
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                switchTab(tabId);
            });
        });
    }
    
    // Initialize tab system
    function initializeTabSystem() {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Deactivate all buttons and tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Activate the clicked button and its corresponding tab
                button.classList.add('active');
                const tabId = button.dataset.tab;
                document.getElementById(tabId).classList.add('active');
            });
        });
    }
    
    // Switch between tabs
    function switchTab(tabId) {
        // Hide all tab contents
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        // Activate the selected tab
        const selectedTab = document.getElementById(tabId);
        const selectedButton = document.querySelector(`[data-tab="${tabId}"]`);
        
        if (selectedTab && selectedButton) {
            selectedTab.classList.add('active');
            selectedButton.classList.add('active');
        }
    }

    // Load furniture items into the carousel
    function loadFurnitureItems() {
        furnitureCarousel.innerHTML = '';
        
        furnitureItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'furniture-item';
            itemElement.dataset.id = item.id;
            
            const imgElement = document.createElement('img');
            imgElement.src = item.image;
            imgElement.alt = item.name;
            
            const nameElement = document.createElement('div');
            nameElement.className = 'furniture-name';
            nameElement.textContent = item.name;
            
            itemElement.appendChild(imgElement);
            itemElement.appendChild(nameElement);
            furnitureCarousel.appendChild(itemElement);
        });
    }
    
    // Load store products into the product bar
    function loadStoreProducts(filter = '') {
        productBar.innerHTML = '';
        
        let displayProducts = storeProducts;
        
        // Apply store filter if not "all"
        if (storeFilter.value !== 'all') {
            displayProducts = displayProducts.filter(product => 
                product.store === storeFilter.value
            );
        }
        
        // Apply search filter if any
        if (filter) {
            const searchLower = filter.toLowerCase();
            displayProducts = displayProducts.filter(product => 
                product.name.toLowerCase().includes(searchLower) || 
                product.category.toLowerCase().includes(searchLower) ||
                product.store.toLowerCase().includes(searchLower)
            );
        }
        
        // Limit to 5 products if not searching
        if (!filter && storeFilter.value === 'all') {
            // Randomly select 5 products each time
            displayProducts = shuffleArray([...displayProducts]).slice(0, 5);
        }
        
        displayProducts.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-item';
            productElement.dataset.id = product.id;
            
            const imgElement = document.createElement('img');
            imgElement.src = product.image;
            imgElement.alt = product.name;
            
            const nameElement = document.createElement('div');
            nameElement.className = 'product-name';
            nameElement.textContent = product.name;
            
            const priceElement = document.createElement('div');
            priceElement.className = 'product-price';
            
            if (product.onSale) {
                priceElement.innerHTML = `<span style="text-decoration: line-through; color: #888; font-size: 10px;">$${product.price.toFixed(2)}</span> $${product.salePrice.toFixed(2)}`;
                
                const saleBadge = document.createElement('div');
                saleBadge.className = 'sale-badge';
                saleBadge.textContent = 'SALE';
                productElement.appendChild(saleBadge);
            } else {
                priceElement.textContent = `$${product.price.toFixed(2)}`;
            }
            
            const storeElement = document.createElement('div');
            storeElement.className = 'product-store';
            storeElement.textContent = product.store;
            
            productElement.appendChild(imgElement);
            productElement.appendChild(nameElement);
            productElement.appendChild(priceElement);
            productElement.appendChild(storeElement);
            productBar.appendChild(productElement);
        });
    }
    
    // Filter products based on search input and store filter
    function filterProducts() {
        const searchValue = productSearch.value.trim();
        loadStoreProducts(searchValue);
    }
    
    // Shuffle array (for randomizing product display)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Initialize the AR.js scene
    function initARScene() {
        // This is a placeholder for AR.js initialization
        // In a production app, this would use AR.js or other AR libraries
        
        // For demo purposes, we're using A-Frame and AR.js
        // The actual implementation would require more detailed setup
    }

    // Start AR experience
    function startAR() {
        showLoading(true);
        
        // Hide instructions and show AR interface
        instructions.classList.add('hidden');
        arContainer.classList.remove('hidden');
        backButton.classList.remove('hidden');
        saveButton.classList.remove('hidden');
        cartButton.classList.remove('hidden');
        uiContainer.classList.remove('hidden');
        
        // Initialize AR scene (in a real app, this would initialize the AR framework)
        setTimeout(() => {
            // Simulate AR initialization
            showLoading(false);
            
            // Start in scanning mode
            setMode('scan');
            
            // In a real app, this would actually start the AR tracking
            console.log("AR experience started");
            
            // For demo purposes, we'll simulate AR with a placeholder
            simulateAR();
        }, 2000);
    }

    // Simulate AR experience for demo purposes
    function simulateAR() {
        // This would be replaced with actual AR library code
        const scene = document.querySelector('a-scene');
        
        // Add a demo plane to represent detected floor
        const floor = document.createElement('a-plane');
        floor.setAttribute('position', '0 0 -4');
        floor.setAttribute('rotation', '-90 0 0');
        floor.setAttribute('width', '10');
        floor.setAttribute('height', '10');
        floor.setAttribute('color', '#CCC');
        floor.setAttribute('opacity', '0.5');
        scene.appendChild(floor);
        
        // Store floor data
        roomData.floor = {
            position: { x: 0, y: 0, z: -4 },
            width: 10,
            length: 10
        };
        
        // Update room dimensions
        roomData.dimensions = {
            width: 10,
            length: 10,
            height: 2.7  // Standard ceiling height
        };
    }

    // Set active mode (scan, furniture, measure)
    function setMode(mode) {
        activeMode = mode;
        
        // Update UI to reflect active mode
        scanButton.style.opacity = mode === 'scan' ? '1' : '0.5';
        furnitureButton.style.opacity = mode === 'furniture' ? '1' : '0.5';
        measureButton.style.opacity = mode === 'measure' ? '1' : '0.5';
        
        // Show/hide furniture carousel based on mode
        furnitureCarousel.style.display = mode === 'furniture' ? 'flex' : 'none';
        
        console.log(`Mode switched to: ${mode}`);
    }

    // Handle clicks/taps on the AR scene
    function handleSceneInteraction(event) {
        // Ignore clicks on UI elements
        if (event.target.closest('.ui-container') || 
            event.target.closest('.cart-panel') || 
            event.target.closest('.cart-button') ||
            event.target.closest('.back-button') ||
            event.target.closest('.save-button')) {
            return;
        }
        
        if (activeMode === 'furniture' && selectedFurniture) {
            placeFurniture(event);
        } else if (selectedProduct) {
            placeStoreProduct(event);
        } else if (activeMode === 'measure') {
            addMeasurePoint(event);
        } else if (activeMode === 'scan') {
            // In scan mode, clicks could identify walls or other features
            scanSurface(event);
        }
    }

    // Select a furniture item to place
    function selectFurniture(furnitureId) {
        // Clear any selected store product
        selectedProduct = null;
        document.querySelectorAll('.product-item').forEach(item => {
            item.style.border = 'none';
        });
        
        selectedFurniture = furnitureItems.find(item => item.id === furnitureId);
        
        // Update UI to show selected item
        document.querySelectorAll('.furniture-item').forEach(item => {
            if (parseInt(item.dataset.id) === furnitureId) {
                item.style.border = '2px solid var(--primary-color)';
            } else {
                item.style.border = 'none';
            }
        });
        
        console.log(`Selected furniture: ${selectedFurniture.name}`);
    }
    
    // Select a store product to place
    function selectStoreProduct(productId) {
        // Clear any selected furniture
        selectedFurniture = null;
        document.querySelectorAll('.furniture-item').forEach(item => {
            item.style.border = 'none';
        });
        
        selectedProduct = storeProducts.find(product => product.id === productId);
        
        // Update UI to show selected product
        document.querySelectorAll('.product-item').forEach(item => {
            if (item.dataset.id === productId) {
                item.style.border = '2px solid var(--primary-color)';
            } else {
                item.style.border = 'none';
            }
        });
        
        console.log(`Selected product: ${selectedProduct.name} from ${selectedProduct.store}`);
    }

    // Place selected furniture in the AR scene
    function placeFurniture(event) {
        if (!selectedFurniture) return;
        
        // In a real app, this would use raycasting to place the object
        // on the detected floor or wall
        
        // For demo purposes, we'll place it at a fixed position
        const furniture = document.createElement('a-entity');
        const randomX = (Math.random() * 6) - 3;
        const randomZ = (Math.random() * 6) - 5;
        
        furniture.setAttribute('position', `${randomX} 0 ${randomZ}`);
        
        // Use primitive shapes for demo instead of actual models
        if (selectedFurniture.name === 'Sofa') {
            furniture.innerHTML = `
                <a-box width="${selectedFurniture.width}" height="${selectedFurniture.height/2}" depth="${selectedFurniture.depth}" 
                       position="0 ${selectedFurniture.height/4} 0" color="#A3C1DA"></a-box>
                <a-box width="${selectedFurniture.width}" height="${selectedFurniture.height/2}" depth="${selectedFurniture.depth/4}" 
                       position="0 ${selectedFurniture.height*0.75} ${-selectedFurniture.depth*0.4}" color="#8CABC9"></a-box>
            `;
        } else if (selectedFurniture.name === 'Chair') {
            furniture.innerHTML = `
                <a-box width="${selectedFurniture.width}" height="${selectedFurniture.height/3}" depth="${selectedFurniture.depth}" 
                       position="0 ${selectedFurniture.height/6} 0" color="#D2B48C"></a-box>
                <a-box width="${selectedFurniture.width}" height="${selectedFurniture.height*0.7}" depth="${selectedFurniture.depth/5}" 
                       position="0 ${selectedFurniture.height*0.5} ${-selectedFurniture.depth*0.4}" color="#BEA27A"></a-box>
            `;
        } else {
            // Generic representation for other furniture
            furniture.innerHTML = `
                <a-box width="${selectedFurniture.width}" height="${selectedFurniture.height}" depth="${selectedFurniture.depth}" 
                       position="0 ${selectedFurniture.height/2} 0" color="#D2B48C"></a-box>
            `;
        }
        
        document.getElementById('furniture-container').appendChild(furniture);
        
        // Store placed furniture data
        const furnitureData = {
            id: generateId(),
            type: selectedFurniture.id,
            name: selectedFurniture.name,
            position: { x: randomX, y: 0, z: randomZ },
            rotation: { x: 0, y: 0, z: 0 },
            dimensions: {
                width: selectedFurniture.width,
                height: selectedFurniture.height,
                depth: selectedFurniture.depth
            }
        };
        
        placedFurniture.push(furnitureData);
        roomData.furniture.push(furnitureData);
        
        console.log(`Placed ${selectedFurniture.name} at position (${randomX}, 0, ${randomZ})`);
    }
    
    // Place selected store product in the AR scene
    function placeStoreProduct(event) {
        if (!selectedProduct) return;
        
        // In a real app, this would use raycasting to place the object
        // on the detected floor or wall
        
        // For demo purposes, we'll place it at a fixed position
        const product = document.createElement('a-entity');
        const randomX = (Math.random() * 6) - 3;
        const randomZ = (Math.random() * 6) - 5;
        
        product.setAttribute('position', `${randomX} 0 ${randomZ}`);
        
        // Use primitive shapes for demo instead of actual models
        // Determine color based on store
        let productColor = "#D2B48C";
        switch(selectedProduct.store) {
            case "Home Depot":
                productColor = "#F96302";
                break;
            case "Lowe's":
                productColor = "#004990";
                break;
            case "IKEA":
                productColor = "#0051BA";
                break;
            case "Wayfair":
                productColor = "#7F187F";
                break;
            case "West Elm":
                productColor = "#8A5738";
                break;
        }
        
        // Generic representation for product
        product.innerHTML = `
            <a-box width="${selectedProduct.width}" height="${selectedProduct.height}" depth="${selectedProduct.depth}" 
                   position="0 ${selectedProduct.height/2} 0" color="${productColor}"></a-box>
            <a-text value="${selectedProduct.name.substring(0, 10)}..." 
                    position="0 ${selectedProduct.height + 0.2} 0"
                    align="center" color="white" scale="0.5 0.5 0.5"></a-text>
        `;
        
        document.getElementById('furniture-container').appendChild(product);
        
        // Store placed furniture data as a product
        const productData = {
            id: selectedProduct.id,
            storeProduct: true,
            store: selectedProduct.store,
            name: selectedProduct.name,
            price: selectedProduct.onSale ? selectedProduct.salePrice : selectedProduct.price,
            position: { x: randomX, y: 0, z: randomZ },
            rotation: { x: 0, y: 0, z: 0 },
            dimensions: {
                width: selectedProduct.width,
                height: selectedProduct.height,
                depth: selectedProduct.depth
            }
        };
        
        placedFurniture.push(productData);
        roomData.furniture.push(productData);
        
        // Show toast with option to add to cart
        showActionToast(`Placed ${selectedProduct.name}`, 'Add to Cart', () => {
            addToCart(selectedProduct);
        });
        
        console.log(`Placed ${selectedProduct.name} at position (${randomX}, 0, ${randomZ})`);
    }
    
    // Add a product to the shopping cart
    function addToCart(product) {
        const store = product.store;
        const productPrice = product.onSale ? product.salePrice : product.price;
        
        // Initialize store in cart if it doesn't exist
        if (!shoppingCart[store]) {
            shoppingCart[store] = {
                items: [],
                total: 0,
                savings: 0,
                coupon: product.coupon || null
            };
        }
        
        // Check if product is already in cart
        const existingProduct = shoppingCart[store].items.find(item => item.id === product.id);
        
        if (existingProduct) {
            // Increment quantity
            existingProduct.quantity += 1;
        } else {
            // Add new product
            shoppingCart[store].items.push({
                id: product.id,
                name: product.name,
                price: productPrice,
                originalPrice: product.price,
                image: product.image,
                quantity: 1
            });
        }
        
        // Update cart total
        shoppingCart[store].total += productPrice;
        
        // Update savings if on sale
        if (product.onSale) {
            shoppingCart[store].savings += (product.price - product.salePrice);
        }
        
        // Update cart UI
        updateCartUI();
        
        // Show success message
        showToast(`${product.name} added to your cart!`);
        
        console.log(`Added ${product.name} to cart. Cart now has ${getCartItemCount()} items.`);
    }
    
    // Update cart UI with current items
    function updateCartUI() {
        // Update cart badge count
        const itemCount = getCartItemCount();
        cartBadge.textContent = itemCount;
        
        // Clear cart stores container
        cartStoresContainer.innerHTML = '';
        
        // Add each store's section
        for (const [store, cartData] of Object.entries(shoppingCart)) {
            if (cartData.items.length === 0) continue;
            
            const storeSection = document.createElement('div');
            storeSection.className = 'cart-store';
            
            // Store header
            const storeHeader = document.createElement('div');
            storeHeader.className = 'cart-store-header';
            storeHeader.innerHTML = `
                <div class="cart-store-name">${store}</div>
                <div>${cartData.items.length} item${cartData.items.length > 1 ? 's' : ''}</div>
            `;
            storeSection.appendChild(storeHeader);
            
            // Store items
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'cart-items';
            
            cartData.items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">$${item.price.toFixed(2)} ${item.quantity > 1 ? `x ${item.quantity}` : ''}</div>
                    </div>
                    <button class="cart-item-remove" data-store="${store}" data-id="${item.id}">×</button>
                `;
                itemsContainer.appendChild(itemElement);
            });
            
            storeSection.appendChild(itemsContainer);
            
            // Savings section (if applicable)
            if (cartData.savings > 0 || cartData.coupon) {
                const savingsSection = document.createElement('div');
                savingsSection.className = 'cart-savings';
                
                let savingsContent = `<div class="savings-title">Your Savings</div>`;
                
                if (cartData.savings > 0) {
                    savingsContent += `<div class="savings-amount">Sale discount: $${cartData.savings.toFixed(2)}</div>`;
                }
                
                if (cartData.coupon) {
                    savingsContent += `<div class="savings-amount">Coupon ${cartData.coupon} applied!</div>`;
                }
                
                savingsSection.innerHTML = savingsContent;
                storeSection.appendChild(savingsSection);
            }
            
            // Store total
            const totalSection = document.createElement('div');
            totalSection.className = 'cart-store-total';
            totalSection.innerHTML = `
                <div>Total</div>
                <div>$${cartData.total.toFixed(2)}</div>
            `;
            storeSection.appendChild(totalSection);
            
            // Checkout button
            const checkoutButton = document.createElement('button');
            checkoutButton.className = 'cart-store-checkout';
            checkoutButton.textContent = `Checkout at ${store}`;
            checkoutButton.dataset.store = store;
            checkoutButton.addEventListener('click', () => checkoutStore(store));
            storeSection.appendChild(checkoutButton);
            
            cartStoresContainer.appendChild(storeSection);
        }
        
        // Add event listeners for remove buttons
        document.querySelectorAll('.cart-item-remove').forEach(button => {
            button.addEventListener('click', () => {
                const store = button.dataset.store;
                const productId = button.dataset.id;
                removeFromCart(store, productId);
            });
        });
    }
    
    // Remove item from cart
    function removeFromCart(store, productId) {
        if (!shoppingCart[store]) return;
        
        const productIndex = shoppingCart[store].items.findIndex(item => item.id === productId);
        
        if (productIndex === -1) return;
        
        const product = shoppingCart[store].items[productIndex];
        
        // Update cart total
        shoppingCart[store].total -= (product.price * product.quantity);
        
        // Update savings if applicable
        if (product.originalPrice > product.price) {
            shoppingCart[store].savings -= ((product.originalPrice - product.price) * product.quantity);
        }
        
        // Remove product
        shoppingCart[store].items.splice(productIndex, 1);
        
        // Delete store from cart if empty
        if (shoppingCart[store].items.length === 0) {
            delete shoppingCart[store];
        }
        
        // Update cart UI
        updateCartUI();
        
        console.log(`Removed ${product.name} from cart. Cart now has ${getCartItemCount()} items.`);
    }
    
    // Get total item count in cart
    function getCartItemCount() {
        let count = 0;
        for (const store in shoppingCart) {
            shoppingCart[store].items.forEach(item => {
                count += item.quantity;
            });
        }
        return count;
    }
    
    // Checkout store cart
    function checkoutStore(store) {
        if (!shoppingCart[store] || shoppingCart[store].items.length === 0) return;
        
        // Prepare checkout data
        const checkoutData = {
            store: store,
            products: shoppingCart[store].items.map(item => item.id),
            totalAmount: shoppingCart[store].total,
            savings: shoppingCart[store].savings,
            coupon: shoppingCart[store].coupon
        };
        
        console.log('Checking out store:', checkoutData);
        
        // In a real app, this would send the checkout data to the server
        fetch('/api/cart/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(checkoutData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to checkout');
            }
            return response.json();
        })
        .then(data => {
            console.log('Checkout successful:', data);
            
            // Clear store from cart
            delete shoppingCart[store];
            updateCartUI();
            
            // Show success message
            showToast(`Checkout successful! Redirecting to ${store}...`);
            
            // In a real app, this would redirect to the store's checkout page
            setTimeout(() => {
                showToast(`This is a demo. In a real app, you would now be on the ${store} checkout page.`);
            }, 2000);
        })
        .catch(error => {
            console.error('Error during checkout:', error);
            showToast('Checkout error: ' + error.message);
        });
    }
    
    // Toggle cart panel visibility
    function toggleCart() {
        cartPanel.classList.toggle('open');
    }

    // Add a point for measuring distances
    function addMeasurePoint(event) {
        // In a real app, this would use raycasting to get the exact position
        
        // For demo purposes, place measurement points at fixed positions
        if (measurePoints.length >= 2) {
            // Reset if we already have 2 points
            measurePoints = [];
            
            // Remove previous measurement line
            const existingLine = document.getElementById('measure-line');
            if (existingLine) {
                existingLine.parentNode.removeChild(existingLine);
            }
            
            const existingLabel = document.getElementById('measure-label');
            if (existingLabel) {
                existingLabel.parentNode.removeChild(existingLabel);
            }
        }
        
        // Create a visual marker for the measurement point
        const point = document.createElement('a-sphere');
        point.setAttribute('radius', '0.05');
        point.setAttribute('color', '#FF0000');
        
        // Position based on where the user clicked (simulated)
        const randomX = (Math.random() * 6) - 3;
        const randomZ = (Math.random() * 6) - 5;
        point.setAttribute('position', `${randomX} 0.05 ${randomZ}`);
        
        document.getElementById('furniture-container').appendChild(point);
        
        // Store the point
        measurePoints.push({ x: randomX, y: 0.05, z: randomZ });
        
        // If we have two points, draw a line between them and show measurement
        if (measurePoints.length === 2) {
            const p1 = measurePoints[0];
            const p2 = measurePoints[1];
            
            // Create a line between points
            const line = document.createElement('a-entity');
            line.id = 'measure-line';
            line.setAttribute('line', `start: ${p1.x} ${p1.y} ${p1.z}; end: ${p2.x} ${p2.y} ${p2.z}; color: #FF0000`);
            document.getElementById('furniture-container').appendChild(line);
            
            // Calculate and display distance
            const distance = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + 
                Math.pow(p2.y - p1.y, 2) + 
                Math.pow(p2.z - p1.z, 2)
            );
            
            // Display measurement label
            const midpoint = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2 + 0.15, // Slightly above the line
                z: (p1.z + p2.z) / 2
            };
            
            const label = document.createElement('a-text');
            label.id = 'measure-label';
            label.setAttribute('value', `${distance.toFixed(2)}m`);
            label.setAttribute('position', `${midpoint.x} ${midpoint.y} ${midpoint.z}`);
            label.setAttribute('align', 'center');
            label.setAttribute('color', '#FFFFFF');
            label.setAttribute('scale', '0.5 0.5 0.5');
            document.getElementById('furniture-container').appendChild(label);
            
            console.log(`Measured distance: ${distance.toFixed(2)}m`);
        }
    }

    // Scan a surface (wall, floor, etc.)
    function scanSurface(event) {
        // In a real app, this would use AR surface detection
        
        // For demo purposes, we'll simulate detecting a wall
        if (roomData.walls.length < 4) {
            // Create a visual representation of a wall
            const wall = document.createElement('a-entity');
            
            // Simulate walls around the room perimeter
            let position, rotation, width, height;
            
            switch(roomData.walls.length) {
                case 0: // Back wall
                    position = { x: 0, y: 1.35, z: -9 };
                    rotation = { x: 0, y: 0, z: 0 };
                    width = 10;
                    height = 2.7;
                    break;
                case 1: // Right wall
                    position = { x: 5, y: 1.35, z: -4 };
                    rotation = { x: 0, y: -90, z: 0 };
                    width = 10;
                    height = 2.7;
                    break;
                case 2: // Front wall
                    position = { x: 0, y: 1.35, z: 1 };
                    rotation = { x: 0, y: 180, z: 0 };
                    width = 10;
                    height = 2.7;
                    break;
                case 3: // Left wall
                    position = { x: -5, y: 1.35, z: -4 };
                    rotation = { x: 0, y: 90, z: 0 };
                    width = 10;
                    height = 2.7;
                    break;
            }
            
            wall.innerHTML = `
                <a-plane width="${width}" height="${height}" 
                         position="${position.x} ${position.y} ${position.z}"
                         rotation="${rotation.x} ${rotation.y} ${rotation.z}"
                         color="#CCCCCC" opacity="0.5"></a-plane>
            `;
            
            document.getElementById('furniture-container').appendChild(wall);
            
            // Store wall data
            roomData.walls.push({
                id: generateId(),
                position,
                rotation,
                dimensions: { width, height }
            });
            
            console.log(`Detected wall #${roomData.walls.length}`);
            
            // If we've detected all 4 walls, display a success message
            if (roomData.walls.length === 4) {
                showToast("Room scan complete! You can now place furniture.");
                setMode('furniture');
                
                // Switch to the products tab after scanning is complete
                setTimeout(() => {
                    switchTab('products-tab');
                }, 2000);
            }
        }
    }

    // Undo the last placed furniture or measurement
    function undoLastAction() {
        if (activeMode === 'furniture' && placedFurniture.length > 0) {
            // Remove last placed furniture
            const lastFurniture = placedFurniture.pop();
            roomData.furniture = roomData.furniture.filter(f => f.id !== lastFurniture.id);
            
            // Remove from the scene
            // In a real app, this would need to find the specific entity
            const furnitureContainer = document.getElementById('furniture-container');
            if (furnitureContainer.lastChild) {
                furnitureContainer.removeChild(furnitureContainer.lastChild);
            }
            
            console.log(`Removed last placed furniture: ${lastFurniture.name}`);
        } else if (activeMode === 'measure') {
            // Reset measurement points
            measurePoints = [];
            
            // Remove measurement visuals
            const existingLine = document.getElementById('measure-line');
            if (existingLine) {
                existingLine.parentNode.removeChild(existingLine);
            }
            
            const existingLabel = document.getElementById('measure-label');
            if (existingLabel) {
                existingLabel.parentNode.removeChild(existingLabel);
            }
            
            // Remove point markers (simplified for demo)
            const furnitureContainer = document.getElementById('furniture-container');
            const spheres = furnitureContainer.querySelectorAll('a-sphere');
            spheres.forEach(sphere => {
                sphere.parentNode.removeChild(sphere);
            });
            
            console.log('Cleared measurement points');
        }
    }

    // Reset the entire room
    function resetRoom() {
        if (confirm('Are you sure you want to clear everything and start over?')) {
            // Reset all data
            roomData = {
                walls: [],
                floor: null,
                dimensions: {
                    width: 0,
                    length: 0,
                    height: 0
                },
                scanId: generateId(),
                furniture: []
            };
            
            placedFurniture = [];
            measurePoints = [];
            
            // Clear the AR scene
            const furnitureContainer = document.getElementById('furniture-container');
            while (furnitureContainer.firstChild) {
                furnitureContainer.removeChild(furnitureContainer.firstChild);
            }
            
            // Reset to scanning mode
            setMode('scan');
            
            console.log('Room reset. Start scanning again.');
            showToast('Room reset. Start scanning again.');
        }
    }

    // Take a snapshot of the current room setup
    function captureRoomSnapshot() {
        // In a real app, this would capture an image of the scene
        console.log('Capturing room setup...');
        showToast('Room snapshot captured!');
        
        // Simulate taking a snapshot by showing loading indicator
        showLoading(true);
        setTimeout(() => {
            showLoading(false);
            showToast('Room capture saved!');
        }, 1000);
    }

    // Save the current room data to the server
    function saveRoomData() {
        showLoading(true);
        
        // Prepare data to be sent to the server
        const roomScanData = {
            scanId: roomData.scanId,
            timestamp: new Date().toISOString(),
            dimensions: roomData.dimensions,
            walls: roomData.walls,
            floor: roomData.floor,
            furniture: roomData.furniture
        };
        
        console.log('Saving room data:', roomScanData);
        
        // Send data to server via API
        fetch('/api/ar-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roomScanData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save room data');
            }
            return response.json();
        })
        .then(data => {
            console.log('Room data saved successfully:', data);
            showToast('Room saved successfully!');
            
            // Redirect back to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        })
        .catch(error => {
            console.error('Error saving room data:', error);
            showToast('Error saving room: ' + error.message);
        })
        .finally(() => {
            showLoading(false);
        });
    }

    // Go back to dashboard
    function goBack() {
        if (confirm('Are you sure you want to go back? Any unsaved changes will be lost.')) {
            window.location.href = '/dashboard';
        }
    }

    // Show a toast message
    function showToast(message, duration = 3000) {
        // Create toast element if it doesn't exist
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.style.position = 'fixed';
            toast.style.bottom = '100px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            toast.style.color = 'white';
            toast.style.padding = '10px 20px';
            toast.style.borderRadius = '20px';
            toast.style.zIndex = '1000';
            document.body.appendChild(toast);
        }
        
        // Hide any existing action button if present
        const existingButton = toast.querySelector('button');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Show message
        toast.textContent = message;
        toast.style.display = 'block';
        
        // Hide after specified duration
        clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
    }
    
    // Show a toast with an action button
    function showActionToast(message, actionText, actionHandler, duration = 5000) {
        // Create or get toast element
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.style.position = 'fixed';
            toast.style.bottom = '100px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            toast.style.color = 'white';
            toast.style.padding = '10px 20px';
            toast.style.borderRadius = '20px';
            toast.style.zIndex = '1000';
            toast.style.display = 'flex';
            toast.style.alignItems = 'center';
            toast.style.gap = '10px';
            document.body.appendChild(toast);
        }
        
        // Clear existing content
        toast.innerHTML = '';
        
        // Add message
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        toast.appendChild(messageSpan);
        
        // Add action button
        const actionButton = document.createElement('button');
        actionButton.textContent = actionText;
        actionButton.style.backgroundColor = 'var(--primary-color)';
        actionButton.style.color = 'var(--dark-color)';
        actionButton.style.border = 'none';
        actionButton.style.padding = '5px 10px';
        actionButton.style.borderRadius = '10px';
        actionButton.style.marginLeft = '10px';
        actionButton.style.cursor = 'pointer';
        actionButton.addEventListener('click', () => {
            actionHandler();
            toast.style.display = 'none';
        });
        toast.appendChild(actionButton);
        
        // Show toast
        toast.style.display = 'flex';
        
        // Hide after specified duration
        clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
    }

    // Show/hide loading spinner
    function showLoading(show) {
        loadingElement.classList.toggle('hidden', !show);
    }

    // Generate a unique ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    // Debounce function to limit how often a function is called
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Initialize the app
    init();
});