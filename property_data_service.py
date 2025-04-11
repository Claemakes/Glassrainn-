"""
Property Data Service

This module provides functions to scrape and retrieve property data from various sources like Zillow, Redfin, etc.
It uses a combination of direct API access (where available) and web scraping to get comprehensive property information.
"""

import os
import json
import logging
import requests
from bs4 import BeautifulSoup
import re
import time
from urllib.parse import quote
import psycopg2
from psycopg2.extras import RealDictCursor

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    """Get a connection to the PostgreSQL database"""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        logger.error("DATABASE_URL environment variable not set")
        return None
    
    try:
        conn = psycopg2.connect(db_url)
        return conn
    except Exception as e:
        logger.error(f"Error connecting to database: {str(e)}")
        return None

def format_address_for_zillow(address):
    """Format address for Zillow search"""
    # Clean up the address to make it suitable for a URL
    # Remove apt numbers and other details that might confuse the search
    address = re.sub(r'(#|Apt|Unit|Suite)\s*\w+', '', address, flags=re.IGNORECASE)
    address = address.strip().replace(' ', '-')
    return quote(address)

def scrape_zillow_property_data(address, zip_code=None):
    """
    Scrape property data from Zillow
    
    Parameters:
    address (str): The property address
    zip_code (str, optional): ZIP code to improve search accuracy
    
    Returns:
    dict: Property data including value, year built, square footage, etc.
    """
    logger.info(f"Scraping Zillow data for: {address}")
    
    # Format the address for Zillow's URL structure
    formatted_address = format_address_for_zillow(address)
    
    # Add ZIP code if provided
    if zip_code:
        search_term = f"{formatted_address}-{zip_code}"
    else:
        search_term = formatted_address
        
    # Zillow requires specific headers to avoid being blocked
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    try:
        # Attempt to search for the property on Zillow
        url = f"https://www.zillow.com/homes/{search_term}_rb/"
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            logger.error(f"Failed to retrieve Zillow data: Status {response.status_code}")
            return None
        
        # Parse the HTML content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract the data from the page
        property_data = {
            'source': 'zillow',
            'address': address
        }
        
        # Look for the property value (Zestimate)
        value_element = soup.select_one('[data-testid="home-details-chip-container"] span')
        if value_element:
            value_text = value_element.text.strip()
            # Extract numeric value from formats like "$650,000"
            value_match = re.search(r'\$([0-9,]+)', value_text)
            if value_match:
                property_data['estimated_value'] = value_match.group(1).replace(',', '')
        
        # Extract other property details
        details = soup.select('.ds-home-fact-list li')
        for detail in details:
            text = detail.text.strip().lower()
            
            # Year built
            if 'year built' in text:
                year_match = re.search(r'year built:?\s*(\d{4})', text, re.IGNORECASE)
                if year_match:
                    property_data['year_built'] = year_match.group(1)
            
            # Square footage
            elif 'square feet' in text or 'sqft' in text:
                sqft_match = re.search(r'([\d,]+)\s*sq\s*ft', text, re.IGNORECASE)
                if sqft_match:
                    property_data['square_feet'] = sqft_match.group(1).replace(',', '')
            
            # Bedrooms
            elif 'bed' in text:
                bed_match = re.search(r'(\d+)\s*bed', text, re.IGNORECASE)
                if bed_match:
                    property_data['bedrooms'] = bed_match.group(1)
            
            # Bathrooms
            elif 'bath' in text:
                bath_match = re.search(r'(\d+(?:\.\d+)?)\s*bath', text, re.IGNORECASE)
                if bath_match:
                    property_data['bathrooms'] = bath_match.group(1)
        
        # If we didn't find the data in the expected place, try to extract it from the JSON-LD script
        if not property_data.get('estimated_value'):
            scripts = soup.select('script[type="application/ld+json"]')
            for script in scripts:
                try:
                    if script.string:  # Check if string attribute exists and is not None
                        data = json.loads(script.string)
                        if isinstance(data, dict) and data.get('@type') == 'SingleFamilyResidence':
                            floor_size = data.get('floorSize')
                            if isinstance(floor_size, dict) and floor_size.get('value'):
                                property_data['square_feet'] = floor_size.get('value')
                            if data.get('numberOfRooms'):
                                property_data['bedrooms'] = data.get('numberOfRooms')
                            # Add more field extractions as needed
                except Exception as e:
                    logger.warning(f"Error parsing JSON-LD: {str(e)}")
        
        logger.info(f"Successfully scraped Zillow data: {property_data}")
        return property_data
        
    except Exception as e:
        logger.error(f"Error scraping Zillow: {str(e)}")
        return None

