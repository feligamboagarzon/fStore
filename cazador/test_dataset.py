import os
from dotenv import load_dotenv
from apify_client import ApifyClient
import json

load_dotenv(override=True)
client = ApifyClient(os.getenv("APIFY_TOKEN"))

run_input = {
    "hashtags": ["test"],
    "resultsPerPage": 1,
    "shouldDownloadVideos": False,
    "shouldDownloadCovers": False,
    "searchType": "video",
    "timeRange": "week"
}

run = client.actor("clockworks/tiktok-scraper").call(run_input=run_input)
dataset_id = run.default_dataset_id if hasattr(run, "default_dataset_id") else run.get("defaultDatasetId") or run.get("default_dataset_id")

items = list(client.dataset(dataset_id).iterate_items())
if items:
    print(json.dumps(items[0], indent=2))
else:
    print("No items")
