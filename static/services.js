/**
 * GlassRain Service Finder
 * Provides comprehensive service search, category navigation, tier selection,
 * contractor matching, and quote request functionality
 */

// Define ServiceFinder as a namespace
const ServiceFinder = (function() {
    // Global state for service selection workflow
    const serviceState = {
        selectedCategory: null,
        selectedService: null,
        selectedTier: null,
        selectedContractor: null,
        customMessage: '',
        propertySize: 0,
        pricingEstimate: 0
    };

    // DOM elements
    let categoryContainer;
    let serviceContainer;
    let tierContainer;
    let contractorContainer;
    let quoteFormContainer;
    let confirmationContainer;
    let stepIndicators;
    let navigationButtons;
    let customMessageInput;

    /**
     * Initialize the service finder interface
     */
    function init() {
        console.log('Initializing GlassRain Service Finder...');
        
        // Get DOM elements
        categoryContainer = document.getElementById('service-categories');
        serviceContainer = document.getElementById('service-list');
        tierContainer = document.getElementById('tier-selection');
        contractorContainer = document.getElementById('contractor-list');
        quoteFormContainer = document.getElementById('quote-form');
        confirmationContainer = document.getElementById('confirmation');
        stepIndicators = document.querySelectorAll('.step-indicator');
        navigationButtons = document.querySelector('.navigation-buttons');
        
        // Check if we have all required elements
        if (!categoryContainer) {
            console.error('Service category container not found');
            return;
        }
        
        // Load service categories from API
        loadServiceCategories();
        
        // Set up event handlers for navigation buttons
        setupNavigationButtons();
        
        // Show the first step (categories)
        showStep(1);
    }

/**
 * Load service categories from the API
 */
function loadServiceCategories() {
    // Show loading indicator
    categoryContainer.innerHTML = '<div class="loading-spinner">Loading categories...</div>';
    
    // Fetch categories from API
    fetch('/api/services')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load service categories');
            }
            return response.json();
        })
        .then(categories => {
            renderCategories(categories);
        })
        .catch(error => {
            console.error('Error loading service categories:', error);
            categoryContainer.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load service categories</h3>
                    <p>${error.message}</p>
                    <button onclick="ServiceFinder.loadServiceCategories()">Try Again</button>
                </div>
            `;
        });
}

/**
 * Render the service categories as circular buttons
 * @param {Array} categories - List of service categories from API
 */
function renderCategories(categories) {
    if (!categories || categories.length === 0) {
        categoryContainer.innerHTML = '<p class="empty-state">No service categories available.</p>';
        return;
    }
    
    // Clear the container
    categoryContainer.innerHTML = '';
    
    // Create a category grid
    const categoryGrid = document.createElement('div');
    categoryGrid.className = 'category-grid';
    
    // Add each category as a circular button
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.dataset.categoryId = category.id;
        
        // Format the category icon
        const iconClass = category.icon || 'fa-hammer';
        
        categoryItem.innerHTML = `
            <div class="category-circle">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="category-name">${category.name}</div>
            <div class="category-count">${category.service_count} services</div>
        `;
        
        // Add click handler to select this category
        categoryItem.addEventListener('click', () => {
            selectCategory(category);
        });
        
        categoryGrid.appendChild(categoryItem);
    });
    
    categoryContainer.appendChild(categoryGrid);
}

/**
 * Select a category and load its services
 * @param {Object} category - The selected category
 */
function selectCategory(category) {
    // Update global state
    serviceState.selectedCategory = category;
    
    // Highlight selected category
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        if (parseInt(item.dataset.categoryId) === category.id) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    
    // Load services for this category
    loadServices(category.id);
    
    // Show the next step
    showStep(2);
}

/**
 * Load services for a specific category
 * @param {number} categoryId - ID of the selected category
 */
function loadServices(categoryId) {
    // Show loading indicator
    serviceContainer.innerHTML = '<div class="loading-spinner">Loading services...</div>';
    
    // Fetch services from API
    fetch(`/api/services?category_id=${categoryId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load services');
            }
            return response.json();
        })
        .then(services => {
            renderServices(services);
        })
        .catch(error => {
            console.error('Error loading services:', error);
            serviceContainer.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load services</h3>
                    <p>${error.message}</p>
                    <button onclick="ServiceFinder.loadServices(${categoryId})">Try Again</button>
                </div>
            `;
        });
}

/**
 * Render the services list for a category
 * @param {Array} services - List of services for the selected category
 */
function renderServices(services) {
    if (!services || services.length === 0) {
        serviceContainer.innerHTML = '<p class="empty-state">No services available in this category.</p>';
        return;
    }
    
    // Clear the container
    serviceContainer.innerHTML = '';
    
    // Create a service list
    const serviceList = document.createElement('div');
    serviceList.className = 'service-list';
    
    // Add each service as a card
    services.forEach(service => {
        const serviceItem = document.createElement('div');
        serviceItem.className = 'service-item';
        serviceItem.dataset.serviceId = service.id;
        
        serviceItem.innerHTML = `
            <h3 class="service-name">${service.name}</h3>
            <p class="service-description">${service.description || 'No description available.'}</p>
            <div class="service-meta">
                <span class="price-range">${service.price_range}</span>
                <span class="provider-count">${service.providers} providers</span>
            </div>
        `;
        
        // Add click handler to select this service
        serviceItem.addEventListener('click', () => {
            selectService(service);
        });
        
        serviceList.appendChild(serviceItem);
    });
    
    // Add a back button
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = 'Back to Categories';
    backButton.addEventListener('click', () => {
        showStep(1);
    });
    
    serviceContainer.appendChild(serviceList);
    serviceContainer.appendChild(backButton);
}

/**
 * Select a service and proceed to tier selection
 * @param {Object} service - The selected service
 */
function selectService(service) {
    // Update global state
    serviceState.selectedService = service;
    
    // Highlight selected service
    const serviceItems = document.querySelectorAll('.service-item');
    serviceItems.forEach(item => {
        if (parseInt(item.dataset.serviceId) === service.id) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    
    // Load service tiers
    loadServiceTiers();
    
    // Load property size for estimate calculation
    loadPropertySize();
    
    // Show the next step
    showStep(3);
}

/**
 * Load service tiers from the API
 */
function loadServiceTiers() {
    // Show loading indicator
    tierContainer.innerHTML = '<div class="loading-spinner">Loading service tiers...</div>';
    
    // Fetch tiers from API
    fetch('/api/tiers')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load service tiers');
            }
            return response.json();
        })
        .then(tiers => {
            renderTiers(tiers);
        })
        .catch(error => {
            console.error('Error loading service tiers:', error);
            tierContainer.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load service tiers</h3>
                    <p>${error.message}</p>
                    <button onclick="ServiceFinder.loadServiceTiers()">Try Again</button>
                </div>
            `;
        });
}

