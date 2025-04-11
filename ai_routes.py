"""
AI routes for GlassRain application

This module provides routes for AI-powered features including:
- Design assistant for room customization
- DIY project guidance
- Energy efficiency recommendations
"""

import os
import json
import openai
from flask import Blueprint, request, jsonify

# Configure OpenAI API
openai.api_key = os.environ.get('OPENAI_API_KEY')

# Initialize Blueprint
ai_routes = Blueprint('ai_routes', __name__)

@ai_routes.route('/ask-ai', methods=['POST'])
def ask_ai():
    """
    Process a user message and return an AI response
    
    Expected JSON input:
    {
        "prompt": "Change the wall color to sage green",
        "room_type": "living_room",
        "current_state": {
            "wall_color": "#FFFFFF",
            "floor_type": "hardwood",
            "furniture": [...]
        }
    }
    """
    # Check if OpenAI API key is available
    if not openai.api_key:
        return jsonify({
            "error": "OpenAI API key not configured",
            "response": "I'm sorry, I can't process your request right now. The AI service is currently unavailable."
        }), 503
    
    # Get request data
    data = request.get_json()
    
    if not data or 'prompt' not in data:
        return jsonify({
            "error": "Invalid request",
            "response": "Please provide a valid request with a prompt."
        }), 400
    
    user_prompt = data.get('prompt')
    room_type = data.get('room_type', 'room')
    current_state = data.get('current_state', {})
    
    try:
        # Create system message with context
        system_message = f"""
        You are an expert interior designer assistant for GlassRain, a home improvement platform.
        Your role is to help users customize their {room_type} by suggesting changes to:
        - Wall colors (provide specific color names with hex codes)
        - Flooring options (with material types and colors)
        - Furniture arrangements and styles
        - Lighting options and placements
        - Decor and accessories
        
        Current room state:
        {json.dumps(current_state, indent=2)}
        
        Respond with actionable design advice formatted as a JSON object with these fields:
        - message: Your conversational response to the user (friendly, professional tone)
        - actions: Array of specific changes to make to the room
        - each action should have: type (wall_color, flooring, furniture, lighting, decor),
          specifics (color hex, material type, item description), and placement details if relevant

        For example, if changing wall color:
        {{"message": "I've updated the walls to a calming sage green that will complement your existing furniture.",
          "actions": [
            {{"type": "wall_color", "color_name": "Sage Green", "hex": "#9CAF88", "surfaces": ["all_walls"]}}
          ]
        }}
        
        If the user mentions pricing or costs, include realistic estimates for materials and labor.
        If they ask about contractors, suggest the appropriate type needed for the changes.
        """
        
        # Call OpenAI API with updated syntax for v1.0+
        client = openai.OpenAI(api_key=openai.api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Use a model that's widely available
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        # Extract response
        ai_response = response.choices[0].message.content
        
        # Try to parse as JSON
        try:
            parsed_response = json.loads(ai_response)
            return jsonify(parsed_response)
        except json.JSONDecodeError:
            # If not valid JSON, return as plain message
            return jsonify({
                "message": ai_response,
                "actions": []
            })
            
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return jsonify({
            "error": str(e),
            "response": "I'm sorry, there was an error processing your request. Please try again later."
        }), 500

@ai_routes.route('/generate-diy-plan', methods=['POST'])
def generate_diy_plan():
    """
    Generate a DIY project plan based on user requirements
    
    Expected JSON input:
    {
        "project_type": "Kitchen Backsplash",
        "requirements": "I want to install subway tiles in my kitchen with a modern look",
        "skill_level": "Beginner"
    }
    """
    # Check OpenAI API key
    if not openai.api_key:
        return jsonify({
            "error": "OpenAI API key not configured",
            "message": "DIY plan generation is currently unavailable."
        }), 503
    
    # Get request data
    data = request.get_json()
    
    if not data or 'project_type' not in data or 'requirements' not in data:
        return jsonify({
            "error": "Invalid request",
            "message": "Please provide a valid project type and requirements."
        }), 400
    
    project_type = data.get('project_type')
    requirements = data.get('requirements')
    skill_level = data.get('skill_level', 'Intermediate')
    
    try:
        # Create system message
        system_message = f"""
        You are a DIY project planning expert. Create a detailed plan for a {project_type} project.
        The user's skill level is: {skill_level}
        
        Generate a comprehensive DIY plan with these sections:
        1. Materials list with quantities and estimated costs
        2. Tools required
        3. Step-by-step instructions
        4. Time estimates for each step
        5. Safety considerations
        6. Common pitfalls to avoid
        7. Final tips for success
        
        Format your response as a JSON object with these sections clearly defined.
        Be specific, accurate, and provide detailed guidance appropriate for the user's skill level.
        """
        
        # Call OpenAI API with updated syntax for v1.0+
        client = openai.OpenAI(api_key=openai.api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": requirements}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        # Extract and parse response
        ai_response = response.choices[0].message.content
        
        try:
            parsed_response = json.loads(ai_response)
            return jsonify(parsed_response)
        except json.JSONDecodeError:
            # If not valid JSON, structure it ourselves
            return jsonify({
                "plan": ai_response,
                "project_type": project_type,
                "skill_level": skill_level
            })
            
    except Exception as e:
        print(f"Error generating DIY plan: {e}")
        return jsonify({
            "error": str(e),
            "message": "Error generating DIY plan. Please try again later."
        }), 500

def init_ai_routes(app):
    """Register AI routes with the Flask app"""
    app.register_blueprint(ai_routes, url_prefix='/api/ai')