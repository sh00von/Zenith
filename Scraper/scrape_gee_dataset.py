import requests
from bs4 import BeautifulSoup
import json

BASE_URL = "https://developers.google.com"
CATALOG_URL = f"{BASE_URL}/earth-engine/datasets/catalog"

def scrape_dataset_info():
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = requests.get(CATALOG_URL, headers=headers)
    if response.status_code != 200:
        print("❌ Failed to fetch the page.")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    list_items = soup.find_all("li", class_="ee-sample-image ee-cards devsite-landing-row-item-description")

    results = []

    for li in list_items:
        # Link
        a_tag = li.find("a", href=True)
        relative_link = a_tag['href'] if a_tag and a_tag['href'].startswith("/earth-engine/datasets/catalog/") else None
        full_link = BASE_URL + relative_link if relative_link else None

        # Title
        title_tag = a_tag.find("h3") if a_tag else None
        title = title_tag.get_text(strip=True) if title_tag else None

        # Description
        desc_tag = li.find("td", class_="ee-dataset-description-snippet")
        description = desc_tag.get_text(strip=True) if desc_tag else None

        # Tags
        tag_elements = li.select("td.ee-tag-buttons a.ee-tag")
        tags = [tag.get_text(strip=True) for tag in tag_elements] if tag_elements else []

        if full_link and title:
            results.append({
                "url": full_link,
                "title": title,
                "description": description,
                "tags": tags
            })

    return results

def save_to_json(data, filename):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved {len(data)} datasets to {filename}")

if __name__ == "__main__":
    dataset_info = scrape_dataset_info()
    save_to_json(dataset_info, 'gee_datasets.json')