/**
 * Load property size for price estimates
 */
function loadPropertySize() {
    // In a real app, we would get this from the user's profile or ask them
    // For now, we'll use a placeholder value
    serviceState.propertySize = 2500; // square feet
}

/**
 * Render the service tier selection options
 * @param {Array} tiers - List of service tiers from API
 */
function renderTiers(tiers) {
    if (!tiers || tiers.length === 0) {
        tierContainer.innerHTML = '<p class="empty-state">No service tiers available.</p>';
        return;
    }
    
    // Clear the container
    tierContainer.innerHTML = '';
    
    // Create heading
    const heading = document.createElement('h2');
    heading.textContent = 'Select Service Tier';
    tierContainer.appendChild(heading);
    
    // Create description
    const description = document.createElement('p');
    description.className = 'tier-description';
    description.textContent = 'Choose a service tier based on your needs and budget.';
    tierContainer.appendChild(description);
    
    // Create tier comparison table
    const tierTable = document.createElement('div');
    tierTable.className = 'tier-table';
    
    // Add each tier as a column
    tiers.forEach(tier => {
        const tierColumn = document.createElement('div');
        tierColumn.className = `tier-column tier-${tier.name.toLowerCase()}`;
        tierColumn.dataset.tierId = tier.id;
        
        // Calculate estimated price based on the service and tier
        const basePrice = calculateBasePrice(tier);
        
        tierColumn.innerHTML = `
            <div class="tier-header">
                <h3 class="tier-name">${tier.name}</h3>
                <div class="tier-price">
                    <span class="estimate">${formatCurrency(basePrice)}</span>
                    <span class="estimate-note">estimated for your home</span>
                </div>
            </div>
            <div class="tier-features">
                <ul>
                    ${renderTierFeatures(tier)}
                </ul>
            </div>
            <button class="select-tier-button">Select ${tier.name}</button>
        `;
        
        // Add click handler to select this tier
        tierColumn.querySelector('.select-tier-button').addEventListener('click', () => {
            selectTier(tier, basePrice);
        });
        
        tierTable.appendChild(tierColumn);
    });
    
    tierContainer.appendChild(tierTable);
    
    // Add a back button
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = 'Back to Services';
    backButton.addEventListener('click', () => {
        showStep(2);
    });
    
    tierContainer.appendChild(backButton);
}

