import requests
import json

base_url = "http://localhost:5328/api"

def test_swap(day1, day2, week_of):
    print(f"Testing swap between {day1} and {day2} for week {week_of}")
    response = requests.post(f"{base_url}/swap-meals", json={
        "week": week_of,
        "day1": day1,
        "day2": day2
    })
    
    print(f"Status Code: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)

if __name__ == "__main__":
    # You might need to adjust the week depending on your local state
    test_swap("mon", "thu", "2026-01-05")
