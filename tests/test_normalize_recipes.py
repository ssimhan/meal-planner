import pytest
from scripts.normalize_recipes import normalize_ingredient, get_category, split_instructions, normalize_recipe

def test_get_category():
    assert get_category("Basmati Rice") == "grains"
    assert get_category("Red Onion") == "aromatics"
    assert get_category("Avocado Oil") == "fats"
    assert get_category("Cumin powder") == "spices"
    assert get_category("Salt") == "spices"
    assert get_category("Unknown Item") == "other"

def test_normalize_ingredient_stripping():
    # Spices should be stripped
    assert normalize_ingredient("1 tbsp Cumin powder") == "Cumin powder"
    assert normalize_ingredient("2 tsp turmeric") == "Turmeric"
    assert normalize_ingredient("1/2 cup salt") == "Salt"
    assert normalize_ingredient("1-2 green chilies") == "Green chilies" # Chili is produce but often handled as aromatic/spice
    
    # Non-spices should NOT be stripped (unless common keywords match, but usually they don't)
    assert normalize_ingredient("1 cup Rice") == "1 cup Rice"
    assert normalize_ingredient("2 large Potatos") == "2 large Potatos"

def test_normalize_ingredient_casing():
    assert normalize_ingredient("onion") == "Onion"
    assert normalize_ingredient("1 tbsp ghee") == "Ghee"

def test_split_instructions():
    ins = """Wash and soak rice for 30 mins.
    Chop onions and tomatoes.
    Saute oil and mustard seeds.
    Pressure cook for 2 whistles.
    Serve hot."""
    
    prep, cook = split_instructions(ins)
    assert "Wash and soak rice for 30 mins." in prep
    assert "Chop onions and tomatoes." in prep
    assert "Saute oil and mustard seeds." in cook
    assert "Pressure cook for 2 whistles." in cook
    assert "Serve hot." in cook

def test_normalize_recipe_full():
    data = {
        "name": "Test Recipe",
        "ingredients": ["1 tbsp Cumin", "1 cup Rice", "2 tsp Ghee"],
        "instructions": "Wash rice. Saute cumin in ghee. Cook rice."
    }
    
    normalized = normalize_recipe(data)
    
    assert normalized["title"] == "Test Recipe"
    assert normalized["ingredients"][0] == "1 cup Rice" # Grains first
    assert normalized["ingredients"][1] == "Ghee" # Fats
    assert normalized["ingredients"][2] == "Cumin" # Spices
    
    assert "Wash rice." in normalized["prep_steps"]
    assert "Saute cumin in ghee." in normalized["cook_steps"]
    assert "Cook rice." in normalized["cook_steps"]

def test_idempotency():
    data = {
        "title": "Idempotent Recipe",
        "ingredients": ["1 cup Rice", "Ghee", "Cumin"],
        "prep_steps": ["Wash rice."],
        "cook_steps": ["Cook rice."]
    }
    
    first_run = normalize_recipe(data)
    second_run = normalize_recipe(first_run)
    
    assert first_run == second_run
