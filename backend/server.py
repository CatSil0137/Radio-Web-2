from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class RadioStation(BaseModel):
    id: str
    name: str
    url: str
    homepage: Optional[str] = None
    favicon: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[str] = None
    votes: Optional[int] = 0
    
class FavoriteStation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    station_id: str
    name: str
    url: str
    favicon: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class FavoriteStationCreate(BaseModel):
    station_id: str
    name: str
    url: str
    favicon: Optional[str] = None


# Radio Browser API endpoints
@api_router.get("/stations/popular", response_model=List[RadioStation])
async def get_popular_stations(limit: int = 50):
    """Get popular radio stations from Radio Browser API"""
    try:
        # Get popular stations by vote count
        response = requests.get(
            f"https://de1.api.radio-browser.info/json/stations/topvote/{limit}",
            headers={'User-Agent': 'RadioWebApp/1.0'}
        )
        response.raise_for_status()
        stations_data = response.json()
        
        stations = []
        for station in stations_data:
            stations.append(RadioStation(
                id=station.get('stationuuid', ''),
                name=station.get('name', 'Unknown Station'),
                url=station.get('url_resolved', station.get('url', '')),
                homepage=station.get('homepage', ''),
                favicon=station.get('favicon', ''),
                country=station.get('country', ''),
                language=station.get('language', ''),
                tags=station.get('tags', ''),
                votes=station.get('votes', 0)
            ))
        
        return stations
        
    except Exception as e:
        logger.error(f"Error fetching popular stations: {e}")
        raise HTTPException(status_code=500, detail="Error fetching radio stations")

@api_router.get("/stations/search")
async def search_stations(query: str, limit: int = 20):
    """Search radio stations by name"""
    try:
        response = requests.get(
            f"https://de1.api.radio-browser.info/json/stations/byname/{query}",
            params={'limit': limit},
            headers={'User-Agent': 'RadioWebApp/1.0'}
        )
        response.raise_for_status()
        stations_data = response.json()
        
        stations = []
        for station in stations_data:
            stations.append(RadioStation(
                id=station.get('stationuuid', ''),
                name=station.get('name', 'Unknown Station'),
                url=station.get('url_resolved', station.get('url', '')),
                homepage=station.get('homepage', ''),
                favicon=station.get('favicon', ''),
                country=station.get('country', ''),
                language=station.get('language', ''),
                tags=station.get('tags', ''),
                votes=station.get('votes', 0)
            ))
        
        return stations
        
    except Exception as e:
        logger.error(f"Error searching stations: {e}")
        raise HTTPException(status_code=500, detail="Error searching radio stations")

@api_router.get("/stations/by-country/{country}")
async def get_stations_by_country(country: str, limit: int = 30):
    """Get radio stations by country"""
    try:
        response = requests.get(
            f"https://de1.api.radio-browser.info/json/stations/bycountry/{country}",
            params={'limit': limit},
            headers={'User-Agent': 'RadioWebApp/1.0'}
        )
        response.raise_for_status()
        stations_data = response.json()
        
        stations = []
        for station in stations_data:
            stations.append(RadioStation(
                id=station.get('stationuuid', ''),
                name=station.get('name', 'Unknown Station'),
                url=station.get('url_resolved', station.get('url', '')),
                homepage=station.get('homepage', ''),
                favicon=station.get('favicon', ''),
                country=station.get('country', ''),
                language=station.get('language', ''),
                tags=station.get('tags', ''),
                votes=station.get('votes', 0)
            ))
        
        return stations
        
    except Exception as e:
        logger.error(f"Error fetching stations by country: {e}")
        raise HTTPException(status_code=500, detail="Error fetching radio stations")

# Favorites management
@api_router.post("/favorites", response_model=FavoriteStation)
async def add_favorite(favorite: FavoriteStationCreate):
    """Add a station to favorites"""
    favorite_obj = FavoriteStation(**favorite.dict())
    await db.favorites.insert_one(favorite_obj.dict())
    return favorite_obj

@api_router.get("/favorites", response_model=List[FavoriteStation])
async def get_favorites():
    """Get all favorite stations"""
    favorites = await db.favorites.find().to_list(1000)
    return [FavoriteStation(**fav) for fav in favorites]

@api_router.delete("/favorites/{station_id}")
async def remove_favorite(station_id: str):
    """Remove a station from favorites"""
    result = await db.favorites.delete_one({"station_id": station_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"status": "deleted"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()