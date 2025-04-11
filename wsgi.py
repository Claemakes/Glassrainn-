"""
WSGI application entry point for GlassRain

Use this file with Gunicorn for production deployment:
gunicorn -w 4 wsgi:app
"""

from glassrain_unified import app

if __name__ == "__main__":
    app.run()