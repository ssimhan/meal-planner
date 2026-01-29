from recipe_scrapers import scrape_me
from typing import Dict, Any, List

def extract_recipe_from_url(url: str) -> Dict[str, Any]:
    """
    Extract recipe data from a URL using recipe-scrapers.
    Normalizes the output to our internal schema.
    """
    try:
        scraper = scrape_me(url)
        
        # Core data extraction
        name = scraper.title()
        ingredients = scraper.ingredients()
        instructions_list = scraper.instructions_list()
        
        # Optional metadata fields
        try:
            time = scraper.total_time()
        except:
            time = 0
            
        try:
            yields = scraper.yields()
        except:
            yields = "unknown"
            
        try:
            image = scraper.image()
        except:
            image = None

        # Schema normalization
        return {
            "name": name,
            "ingredients": ingredients,
            "instructions": instructions_list,
            "time": time,
            "yields": yields,
            "image": image,
            "source_url": url,
            "success": True
        }
    except Exception as e:
        # Return structured error
        return {
            "success": False,
            "error": str(e),
            "source_url": url
        }
