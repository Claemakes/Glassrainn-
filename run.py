"""
GlassRain Launcher Script

This script launches the GlassRain application with proper production settings.
It can be used directly or through a WSGI server like Gunicorn.
"""

import os
from glassrain_unified import app

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 3000))
    
    # Get host from environment variable or use default
    host = os.environ.get("HOST", "0.0.0.0")
    
    # Get debug mode from environment or use production setting
    debug = os.environ.get("DEBUG", "False").lower() == "true"
    
    # Start the application
    app.run(host=host, port=port, debug=debug)