import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import * as radioApi from "./radioApi";

const RadioPlayer = () => {
  const [stations, setStations] = useState([]);
  const [currentStation, setCurrentStation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState("popular");
  const audioRef = useRef(null);

  useEffect(() => {
    loadPopularStations();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const loadPopularStations = async () => {
    try {
      setLoading(true);
      setStations(await radioApi.getPopularStations(100));
    } catch (error) {
      console.error("Error loading stations:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchStations = async () => {
    if (!searchQuery.trim()) {
      loadPopularStations();
      return;
    }
    
    try {
      setLoading(true);
      setStations(await radioApi.searchStations(searchQuery, 50));
    } catch (error) {
      console.error("Error searching stations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    setFavorites(radioApi.loadFavorites());
  };

  const updateFavorites = (next) => {
    radioApi.saveFavorites(next);
    setFavorites(next);
  };

  const addToFavorites = (station) => {
    if (isFavorite(station.id)) return;
    updateFavorites([
      ...favorites,
      {
        id: station.id,
        station_id: station.id,
        name: station.name,
        url: station.url,
        favicon: station.favicon,
        country: station.country || "",
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const removeFromFavorites = (stationId) => {
    updateFavorites(favorites.filter((fav) => fav.station_id !== stationId));
  };

  const playStation = (station) => {
    if (currentStation?.id === station.id && isPlaying) {
      pausePlayback();
      return;
    }

    if (audioRef.current) {
      audioRef.current.src = station.url;
      audioRef.current.play()
        .then(() => {
          setCurrentStation(station);
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Error playing station:", error);
          alert("Impossibile riprodurre questa stazione");
        });
    }
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      setIsPlaying(false);
      setCurrentStation(null);
    }
  };

  const isFavorite = (stationId) => {
    return favorites.some(fav => fav.station_id === stationId);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchStations();
    }
  };

  const displayStations = activeTab === "favorites" ? 
    favorites.map(fav => ({
      id: fav.station_id,
      name: fav.name,
      url: fav.url,
      favicon: fav.favicon,
      country: fav.country || "",
      votes: 0
    })) : stations;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📻 Radio Web</h1>
          <p className="text-blue-200">Ascolta le tue stazioni radio preferite</p>
        </div>

        {/* Player Controls */}
        {currentStation && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                {currentStation.favicon && (
                  <img 
                    src={currentStation.favicon} 
                    alt={currentStation.name}
                    className="w-12 h-12 rounded-lg"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <div>
                  <h3 className="text-white font-semibold">{currentStation.name}</h3>
                  <p className="text-blue-200 text-sm">{currentStation.country}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => playStation(currentStation)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
                >
                  {isPlaying ? "⏸️" : "▶️"}
                </button>
                <button
                  onClick={stopPlayback}
                  className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-colors"
                >
                  ⏹️
                </button>
              </div>
            </div>
            
            {/* Volume Control */}
            <div className="flex items-center space-x-3">
              <span className="text-white text-sm">🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-white text-sm">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/20">
            <button
              onClick={() => {
                setActiveTab("popular");
                if (activeTab !== "popular") loadPopularStations();
              }}
              className={`px-6 py-2 rounded-lg transition-all ${
                activeTab === "popular" 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "text-blue-200 hover:text-white"
              }`}
            >
              🔥 Popolari
            </button>
            <button
              onClick={() => {
                setActiveTab("favorites");
              }}
              className={`px-6 py-2 rounded-lg transition-all ${
                activeTab === "favorites" 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "text-blue-200 hover:text-white"
              }`}
            >
              ❤️ Preferiti ({favorites.length})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {activeTab === "popular" && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder="Cerca stazioni radio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={searchStations}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🔍
              </button>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    loadPopularStations();
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stations List */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-white mt-4">Caricamento stazioni...</p>
            </div>
          ) : displayStations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-blue-200">
                {activeTab === "favorites" ? "Nessuna stazione nei preferiti" : "Nessuna stazione trovata"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {displayStations.map((station) => (
                <div
                  key={station.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${
                    currentStation?.id === station.id
                      ? "bg-blue-600/30 border-2 border-blue-400"
                      : "bg-white/5 hover:bg-white/10 border border-white/10"
                  }`}
                  onClick={() => playStation(station)}
                >
                  <div className="flex items-center space-x-4">
                    {station.favicon && (
                      <img
                        src={station.favicon}
                        alt={station.name}
                        className="w-10 h-10 rounded-lg"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div>
                      <h3 className="text-white font-medium">{station.name}</h3>
                      <p className="text-blue-200 text-sm">
                        {station.country} {station.votes > 0 && `• ${station.votes} voti`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFavorite(station.id)) {
                          removeFromFavorites(station.id);
                        } else {
                          addToFavorites(station);
                        }
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        isFavorite(station.id)
                          ? "text-red-400 hover:text-red-300"
                          : "text-gray-400 hover:text-red-400"
                      }`}
                    >
                      {isFavorite(station.id) ? "❤️" : "🤍"}
                    </button>
                    
                    <button className="text-blue-400 hover:text-blue-300 p-2 rounded-lg transition-colors">
                      {currentStation?.id === station.id && isPlaying ? "⏸️" : "▶️"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        onError={() => {
          setIsPlaying(false);
          alert("Errore nella riproduzione della stazione");
        }}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
};

export default RadioPlayer;