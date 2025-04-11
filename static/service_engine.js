/**
 * GlassRain Service Provider Intelligence Engine
 * 
 * This module handles contractor aggregation, service tier logic, and intelligent matching
 * for the GlassRain platform.
 */

// Service Categories with Subcategories
const SERVICE_CATEGORIES = {
    "plumbing": {
        name: "Plumbing",
        icon: "🚿",
        subcategories: [
            { id: "drain_cleaning", name: "Drain Cleaning", description: "Professional clearing of clogged drains" },
            { id: "faucet_replacement", name: "Faucet Replacement", description: "Installation of new faucets or repair of existing ones" },
            { id: "emergency_repair", name: "Emergency Repair", description: "Urgent plumbing issues like leaks or flooding" },
            { id: "repipe_projects", name: "Repipe Projects", description: "Complete replacement of plumbing pipes" },
            { id: "water_heater", name: "Water Heater Service", description: "Installation, repair or maintenance of water heaters" }
        ]
    },
    "lawn_care": {
        name: "Lawn Care",
        icon: "🌱",
        subcategories: [
            { id: "lawn_mowing", name: "Lawn Mowing", description: "Regular cutting of grass and lawn maintenance" },
            { id: "fertilization", name: "Fertilization", description: "Application of fertilizers for healthier lawn growth" },
            { id: "weed_control", name: "Weed Control", description: "Treatment to prevent and eliminate weeds" },
            { id: "landscaping", name: "Landscaping", description: "Design and installation of landscaping features" },
            { id: "irrigation", name: "Irrigation Systems", description: "Installation and maintenance of watering systems" }
        ]
    },
    "hvac": {
        name: "HVAC",
        icon: "❄️",
        subcategories: [
            { id: "maintenance", name: "Regular Maintenance", description: "Seasonal tune-ups and inspections" },
            { id: "repair", name: "Repair Service", description: "Fixing malfunctioning heating or cooling systems" },
            { id: "installation", name: "New Installation", description: "Installing new HVAC systems" },
            { id: "air_quality", name: "Air Quality Improvement", description: "Air duct cleaning and filter replacements" },
            { id: "energy_efficiency", name: "Energy Efficiency Upgrades", description: "Improvements to reduce energy consumption" }
        ]
    },
    "roofing": {
        name: "Roofing",
        icon: "🏠",
        subcategories: [
            { id: "inspection", name: "Roof Inspection", description: "Professional assessment of roof condition" },
            { id: "repair", name: "Roof Repair", description: "Fixing leaks and damaged areas" },
            { id: "replacement", name: "Roof Replacement", description: "Complete removal and installation of new roof" },
            { id: "gutter", name: "Gutter Service", description: "Cleaning and repair of gutters and downspouts" },
            { id: "maintenance", name: "Preventative Maintenance", description: "Regular upkeep to extend roof lifespan" }
        ]
    },
    "cleaning": {
        name: "Cleaning Services",
        icon: "✨",
        subcategories: [
            { id: "regular", name: "Regular Cleaning", description: "Routine house cleaning services" },
            { id: "deep", name: "Deep Cleaning", description: "Thorough cleaning of entire home" },
            { id: "move", name: "Move-In/Out Cleaning", description: "Cleaning services when relocating" },
            { id: "specialty", name: "Specialty Cleaning", description: "Carpet, upholstery, or window cleaning" },
            { id: "commercial", name: "Commercial Cleaning", description: "Cleaning services for business spaces" }
        ]
    }
};

// Service Tier Definitions
const SERVICE_TIERS = {
    "silver": {
        name: "Silver",
        description: "Budget-friendly services from verified smaller providers",
        businessSize: "Solo/Small Operations",
        licenseStatus: "Verified, no LLC needed",
        minRating: 4.5,
        priceAdjustment: 0.8, // 80% of standard price
        guarantees: ["Satisfaction Guarantee", "Verified Service Provider"]
    },
    "gold": {
        name: "Gold",
        description: "Professional service from established local companies",
        businessSize: "Registered Company",
        licenseStatus: "Licensed",
        minRating: 4.6,
        minReviews: 50,
        priceAdjustment: 1.0, // Standard price
        guarantees: ["Satisfaction Guarantee", "Licensed Professionals", "Insured Work"]
    },
    "diamond": {
        name: "Diamond",
        description: "Premium service from the highest-rated contractors",
        businessSize: "Top-tier firm",
        licenseStatus: "Licensed + Insured",
        minRating: 4.9,
        minReviews: 100,
        priceAdjustment: 1.2, // 120% of standard price
        guarantees: ["Satisfaction Guarantee", "Elite Service Providers", "Extended Warranty", "Priority Scheduling", "Premium Materials"]
    }
};

