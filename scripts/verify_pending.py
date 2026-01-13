
import sys
import os
sys.path.append(os.getcwd())

from api.utils.storage import StorageEngine

def verify():
    # Attempt to call get_pending_recipes directly
    # Note: It requires a request context for get_household_id usually, 
    # but we can try to mock it or relying on default if it handles it.
    
    # StorageEngine.get_pending_recipes calls get_household_id()
    # get_household_id() uses flask.request.
    
    from flask import Flask
    app = Flask(__name__)
    
    with app.test_request_context():
        try:
            print("Calling get_pending_recipes()...")
            pending = StorageEngine.get_pending_recipes()
            print(f"Result: {pending}")
            
            if "Test Mystery Curry" in pending:
                print("SUCCESS: Test Meal found.")
            else:
                print("FAILURE: Test Meal NOT found.")
                
        except Exception as e:
            print(f"CRITICAL ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    verify()
