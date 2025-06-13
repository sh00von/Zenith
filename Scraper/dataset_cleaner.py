from bs4 import BeautifulSoup
import json

def clean_html_description(html_text):
    # Parse HTML
    soup = BeautifulSoup(html_text, 'html.parser')
    # Get text and clean up whitespace
    text = ' '.join(soup.get_text().split())
    return text

# Read the JSON file
with open('gee_datasets_full_details.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Process each dataset
for dataset in data:
    if 'description_html' in dataset:
        dataset['description'] = clean_html_description(dataset['description_html'])
        del dataset['description_html']

# Save the updated JSON
with open('gee_datasets_full_details_cleaned.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)