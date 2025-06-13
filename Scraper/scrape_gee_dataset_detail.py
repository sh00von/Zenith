import json
import requests
from bs4 import BeautifulSoup
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

# --- Configuration ---
INPUT_JSON = 'gee_datasets.json'
OUTPUT_JSON = 'gee_datasets_full_details.json'
MAX_WORKERS = 10  # Number of parallel requests

# Global HTTP headers for requests
HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def load_all_links():
    """Loads dataset links from a JSON file."""
    try:
        with open(INPUT_JSON, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: The file {INPUT_JSON} was not found.")
        print("Creating a dummy 'gee_datasets.json' file for testing with a classification table.")
        # This URL is known to have a classification table.
        dummy_data = [{"url": "https://developers.google.com/earth-engine/datasets/catalog/AAFC_ACI"}]
        with open(INPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(dummy_data, f)
        return dummy_data

def scrape_dataset_details(url):
    """
    Scrapes a single Earth Engine dataset page, capturing bands and classification tables.
    """
    try:
        resp = requests.get(url, headers=HTTP_HEADERS, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')

        # --- Scrape Basic Info ---
        ee_code = soup.select_one('code.lang-js, code.devsite-click-to-copy').get_text(strip=True) if soup.select_one('code.lang-js, code.devsite-click-to-copy') else None
        provider = soup.select_one('span[itemprop="provider"] span[itemprop="name"]').get_text(strip=True) if soup.select_one('span[itemprop="provider"] span[itemprop="name"]') else None
        description_html = str(soup.select_one('div[itemprop="description"]')).strip() if soup.select_one('div[itemprop="description"]') else None
        js_code = soup.find('pre', attrs={"data-code-snippet": "true"}).get_text(strip=True) if soup.find('pre', attrs={"data-code-snippet": "true"}) else None
        
        # --- Initialize Data Holders ---
        pixel_size = None
        bands = []
        classifications = [] # New list for classification data
        panel = None

        # --- Universal Panel Finder ---
        bands_header = soup.find('h3', id='bands')
        if bands_header:
            panel = bands_header.find_parent('section')
        if not panel:
            panel = soup.select_one('#tabpanel-bands')

        if panel:
            # Find global Pixel Size if it exists outside the tables
            p_for_pixel_size = panel.find('p')
            if p_for_pixel_size and p_for_pixel_size.find('b'):
                b_text_lower = p_for_pixel_size.find('b').get_text(strip=True).lower()
                if 'pixel size' in b_text_lower or 'resolution' in b_text_lower:
                    pixel_size = p_for_pixel_size.get_text(separator=' ').replace(p_for_pixel_size.find('b').get_text(), '').strip()

            # --- Process ALL tables within the panel ---
            tables = panel.find_all('table', class_='eecat')
            for table in tables:
                header_row = table.find('tr')
                if not header_row: continue
                
                col_headers = [th.get_text(strip=True).lower() for th in header_row.find_all('th')]
                
                # --- Determine Table Type by Headers ---
                # Check if it's a BANDS table
                is_bands_table = (len(col_headers) in {2, 4, 5} and 'name' in col_headers and 'description' in col_headers)
                
                # Check if it's a CLASSIFICATION table
                is_class_table = (len(col_headers) == 3 and all(h in col_headers for h in ['value', 'color', 'description']))

                if is_bands_table:
                    for row in table.find_all('tr')[1:]:
                        cols = row.find_all('td')
                        if len(cols) != len(col_headers): continue
                        cells = [c.get_text(separator=' ', strip=True).replace('\u200b', '').replace('*', '').strip() for c in cols]
                        if len(cells) == 5:
                            bands.append({"name": cells[0], "units": cells[1], "min": cells[2], "max": cells[3], "description": cells[4]})
                        elif len(cells) == 4:
                            bands.append({"name": cells[0], "pixel_size": cells[1], "wavelength": cells[2], "description": cells[3]})
                        elif len(cells) == 2:
                            bands.append({"name": cells[0], "description": cells[1]})
                
                elif is_class_table:
                    for row in table.find_all('tr')[1:]:
                        cols = row.find_all('td')
                        if len(cols) != len(col_headers): continue
                        value = cols[0].get_text(strip=True)
                        color = cols[1].get_text(strip=True)
                        desc = cols[2].get_text(strip=True)
                        classifications.append({"value": value, "color": color, "description": desc})

        return {
            "url": url, "ee_code": ee_code, "provider": provider,
            "description_html": description_html, "pixel_size": pixel_size,
            "bands": bands, "classifications": classifications, "js_code": js_code
        }
    except Exception:
        return None

if __name__ == "__main__":
    links = load_all_links()
    if not links:
        print("Input file is empty or not found. Exiting.")
    else:
        print(f"✅ Found {len(links)} URLs. Starting parallel scraping with {MAX_WORKERS} workers...")
        all_data = []

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_url = {executor.submit(scrape_dataset_details, link['url']): link for link in links}
            
            for future in tqdm(as_completed(future_to_url), total=len(links), desc="Scraping Datasets"):
                result = future.result()
                if result:
                    all_data.append(result)

        if all_data:
            print(f"\n✅ Successfully scraped details for {len(all_data)} out of {len(links)} datasets.")
            all_data.sort(key=lambda x: x['url'])
            with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
                json.dump(all_data, f, indent=2, ensure_ascii=False)
            print(f"💾 All data saved to {OUTPUT_JSON}")
        else:
            print("\n❌ No data was successfully scraped.")