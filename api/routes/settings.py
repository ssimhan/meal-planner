from flask import Blueprint, jsonify, request
from api.utils import storage
from api.utils.auth import require_auth

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/api/settings', methods=['GET'])
@require_auth
def get_settings():
    config = storage.StorageEngine.get_config()
    return jsonify(config)

@settings_bp.route('/api/settings', methods=['POST'])
@require_auth
def update_settings():
    data = request.json
    success = storage.StorageEngine.save_config(data)
    if success:
        return jsonify({"status": "success", "config": data})
    else:
        return jsonify({"status": "error", "message": "Failed to save config"}), 500