def scrape_redfin_property_data(address):
    """
    Scrape property data from Redfin
    
    Parameters:
    address (str): The property address
    
    Returns:
    dict: Property data including value, year built, square footage, etc.
    """
    # Implementation similar to Zillow scraper but for Redfin
    # This is a placeholder - would need similar header configurations and parsing
    return None

def get_property_age_group(year_built):
    """Determine the property age group based on construction year"""
    current_year = 2025  # Use a fixed current year for consistent calculations
    
    if not year_built:
        return "unknown"
    
    age = current_year - int(year_built)
    
    if age < 5:
        return "new_construction"
    elif age < 20:
        return "modern"
    elif age < 50:
        return "established"
    elif age < 100:
        return "historic"
    else:
        return "antique"

def calculate_energy_score(property_data):
    """
    Calculate an estimated energy efficiency score for the property
    
    This comprehensive model evaluates multiple factors affecting energy efficiency:
    - Age of the home (newer homes tend to be more efficient)
    - Size (larger homes use more energy, affecting efficiency)
    - Geographic location (climate zone, weather patterns)
    - Solar exposure (calculated from latitude, longitude, and orientation)
    - Weather patterns (temperature extremes, precipitation)
    
    Returns:
    int: An energy score from 0-100, with higher being more efficient
    """
    base_score = 50  # Start with a neutral score
    
    # Factor: Age of property
    if 'year_built' in property_data and property_data['year_built']:
        year_built = int(property_data['year_built'])
        current_year = 2025
        age = current_year - year_built
        
        # Newer homes get better scores
        if age < 5:  # Very new construction
            base_score += 30
        elif age < 15:  # Recent construction
            base_score += 25
        elif age < 30:  # Modern
            base_score += 15
        elif age < 50:  # Middle-aged
            base_score += 5
        elif age < 70:  # Older
            base_score -= 5
        elif age < 100:  # Historic
            base_score -= 10
        else:  # Very old
            base_score -= 15
    
    # Factor: Square footage (larger homes are typically less efficient per square foot)
    if 'square_feet' in property_data and property_data['square_feet']:
        sqft = int(property_data['square_feet'].replace(',', ''))
        
        if sqft < 1000:
            base_score += 10
        elif sqft < 2000:
            base_score += 5
        elif sqft < 3000:
            base_score += 0
        elif sqft < 4000:
            base_score -= 5
        else:
            base_score -= 10
    
    # Factor: Geographic location and climate zone
    lat = None
    lng = None
    
    # Try to get location data
    if 'latitude' in property_data and 'longitude' in property_data:
        lat = property_data['latitude']
        lng = property_data['longitude']
    
    # Add location-based climate adjustments
    if lat is not None and lng is not None:
        climate_score = calculate_climate_score(lat, lng)
        solar_exposure_score = calculate_solar_exposure(lat, lng, property_data)
        weather_resilience_score = calculate_weather_resilience(lat, lng, property_data)
        
        # Add these scores to the base (with appropriate weighting)
        base_score += climate_score
        base_score += solar_exposure_score
        base_score += weather_resilience_score
    
    # If no lat/lng but we have ZIP code, use region-based adjustments
    elif 'zip_code' in property_data and property_data['zip_code']:
        # Use ZIP code to estimate climate zone
        zip_score = calculate_zip_climate_score(property_data['zip_code'])
        base_score += zip_score
    
    # Ensure the score stays in the 0-100 range
    return max(0, min(100, base_score))


def calculate_climate_score(lat, lng):
    """
    Calculate a climate-based energy score adjustment
    
    Parameters:
    lat (float): Latitude
    lng (float): Longitude
    
    Returns:
    int: Score adjustment from -10 to +10
    """
    # Climate zones by latitude (very simplified model)
    # Extreme northern/southern latitudes: Colder climates, more heating needed
    # Middle latitudes: More moderate, less energy for heating/cooling
    
    abs_lat = abs(lat)
    score = 0
    
    # Extreme northern/southern latitudes (cold climates)
    if abs_lat > 45:
        score -= 8  # Higher energy use for heating
    # Northern/southern temperate zones
    elif abs_lat > 35:
        score -= 4  # Moderate energy use for heating/cooling
    # Subtropical zones
    elif abs_lat > 23.5:
        score += 0  # Balanced energy use
    # Tropical zones
    else:
        score += 5  # Lower energy use for heating, higher for cooling
    
    # Coastal vs. continental adjustments (based on proximity to oceans)
    # Check if location is coastal (simplified)
    is_coastal = False
    
    # US West Coast
    if -125 < lng < -115 and 32 < lat < 49:
        is_coastal = True
    # US East Coast
    elif -82 < lng < -65 and 25 < lat < 47:
        is_coastal = True
    # Gulf Coast
    elif -98 < lng < -80 and 25 < lat < 31:
        is_coastal = True
    
    if is_coastal:
        score += 3  # Coastal areas typically have more moderate temperatures
    
    return score