/**
 * Render features list for a service tier
 * @param {Object} tier - Service tier object
 * @returns {string} HTML string of tier features
 */
function renderTierFeatures(tier) {
    // Define features based on tier level
    let features = [];
    
    switch(tier.name.toLowerCase()) {
        case 'silver':
            features = [
                'Basic service package',
                'Standard quality materials',
                'Availability within 1-2 weeks',
                '30-day satisfaction guarantee'
            ];
            break;
        case 'gold':
            features = [
                'Enhanced service package',
                'Premium quality materials',
                'Priority scheduling (3-5 days)',
                '90-day satisfaction guarantee',
                'Follow-up inspection'
            ];
            break;
        case 'diamond':
            features = [
                'Comprehensive service package',
                'Highest quality materials',
                'Immediate scheduling (24-48 hours)',
                '1-year satisfaction guarantee',
                'Multiple follow-up inspections',
                'Extended warranty options',
                'Dedicated project manager'
            ];
            break;
        default:
            features = ['Standard features'];
    }
    
    return features.map(feature => `<li>${feature}</li>`).join('');
}

/**
 * Calculate the estimated price based on service and tier
 * @param {Object} tier - The selected service tier
 * @returns {number} Estimated price
 */
function calculateBasePrice(tier) {
    const service = serviceState.selectedService;
    const propertySize = serviceState.propertySize;
    
    // Default value if calculation fails
    let basePrice = 0;
    
    try {
        if (service.unit === 'sqft') {
            // For square foot based pricing
            const pricePerSqft = parseFloat(service.price_range.match(/\$([0-9.]+)\/sqft/)[1]);
            const minPrice = parseFloat(service.price_range.match(/min \$([0-9]+)/)[1]);
            
            // Calculate based on property size
            basePrice = pricePerSqft * propertySize * tier.multiplier;
            
            // Apply minimum price if calculated price is lower
            if (basePrice < minPrice) {
                basePrice = minPrice * tier.multiplier;
            }
        } else {
            // For flat rate pricing
            basePrice = parseFloat(service.price_range.replace('$', '')) * tier.multiplier;
        }
    } catch (error) {
        console.error('Error calculating price:', error);
        // Fallback pricing
        basePrice = tier.name === 'Silver' ? 100 : 
                   tier.name === 'Gold' ? 150 : 
                   tier.name === 'Diamond' ? 200 : 100;
    }
    
    return basePrice;
}

/**
 * Format a number as currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Select a service tier and load matching contractors
 * @param {Object} tier - The selected tier
 * @param {number} price - The estimated price
 */
function selectTier(tier, price) {
    // Update global state
    serviceState.selectedTier = tier;
    serviceState.pricingEstimate = price;
    
    // Highlight selected tier
    const tierColumns = document.querySelectorAll('.tier-column');
    tierColumns.forEach(column => {
        if (parseInt(column.dataset.tierId) === tier.id) {
            column.classList.add('selected');
        } else {
            column.classList.remove('selected');
        }
    });
    
    // Load matching contractors for this service and tier
    loadMatchingContractors();
    
    // Show the next step
    showStep(4);
}

/**
 * Load contractors that match the selected service and tier
 */