/**
 * Fetches service providers based on service category, zip code, and tier
 * @param {string} serviceId - ID of the service category
 * @param {string} zipCode - User's ZIP code
 * @param {string} tier - Service tier (silver, gold, diamond)
 * @returns {Promise<Array>} - Promise resolving to array of matching contractors
 */
async function fetchServiceProviders(serviceId, zipCode, tier = 'gold') {
    try {
        // In a real implementation, this would call your backend API
        // which would then query external APIs like Google Places or Yelp
        const response = await fetch(`/api/match-service?service_id=${serviceId}&zip=${zipCode}&tier=${tier}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch service providers');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching service providers:', error);
        return [];
    }
}

/**
 * Calculates estimated price based on service, home size, region, and tier
 * @param {string} serviceId - ID of the service subcategory
 * @param {number} homeSize - Square footage of the home
 * @param {string} zipCode - User's ZIP code
 * @param {string} tier - Service tier (silver, gold, diamond)
 * @returns {Promise<Object>} - Promise resolving to price details
 */
async function calculateServicePrice(serviceId, homeSize, zipCode, tier = 'gold') {
    try {
        // In a real implementation, this would use your pricing engine API
        const response = await fetch('/api/get-estimate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service_id: serviceId,
                home_size: homeSize,
                zip_code: zipCode,
                tier: tier
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to calculate price');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error calculating service price:', error);
        
        // Fallback pricing model if API fails
        // This is just placeholder logic - real implementation would be more sophisticated
        const basePrices = {
            "plumbing": {
                "drain_cleaning": 150,
                "faucet_replacement": 200,
                "emergency_repair": 300,
                "repipe_projects": 2000,
                "water_heater": 800
            },
            "lawn_care": {
                "lawn_mowing": 50,
                "fertilization": 120,
                "weed_control": 100,
                "landscaping": 500,
                "irrigation": 800
            },
            "hvac": {
                "maintenance": 150,
                "repair": 350,
                "installation": 3000,
                "air_quality": 250,
                "energy_efficiency": 500
            },
            "roofing": {
                "inspection": 200,
                "repair": 600,
                "replacement": 8000,
                "gutter": 300,
                "maintenance": 400
            },
            "cleaning": {
                "regular": 120,
                "deep": 250,
                "move": 350,
                "specialty": 200,
                "commercial": 300
            }
        };
        
        // Parse service ID to get category and subcategory
        const [category, subcategory] = serviceId.split(':');
        
        // Get base price for the service
        let basePrice = 100; // Default fallback
        if (basePrices[category] && basePrices[category][subcategory]) {
            basePrice = basePrices[category][subcategory];
        }
        
        // Adjust price based on home size
        const sizeMultiplier = homeSize <= 1500 ? 0.8 : 
                              homeSize <= 2500 ? 1.0 : 
                              homeSize <= 4000 ? 1.4 : 1.8;
        
        // Adjust price based on tier
        const tierMultiplier = SERVICE_TIERS[tier].priceAdjustment;
        
        // Calculate final price
        const estimatedPrice = basePrice * sizeMultiplier * tierMultiplier;
        
        return {
            estimated_price: Math.round(estimatedPrice),
            price_range: {
                min: Math.round(estimatedPrice * 0.9),
                max: Math.round(estimatedPrice * 1.1)
            },
            home_size: homeSize,
            tier: tier,
            service_id: serviceId
        };
    }
}

/**
 * Submits a service quote request
 * @param {Object} quoteData - Quote request details
 * @returns {Promise<Object>} - Promise resolving to quote request response
 */
async function requestServiceQuote(quoteData) {
    try {
        const response = await fetch('/api/request-quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quoteData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit quote request');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error requesting service quote:', error);
        throw error;
    }
}

/**
 * Gets all services with their categories and subcategories
 * @returns {Promise<Array>} - Promise resolving to service categories
 */
async function getServiceCategories() {
    try {
        // In a production environment, this would fetch from your API
        const response = await fetch('/api/services');
        
        if (!response.ok) {
            throw new Error('Failed to fetch service categories');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching service categories:', error);
        
        // Return local fallback data if API fails
        return Object.keys(SERVICE_CATEGORIES).map(key => {
            return {
                id: key,
                name: SERVICE_CATEGORIES[key].name,
                icon: SERVICE_CATEGORIES[key].icon,
                subcategories: SERVICE_CATEGORIES[key].subcategories
            };
        });
    }
}

// Export functions for use in other modules
window.ServiceEngine = {
    getServiceCategories,
    fetchServiceProviders,
    calculateServicePrice,
    requestServiceQuote,
    SERVICE_TIERS
};