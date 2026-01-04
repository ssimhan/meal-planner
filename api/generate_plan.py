from flask import Flask, request, jsonify
import sys
import os
from pathlib import Path

# Add root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts.workflow import generate_meal_plan, find_current_week_file, get_workflow_state
import yaml

def generate_plan_api(app):
    @app.route("/api/generate-plan", methods=["POST"])
    def generate_plan_route():
        try:
            input_file, week_str = find_current_week_file()
            state, data = get_workflow_state(input_file)
            
            if state != "ready_to_plan":
                return jsonify({
                    "status": "error",
                    "message": f"Cannot generate plan in state: {state}. Please confirm vegetables first."
                }), 400
                
            # Run the generation
            # Note: generate_meal_plan normally prints to stdout and writes files
            # Since we refactored it to raise ValueError, we can catch issues
            generate_meal_plan(input_file, data)
            
            return jsonify({
                "status": "success",
                "message": f"Successfully generated plan for week of {week_str}",
                "week_of": week_str
            })
            
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

# This would be imported and called in api/index.py