function loadMatchingContractors() {
    // Show loading indicator
    contractorContainer.innerHTML = '<div class="loading-spinner">Finding the best contractors...</div>';
    
    // Fetch matching contractors from API
    fetch(`/api/match-service?service_id=${serviceState.selectedService.id}&tier_id=${serviceState.selectedTier.id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to find matching contractors');
            }
            return response.json();
        })
        .then(contractors => {
            renderContractors(contractors);
        })
        .catch(error => {
            console.error('Error loading contractors:', error);
            contractorContainer.innerHTML = `
                <div class="error-message">
                    <h3>Unable to find matching contractors</h3>
                    <p>${error.message}</p>
                    <button onclick="ServiceFinder.loadMatchingContractors()">Try Again</button>
                </div>
            `;
        });
}

/**
 * Render the matching contractors list
 * @param {Array} contractors - List of matching contractors from API
 */
function renderContractors(contractors) {
    if (!contractors || contractors.length === 0) {
        contractorContainer.innerHTML = '<p class="empty-state">No matching contractors available for this service and tier.</p>';
        
        // Add a back button
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.textContent = 'Back to Tier Selection';
        backButton.addEventListener('click', () => {
            showStep(3);
        });
        
        contractorContainer.appendChild(backButton);
        return;
    }
    
    // Clear the container
    contractorContainer.innerHTML = '';
    
    // Create heading
    const heading = document.createElement('h2');
    heading.textContent = 'Select a Contractor';
    contractorContainer.appendChild(heading);
    
    // Create contractor cards container
    const contractorList = document.createElement('div');
    contractorList.className = 'contractor-list';
    
    // Add each contractor as a card
    contractors.forEach(contractor => {
        const contractorItem = document.createElement('div');
        contractorItem.className = 'contractor-item';
        contractorItem.dataset.contractorId = contractor.id;
        
        contractorItem.innerHTML = `
            <div class="contractor-info">
                <h3 class="contractor-name">${contractor.business_name}</h3>
                <div class="contractor-meta">
                    <span class="years-in-business">${contractor.years_in_business} years in business</span>
                    <span class="rating">${getStarRating(contractor.rating)}</span>
                </div>
                <p class="contractor-description">${contractor.description || 'Professional contractor serving your area.'}</p>
                <ul class="contractor-badges">
                    ${contractor.license_verified ? '<li class="badge license-verified">License Verified</li>' : ''}
                    ${contractor.insurance_verified ? '<li class="badge insurance-verified">Insurance Verified</li>' : ''}
                    ${contractor.background_checked ? '<li class="badge background-checked">Background Checked</li>' : ''}
                </ul>
            </div>
            <button class="select-contractor-button">Choose Contractor</button>
        `;
        
        // Add click handler to select this contractor
        contractorItem.querySelector('.select-contractor-button').addEventListener('click', () => {
            selectContractor(contractor);
        });
        
        contractorList.appendChild(contractorItem);
    });
    
    contractorContainer.appendChild(contractorList);
    
    // Add a back button
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = 'Back to Tier Selection';
    backButton.addEventListener('click', () => {
        showStep(3);
    });
    
    contractorContainer.appendChild(backButton);
}

/**
 * Generate star rating HTML
 * @param {number} rating - Rating value (0-5)
 * @returns {string} HTML string with star icons
 */
function getStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHtml = '';
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star"></i>';
    }
    
    // Add half star if needed
    if (halfStar) {
        starsHtml += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="far fa-star"></i>';
    }
    
    return `<div class="star-rating">${starsHtml} <span class="rating-value">${rating.toFixed(1)}</span></div>`;
}

/**
 * Select a contractor and proceed to the quote form
 * @param {Object} contractor - The selected contractor
 */
function selectContractor(contractor) {
    // Update global state
    serviceState.selectedContractor = contractor;
    
    // Highlight selected contractor
    const contractorItems = document.querySelectorAll('.contractor-item');
    contractorItems.forEach(item => {
        if (parseInt(item.dataset.contractorId) === contractor.id) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    
    // Show the quote form
    renderQuoteForm();
    
    // Show the next step
    showStep(5);
}

/**
 * Render the quote request form
 */
function renderQuoteForm() {
    // Clear the container
    quoteFormContainer.innerHTML = '';
    
    // Create a summary of selections
    const selectionSummary = document.createElement('div');
    selectionSummary.className = 'selection-summary';
    
    selectionSummary.innerHTML = `
        <h2>Request a Quote</h2>
        <div class="summary-item">
            <span class="summary-label">Service:</span>
            <span class="summary-value">${serviceState.selectedService.name}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Tier:</span>
            <span class="summary-value">${serviceState.selectedTier.name}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Contractor:</span>
            <span class="summary-value">${serviceState.selectedContractor.business_name}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Estimated Price:</span>
            <span class="summary-value">${formatCurrency(serviceState.pricingEstimate)}</span>
        </div>
    `;
    
    quoteFormContainer.appendChild(selectionSummary);
    
    // Create the form
    const quoteForm = document.createElement('form');
    quoteForm.id = 'service-quote-form';
    quoteForm.className = 'quote-form';
    
    // Add form fields
    quoteForm.innerHTML = `
        <div class="form-group">
            <label for="preferred-date">Preferred Date:</label>
            <input type="date" id="preferred-date" name="preferred_date" required>
        </div>
        <div class="form-group">
            <label for="preferred-time">Preferred Time:</label>
            <select id="preferred-time" name="preferred_time" required>
                <option value="">Select a time</option>
                <option value="morning">Morning (8am - 12pm)</option>
                <option value="afternoon">Afternoon (12pm - 4pm)</option>
                <option value="evening">Evening (4pm - 8pm)</option>
            </select>
        </div>
        <div class="form-group">
            <label for="custom-message">Custom Message to Contractor (Optional):</label>
            <textarea id="custom-message" name="custom_message" rows="4" placeholder="Include any specific details or requirements for your service request..."></textarea>
        </div>
        <div class="form-actions">
            <button type="button" class="back-button" onclick="ServiceFinder.showStep(4)">Back</button>
            <button type="submit" class="submit-button">Request Quote</button>
        </div>
    `;
    
    // Add form submission handler
    quoteForm.addEventListener('submit', function(event) {
        event.preventDefault();
        ServiceFinder.submitQuoteRequest();
    });
    
    quoteFormContainer.appendChild(quoteForm);
    
    // Save reference to custom message input
    customMessageInput = document.getElementById('custom-message');
}

/**
 * Submit the quote request to the API
 */
function submitQuoteRequest() {
    // Get form values
    const preferredDate = document.getElementById('preferred-date').value;
    const preferredTime = document.getElementById('preferred-time').value;
    const customMessage = document.getElementById('custom-message').value;
    
    // Update global state with custom message
    serviceState.customMessage = customMessage;
    
    // Prepare request data
    const quoteRequest = {
        service_id: serviceState.selectedService.id,
        tier_id: serviceState.selectedTier.id,
        contractor_id: serviceState.selectedContractor.id,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        custom_message: customMessage,
        price_estimate: serviceState.pricingEstimate
    };
    
    // Show loading indicator
    quoteFormContainer.innerHTML = '<div class="loading-spinner">Submitting quote request...</div>';
    
    // Submit request to API
    fetch('/api/request-quote', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(quoteRequest)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to submit quote request');
            }
            return response.json();
        })
        .then(result => {
            showConfirmation(result);
        })
        .catch(error => {
            console.error('Error submitting quote request:', error);
            quoteFormContainer.innerHTML = `
                <div class="error-message">
                    <h3>Unable to submit quote request</h3>
                    <p>${error.message}</p>
                    <button onclick="ServiceFinder.renderQuoteForm()">Try Again</button>
                </div>
            `;
        });
}

/**
 * Show confirmation message after successful quote request
 * @param {Object} result - API response data
 */
function showConfirmation(result) {
    // Clear the container
    confirmationContainer.innerHTML = '';
    
    // Create confirmation message
    const confirmationMessage = document.createElement('div');
    confirmationMessage.className = 'confirmation-message';
    
    confirmationMessage.innerHTML = `
        <div class="success-icon">
            <i class="fas fa-check-circle"></i>
        </div>
        <h2>Quote Request Sent!</h2>
        <p>Your request has been sent to ${serviceState.selectedContractor.business_name}.</p>
        <p>You will receive an email confirmation with details about your request.</p>
        <p>Quote ID: <strong>${result.quote_id || 'Unknown'}</strong></p>
        
        <div class="confirmation-details">
            <h3>Request Summary</h3>
            <div class="summary-item">
                <span class="summary-label">Service:</span>
                <span class="summary-value">${serviceState.selectedService.name}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Tier:</span>
                <span class="summary-value">${serviceState.selectedTier.name}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Contractor:</span>
                <span class="summary-value">${serviceState.selectedContractor.business_name}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Estimated Price:</span>
                <span class="summary-value">${ServiceFinder.formatCurrency ? ServiceFinder.formatCurrency(serviceState.pricingEstimate) : "$" + serviceState.pricingEstimate.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="next-steps">
            <h3>What Happens Next?</h3>
            <ol>
                <li>The contractor will review your request.</li>
                <li>You'll receive a detailed quote within 24-48 hours.</li>
                <li>Once you approve, the service will be scheduled.</li>
            </ol>
        </div>
        
        <button class="start-over-button" onclick="ServiceFinder.resetServiceFinder()">Find Another Service</button>
    `;
    
    confirmationContainer.appendChild(confirmationMessage);
    
    // Show the confirmation step
    ServiceFinder.showStep(6);
}

/**
 * Reset the service finder to start a new request
 */
function resetServiceFinder() {
    // Reset global state
    serviceState.selectedCategory = null;
    serviceState.selectedService = null;
    serviceState.selectedTier = null;
    serviceState.selectedContractor = null;
    serviceState.customMessage = '';
    serviceState.pricingEstimate = 0;
    
    // Clear all containers
    categoryContainer.innerHTML = '';
    serviceContainer.innerHTML = '';
    tierContainer.innerHTML = '';
    contractorContainer.innerHTML = '';
    quoteFormContainer.innerHTML = '';
    confirmationContainer.innerHTML = '';
    
    // Load service categories again
    ServiceFinder.loadServiceCategories();
    
    // Show the first step
    ServiceFinder.showStep(1);
}

/**
 * Show a specific step in the service selection workflow
 * @param {number} stepNumber - Step number to show (1-6)
 */
function showStep(stepNumber) {
    // Hide all step containers
    document.querySelectorAll('.step-container').forEach(container => {
        container.style.display = 'none';
    });
    
    // Show the selected step container
    const stepToShow = document.getElementById(`step-${stepNumber}`);
    if (stepToShow) {
        stepToShow.style.display = 'block';
    }
    
    // Update step indicators
    updateStepIndicators(stepNumber);
    
    // Update navigation buttons
    updateNavigationButtons(stepNumber);
    
    // Scroll to top of the step
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Update the step indicators to show progress
 * @param {number} currentStep - Current step number
 */
function updateStepIndicators(currentStep) {
    stepIndicators.forEach((indicator, index) => {
        // Step numbers are 1-based, but array is 0-based
        const stepNum = index + 1;
        
        if (stepNum < currentStep) {
            // Previous steps
            indicator.className = 'step-indicator completed';
        } else if (stepNum === currentStep) {
            // Current step
            indicator.className = 'step-indicator active';
        } else {
            // Future steps
            indicator.className = 'step-indicator';
        }
    });
}

/**
 * Update navigation buttons based on current step
 * @param {number} currentStep - Current step number
 */
function updateNavigationButtons(currentStep) {
    // Show/hide back button
    const backButton = document.querySelector('.nav-back');
    if (backButton) {
        if (currentStep > 1 && currentStep < 6) {
            backButton.style.display = 'inline-block';
            backButton.onclick = () => ServiceFinder.showStep(currentStep - 1);
        } else {
            backButton.style.display = 'none';
        }
    }
    
    // Show/hide next button
    const nextButton = document.querySelector('.nav-next');
    if (nextButton) {
        if (currentStep < 5) {
            nextButton.style.display = 'inline-block';
            nextButton.disabled = !canAdvanceToNextStep(currentStep);
            nextButton.onclick = () => {
                if (canAdvanceToNextStep(currentStep)) {
                    ServiceFinder.showStep(currentStep + 1);
                }
            };
        } else {
            nextButton.style.display = 'none';
        }
    }
}

/**
 * Check if user can advance to the next step
 * @param {number} currentStep - Current step number
 * @returns {boolean} Whether user can advance
 */
function canAdvanceToNextStep(currentStep) {
    switch (currentStep) {
        case 1:
            return serviceState.selectedCategory !== null;
        case 2:
            return serviceState.selectedService !== null;
        case 3:
            return serviceState.selectedTier !== null;
        case 4:
            return serviceState.selectedContractor !== null;
        default:
            return false;
    }
}

/**
 * Set up event handlers for navigation buttons
 */
function setupNavigationButtons() {
    if (!navigationButtons) return;
    
    // Create back button
    const backButton = document.createElement('button');
    backButton.className = 'nav-back';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
    backButton.style.display = 'none';
    
    // Create next button
    const nextButton = document.createElement('button');
    nextButton.className = 'nav-next';
    nextButton.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
    nextButton.disabled = true;
    
    // Add buttons to navigation container
    navigationButtons.appendChild(backButton);
    navigationButtons.appendChild(nextButton);
}

// Initialize service finder when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the services tab
    if (document.getElementById('service-finder')) {
        init();
    }
});

    // Return the public API
    return {
        init,
        loadServiceCategories,
        loadServices,
        selectCategory,
        selectService,
        selectTier,
        selectContractor,
        submitQuoteRequest,
        resetServiceFinder,
        renderQuoteForm,
        showStep,
        formatCurrency
    };
})();

// Initialize on document load for backwards compatibility
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('service-finder')) {
        ServiceFinder.init();
    }
});