def calculate_solar_exposure(lat, lng, property_data):
    """
    Calculate solar exposure score based on location and property characteristics
    
    Parameters:
    lat (float): Latitude
    lng (float): Longitude
    property_data (dict): Property information
    
    Returns:
    int: Score adjustment from -10 to +10
    """
    score = 0
    
    # Solar potential based on latitude
    abs_lat = abs(lat)
    
    # Calculate approximate annual sunlight hours (simplified model)
    # Higher latitudes get less direct sunlight annually
    if abs_lat < 23.5:  # Tropical
        score += 8  # High solar potential
    elif abs_lat < 35:  # Subtropical
        score += 6  # Very good solar potential
    elif abs_lat < 45:  # Temperate
        score += 3  # Moderate solar potential
    else:  # Cold/Northern
        score += 0  # Lower solar potential
    
    # Adjust for cloud cover by region (simplified)
    # Pacific Northwest (cloudy)
    if -125 < lng < -115 and 42 < lat < 49:
        score -= 5
    # Southwest (sunny)
    elif -120 < lng < -100 and 30 < lat < 42:
        score += 5
    # Southeast (mixed)
    elif -90 < lng < -75 and 25 < lat < 36:
        score += 2
    # Northeast (varied seasons)
    elif -80 < lng < -65 and 37 < lat < 47:
        score -= 2
    
    # If we have info about home orientation, factor that in
    if 'orientation' in property_data:
        orientation = property_data['orientation'].lower()
        if orientation == 'south':
            score += 5  # Optimal for northern hemisphere
        elif orientation == 'north':
            score -= 2  # Suboptimal for northern hemisphere
    
    # If we have info about window square footage, factor that in
    if 'window_sqft' in property_data:
        window_ratio = property_data['window_sqft'] / property_data['square_feet']
        if window_ratio > 0.15:
            score += 3  # More natural light
    
    return score


def calculate_weather_resilience(lat, lng, property_data):
    """
    Calculate weather resilience score based on extreme weather patterns
    
    Parameters:
    lat (float): Latitude
    lng (float): Longitude
    property_data (dict): Property information
    
    Returns:
    int: Score adjustment from -10 to +10
    """
    score = 0
    
    # Check for properties in extreme weather zones
    
    # Hurricane zones (US East/Gulf Coast)
    if (-98 < lng < -65 and 25 < lat < 40):
        score -= 5
        
        # But newer homes in these areas are built to better standards
        if 'year_built' in property_data and property_data['year_built']:
            year_built = int(property_data['year_built'])
            if year_built > 2000:
                score += 3  # Modern hurricane building codes
    
    # Tornado alley
    if (-105 < lng < -88 and 32 < lat < 42):
        score -= 4
    
    # Extreme cold regions
    if (lat > 43 and lng < -90):
        score -= 3
        
        # Newer homes have better insulation
        if 'year_built' in property_data and property_data['year_built']:
            year_built = int(property_data['year_built'])
            if year_built > 2010:
                score += 4  # Modern energy codes for cold climates
    
    # Desert/extreme heat regions (Southwest)
    if (-115 < lng < -105 and 31 < lat < 37):
        score -= 3
        
        # Newer homes have better cooling efficiency
        if 'year_built' in property_data and property_data['year_built']:
            year_built = int(property_data['year_built'])
            if year_built > 2005:
                score += 3  # Modern energy codes for hot climates
    
    return score


def calculate_zip_climate_score(zip_code):
    """
    Calculate a climate-based score adjustment based on ZIP code
    
    Parameters:
    zip_code (str): The property ZIP code
    
    Returns:
    int: Score adjustment from -10 to +10
    """
    # First digit of ZIP code gives a general region in the US
    if not zip_code or len(zip_code) < 5:
        return 0
    
    try:
        first_digit = int(zip_code[0])
        
        # Very simplified regional adjustments based on first digit of ZIP
        # 0: Northeast (mixed climate, older buildings)
        if first_digit == 0:
            return -2
        # 1: Northeast/Mid-Atlantic (cold winters, humid summers)
        elif first_digit == 1:
            return -3
        # 2: Southeast/Coastal (hot, humid)
        elif first_digit == 2:
            return -2
        # 3: Southeast/Gulf (hot, humid, storm risk)
        elif first_digit == 3:
            return -4
        # 4: Great Lakes (cold winters, humidity)
        elif first_digit == 4:
            return -3
        # 5: Midwest (temperature extremes)
        elif first_digit == 5:
            return -1
        # 6: Central (varied climate)
        elif first_digit == 6:
            return 0
        # 7: South Central (hot, storm risk)
        elif first_digit == 7:
            return -2
        # 8: Mountain/Desert (dry, temperature extremes)
        elif first_digit == 8:
            return 2
        # 9: West Coast (mild, varied by elevation)
        elif first_digit == 9:
            return 4
        else:
            return 0
    except:
        return 0

