from api.services.pairing_service import get_paired_suggestions

def test_get_paired_suggestions():
    # Mock history: Rasam Rice paired with Beetroot Kai (2x) and Beans Kai (1x)
    history = {
        "weeks": [
            {
                "dinners": [
                    {"recipe_ids": ["rasam_rice", "beetroot_kai"], "day": "mon"},
                    {"recipe_ids": ["rasam_rice", "beans_kai"], "day": "tue"}
                ]
            },
            {
                "dinners": [
                    {"recipe_ids": ["rasam_rice", "beetroot_kai"], "day": "wed"}
                ]
            }
        ]
    }
    
    suggestions = get_paired_suggestions("rasam_rice", history)
    
    assert len(suggestions) == 2
    assert suggestions[0] == "beetroot_kai"
    assert suggestions[1] == "beans_kai"

def test_get_paired_suggestions_empty_history():
    history = {"weeks": []}
    assert get_paired_suggestions("rasam_rice", history) == []

def test_get_paired_suggestions_no_matches():
    history = {
        "weeks": [
            {"dinners": [{"recipe_ids": ["sambar_rice", "potato_fry"]}]}
        ]
    }
    assert get_paired_suggestions("rasam_rice", history) == []
