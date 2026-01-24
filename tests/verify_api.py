
import requests
import json
import datetime

def test_log_meal_api():
    url = "http://localhost:5328/api/log-meal"
    
    # Get current week string (Monday)
    today = datetime.date.today()
    monday = today - datetime.timedelta(days=today.weekday())
    week_str = monday.strftime('%Y-%m-%d')
    
    print(f"Testing for week: {week_str}")
    
    payload = {
        "week": week_str,
        "day": "mon",
        "made": True,
        "actual_meal": "API Test Meal"
    }
    
    headers = {
        "Authorization": "Bearer MAGIC_TEST_TOKEN",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("[SUCCESS] API call successful.")
        else:
            print("[FAILURE] API call failed.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_log_meal_api()