def store_property_data(property_id, property_data):
    """
    Store the property data in the database
    
    Parameters:
    property_id (int): The ID of the property record
    property_data (dict): The property data to store
    
    Returns:
    bool: True if successful, False otherwise
    """
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Check if the property_details table exists, if not create it
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS property_details (
                id SERIAL PRIMARY KEY,
                address_id INTEGER REFERENCES addresses(id),
                year_built INTEGER,
                square_feet INTEGER,
                bedrooms INTEGER,
                bathrooms NUMERIC(3,1),
                estimated_value INTEGER,
                energy_score INTEGER,
                property_age_group VARCHAR(50),
                data_source VARCHAR(50),
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Check if we already have data for this property
        cursor.execute("SELECT id FROM property_details WHERE address_id = %s", (property_id,))
        existing_record = cursor.fetchone()
        
        # Prepare the data
        year_built = int(property_data.get('year_built', 0)) if property_data.get('year_built') else None
        square_feet = int(property_data.get('square_feet', 0).replace(',', '')) if property_data.get('square_feet') else None
        bedrooms = int(property_data.get('bedrooms', 0)) if property_data.get('bedrooms') else None
        bathrooms = float(property_data.get('bathrooms', 0)) if property_data.get('bathrooms') else None
        estimated_value = int(property_data.get('estimated_value', 0)) if property_data.get('estimated_value') else None
        
        # Calculate derived fields
        energy_score = calculate_energy_score(property_data)
        property_age_group = get_property_age_group(year_built)
        
        if existing_record:
            # Update existing record
            cursor.execute("""
                UPDATE property_details SET
                    year_built = %s,
                    square_feet = %s,
                    bedrooms = %s,
                    bathrooms = %s,
                    estimated_value = %s,
                    energy_score = %s,
                    property_age_group = %s,
                    data_source = %s,
                    last_updated = CURRENT_TIMESTAMP
                WHERE address_id = %s
            """, (
                year_built, square_feet, bedrooms, bathrooms, estimated_value,
                energy_score, property_age_group, property_data.get('source', 'unknown'),
                property_id
            ))
        else:
            # Insert new record
            cursor.execute("""
                INSERT INTO property_details (
                    address_id, year_built, square_feet, bedrooms, bathrooms, 
                    estimated_value, energy_score, property_age_group, data_source
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                property_id, year_built, square_feet, bedrooms, bathrooms,
                estimated_value, energy_score, property_age_group, property_data.get('source', 'unknown')
            ))
        
        conn.commit()
        logger.info(f"Successfully stored property data for address ID {property_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error storing property data: {str(e)}")
        conn.rollback()
        return False
    
    finally:
        if conn:
            conn.close()

def get_property_data_by_address(address_id):
    """
    Get property data from the database
    
    Parameters:
    address_id (int): The address ID to look up
    
    Returns:
    dict: The property data
    """
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # First get the address details
        cursor.execute("SELECT * FROM addresses WHERE id = %s", (address_id,))
        address = cursor.fetchone()
        
        if not address:
            logger.error(f"Address not found with ID {address_id}")
            return None
        
        # Check if we already have property details
        cursor.execute("SELECT * FROM property_details WHERE address_id = %s", (address_id,))
        property_details = cursor.fetchone()
        
        # If we don't have property details yet, try to scrape them
        if not property_details:
            # Format the full address
            full_address = address.get('full_address') or f"{address.get('street')}, {address.get('city')}, {address.get('state')} {address.get('zip')}"
            
            # Try to scrape from Zillow
            property_data = scrape_zillow_property_data(full_address, address.get('zip'))
            
            # If that fails, try Redfin
            if not property_data:
                property_data = scrape_redfin_property_data(full_address)
            
            # If we got data, store it
            if property_data:
                store_property_data(address_id, property_data)
                
                # Get the stored data
                cursor.execute("SELECT * FROM property_details WHERE address_id = %s", (address_id,))
                property_details = cursor.fetchone()
        
        # Get any extended property data
        extended_data = get_extended_property_data(address_id, cursor)
        
        # Return the combined data
        if property_details:
            result = dict(address)
            result.update(property_details)
            
            # Add extended data if available
            if extended_data:
                result.update(extended_data)
                
            return result
        else:
            # Return just the address with default values
            result = dict(address)
            result.update({
                'year_built': 1980,  # Default value
                'square_feet': 2000,  # Default value
                'bedrooms': 3,  # Default value
                'estimated_value': 350000,  # Default value
                'energy_score': 50  # Default value
            })
            
            # Add extended data if available
            if extended_data:
                result.update(extended_data)
                
            return result
        
    except Exception as e:
        logger.error(f"Error retrieving property data: {str(e)}")
        return None
    
    finally:
        if conn:
            conn.close()

def get_extended_property_data(address_id, cursor=None):
    """
    Get extended property data for the Control tab
    
    Parameters:
    address_id (int): The address ID to look up
    cursor: An optional existing database cursor
    
    Returns:
    dict: The extended property data
    """
    close_conn = False
    conn = None
    
    if cursor is None:
        conn = get_db_connection()
        if not conn:
            return None
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        close_conn = True
    
    try:
        # Create an extended data dictionary
        extended_data = {}
        
        # Get any existing property permits
        try:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'property_permits'
                )
            """)
            has_permits_table = cursor.fetchone()['exists']
            
            if has_permits_table:
                cursor.execute("""
                    SELECT date, type, description, permit_number
                    FROM property_permits
                    WHERE address_id = %s
                    ORDER BY date DESC
                    LIMIT 10
                """, (address_id,))
                permits = cursor.fetchall()
                if permits and len(permits) > 0:
                    extended_data['permits'] = [dict(permit) for permit in permits]
        except Exception as e:
            logger.warning(f"Error checking for permits: {str(e)}")
            
        # Get property updates if available
        try:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'property_updates'
                )
            """)
            has_updates_table = cursor.fetchone()['exists']
            
            if has_updates_table:
                cursor.execute("""
                    SELECT date, description, type
                    FROM property_updates
                    WHERE address_id = %s
                    ORDER BY date DESC
                    LIMIT 5
                """, (address_id,))
                updates = cursor.fetchall()
                if updates and len(updates) > 0:
                    extended_data['recent_updates'] = [dict(update) for update in updates]
        except Exception as e:
            logger.warning(f"Error checking for updates: {str(e)}")
        
        # Get system information if available
        try:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'property_systems'
                )
            """)
            has_systems_table = cursor.fetchone()['exists']
            
            if has_systems_table:
                cursor.execute("""
                    SELECT name, details, installation_date, expected_lifespan
                    FROM property_systems
                    WHERE address_id = %s
                    ORDER BY name
                """, (address_id,))
                systems = cursor.fetchall()
                if systems and len(systems) > 0:
                    extended_data['systems'] = [dict(system) for system in systems]
        except Exception as e:
            logger.warning(f"Error checking for systems: {str(e)}")
        
        # Get utility information if available
        try:
            cursor.execute("""
                SELECT 
                    property_type, lot_size, heating_type, cooling_type,
                    avg_electric_bill, avg_gas_bill, avg_water_bill
                FROM property_details
                WHERE address_id = %s
            """, (address_id,))
            details = cursor.fetchone()
            if details:
                for key, value in details.items():
                    if value is not None and key not in ['id', 'address_id']:
                        extended_data[key] = value
        except Exception as e:
            logger.warning(f"Error checking for utility details: {str(e)}")
        
        if close_conn and conn:
            cursor.close()
            conn.close()
            
        return extended_data
        
    except Exception as e:
        logger.error(f"Error getting extended property data: {str(e)}")
        if close_conn and conn:
            conn.close()
        return {}

def format_price(value):
    """Format a price value into a string with appropriate abbreviations"""
    if not value:
        return "$0"
    
    value = int(value)
    
    if value >= 1000000:
        return f"${value/1000000:.1f}M"
    elif value >= 1000:
        return f"${value/1000:.0f}K"
    else:
        return f"${value}"

# Main function for testing
if __name__ == "__main__":
    # Test with a sample address
    test_address = "123 Main St, San Francisco, CA 94102"
    property_data = scrape_zillow_property_data(test_address)
    print(json.dumps(property_data, indent=2))
    
    # Calculate energy score
    if property_data:
        energy_score = calculate_energy_score(property_data)
        print(f"Energy Score: {energy_score}")