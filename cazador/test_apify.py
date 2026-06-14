import os
import sys
from dotenv import load_dotenv
from apify_client import ApifyClient

load_dotenv()
token = os.getenv("APIFY_TOKEN")
client = ApifyClient(token)

run_input = {
    "hashtags": ["test"],
    "resultsPerPage": 1,
    "shouldDownloadVideos": False,
    "shouldDownloadCovers": False,
    "searchType": "video",
    "timeRange": "week"
}

run = client.actor("clockworks/tiktok-scraper").call(run_input=run_input)
print("RUN RESULT:")
print(run)
