#!/usr/bin/env python3
"""
Backend API Testing for Radio Web App
Tests Radio Browser API Integration and Favorites Management System
"""

import requests
import json
import uuid
from datetime import datetime
import time

# Backend URL from frontend/.env
BACKEND_URL = "https://19febe5b-8c47-4671-900b-a357674c3fe2.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class RadioBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = {
            "radio_browser_api": {},
            "favorites_management": {},
            "overall_status": "UNKNOWN"
        }
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        print(f"{'✅' if status else '❌'} {test_name}: {details}")
        return status
        
    def test_popular_stations(self):
        """Test GET /api/stations/popular endpoint"""
        print("\n=== Testing Popular Stations API ===")
        try:
            response = self.session.get(f"{API_BASE}/stations/popular", timeout=30)
            
            if response.status_code != 200:
                return self.log_test("Popular Stations", False, f"HTTP {response.status_code}: {response.text}")
            
            stations = response.json()
            
            if not isinstance(stations, list):
                return self.log_test("Popular Stations", False, "Response is not a list")
                
            if len(stations) == 0:
                return self.log_test("Popular Stations", False, "No stations returned")
                
            # Verify station structure
            first_station = stations[0]
            required_fields = ['id', 'name', 'url']
            for field in required_fields:
                if field not in first_station:
                    return self.log_test("Popular Stations", False, f"Missing required field: {field}")
            
            # Check if we got a reasonable number of stations
            if len(stations) < 10:
                return self.log_test("Popular Stations", False, f"Only {len(stations)} stations returned, expected more")
                
            self.test_results["radio_browser_api"]["popular_stations"] = {
                "status": "PASS",
                "count": len(stations),
                "sample_station": first_station
            }
            
            return self.log_test("Popular Stations", True, f"Retrieved {len(stations)} stations successfully")
            
        except requests.exceptions.Timeout:
            return self.log_test("Popular Stations", False, "Request timeout")
        except requests.exceptions.RequestException as e:
            return self.log_test("Popular Stations", False, f"Request error: {str(e)}")
        except Exception as e:
            return self.log_test("Popular Stations", False, f"Unexpected error: {str(e)}")
    
    def test_search_stations(self):
        """Test GET /api/stations/search endpoint"""
        print("\n=== Testing Station Search API ===")
        try:
            # Test with a common search term
            search_query = "jazz"
            response = self.session.get(f"{API_BASE}/stations/search", 
                                      params={"query": search_query}, 
                                      timeout=30)
            
            if response.status_code != 200:
                return self.log_test("Station Search", False, f"HTTP {response.status_code}: {response.text}")
            
            stations = response.json()
            
            if not isinstance(stations, list):
                return self.log_test("Station Search", False, "Response is not a list")
                
            if len(stations) == 0:
                return self.log_test("Station Search", False, f"No stations found for query '{search_query}'")
            
            # Verify station structure
            first_station = stations[0]
            required_fields = ['id', 'name', 'url']
            for field in required_fields:
                if field not in first_station:
                    return self.log_test("Station Search", False, f"Missing required field: {field}")
            
            # Check if search results are relevant (name should contain search term)
            relevant_count = sum(1 for station in stations if search_query.lower() in station['name'].lower())
            
            self.test_results["radio_browser_api"]["search_stations"] = {
                "status": "PASS",
                "query": search_query,
                "count": len(stations),
                "relevant_count": relevant_count,
                "sample_station": first_station
            }
            
            return self.log_test("Station Search", True, f"Found {len(stations)} stations for '{search_query}', {relevant_count} relevant")
            
        except requests.exceptions.Timeout:
            return self.log_test("Station Search", False, "Request timeout")
        except requests.exceptions.RequestException as e:
            return self.log_test("Station Search", False, f"Request error: {str(e)}")
        except Exception as e:
            return self.log_test("Station Search", False, f"Unexpected error: {str(e)}")
    
    def test_stations_by_country(self):
        """Test GET /api/stations/by-country/{country} endpoint"""
        print("\n=== Testing Stations by Country API ===")
        try:
            # Test with Italy as specified in requirements
            country = "italy"
            response = self.session.get(f"{API_BASE}/stations/by-country/{country}", timeout=30)
            
            if response.status_code != 200:
                return self.log_test("Stations by Country", False, f"HTTP {response.status_code}: {response.text}")
            
            stations = response.json()
            
            if not isinstance(stations, list):
                return self.log_test("Stations by Country", False, "Response is not a list")
                
            if len(stations) == 0:
                return self.log_test("Stations by Country", False, f"No stations found for country '{country}'")
            
            # Verify station structure
            first_station = stations[0]
            required_fields = ['id', 'name', 'url']
            for field in required_fields:
                if field not in first_station:
                    return self.log_test("Stations by Country", False, f"Missing required field: {field}")
            
            # Check if stations are from the correct country
            country_match_count = sum(1 for station in stations if station.get('country', '').lower() == country.lower())
            
            self.test_results["radio_browser_api"]["stations_by_country"] = {
                "status": "PASS",
                "country": country,
                "count": len(stations),
                "country_match_count": country_match_count,
                "sample_station": first_station
            }
            
            return self.log_test("Stations by Country", True, f"Found {len(stations)} stations for {country}, {country_match_count} with matching country")
            
        except requests.exceptions.Timeout:
            return self.log_test("Stations by Country", False, "Request timeout")
        except requests.exceptions.RequestException as e:
            return self.log_test("Stations by Country", False, f"Request error: {str(e)}")
        except Exception as e:
            return self.log_test("Stations by Country", False, f"Unexpected error: {str(e)}")
    
    def test_add_favorite(self):
        """Test POST /api/favorites endpoint"""
        print("\n=== Testing Add Favorite API ===")
        try:
            # Create test favorite data
            test_favorite = {
                "station_id": f"test-station-{uuid.uuid4()}",
                "name": "Test Jazz Radio",
                "url": "http://test-jazz-radio.com/stream",
                "favicon": "http://test-jazz-radio.com/favicon.ico"
            }
            
            response = self.session.post(f"{API_BASE}/favorites", 
                                       json=test_favorite, 
                                       timeout=15)
            
            if response.status_code != 200:
                return self.log_test("Add Favorite", False, f"HTTP {response.status_code}: {response.text}")
            
            favorite_response = response.json()
            
            # Verify response structure
            required_fields = ['id', 'station_id', 'name', 'url', 'timestamp']
            for field in required_fields:
                if field not in favorite_response:
                    return self.log_test("Add Favorite", False, f"Missing required field in response: {field}")
            
            # Verify data matches
            if favorite_response['station_id'] != test_favorite['station_id']:
                return self.log_test("Add Favorite", False, "Station ID mismatch in response")
                
            if favorite_response['name'] != test_favorite['name']:
                return self.log_test("Add Favorite", False, "Name mismatch in response")
            
            # Store for cleanup
            self.test_station_id = test_favorite['station_id']
            
            self.test_results["favorites_management"]["add_favorite"] = {
                "status": "PASS",
                "favorite_id": favorite_response['id'],
                "station_id": favorite_response['station_id']
            }
            
            return self.log_test("Add Favorite", True, f"Added favorite with ID: {favorite_response['id']}")
            
        except requests.exceptions.Timeout:
            return self.log_test("Add Favorite", False, "Request timeout")
        except requests.exceptions.RequestException as e:
            return self.log_test("Add Favorite", False, f"Request error: {str(e)}")
        except Exception as e:
            return self.log_test("Add Favorite", False, f"Unexpected error: {str(e)}")
    
    def test_get_favorites(self):
        """Test GET /api/favorites endpoint"""
        print("\n=== Testing Get Favorites API ===")
        try:
            response = self.session.get(f"{API_BASE}/favorites", timeout=15)
            
            if response.status_code != 200:
                return self.log_test("Get Favorites", False, f"HTTP {response.status_code}: {response.text}")
            
            favorites = response.json()
            
            if not isinstance(favorites, list):
                return self.log_test("Get Favorites", False, "Response is not a list")
            
            # Should have at least the one we just added
            if len(favorites) == 0:
                return self.log_test("Get Favorites", False, "No favorites returned (expected at least the test favorite)")
            
            # Verify structure of favorites
            first_favorite = favorites[0]
            required_fields = ['id', 'station_id', 'name', 'url', 'timestamp']
            for field in required_fields:
                if field not in first_favorite:
                    return self.log_test("Get Favorites", False, f"Missing required field: {field}")
            
            # Check if our test favorite is in the list
            test_favorite_found = any(fav['station_id'] == getattr(self, 'test_station_id', '') for fav in favorites)
            
            self.test_results["favorites_management"]["get_favorites"] = {
                "status": "PASS",
                "count": len(favorites),
                "test_favorite_found": test_favorite_found
            }
            
            return self.log_test("Get Favorites", True, f"Retrieved {len(favorites)} favorites, test favorite found: {test_favorite_found}")
            
        except requests.exceptions.Timeout:
            return self.log_test("Get Favorites", False, "Request timeout")
        except requests.exceptions.RequestException as e:
            return self.log_test("Get Favorites", False, f"Request error: {str(e)}")
        except Exception as e:
            return self.log_test("Get Favorites", False, f"Unexpected error: {str(e)}")
    
    def test_remove_favorite(self):
        """Test DELETE /api/favorites/{station_id} endpoint"""
        print("\n=== Testing Remove Favorite API ===")
        try:
            if not hasattr(self, 'test_station_id'):
                return self.log_test("Remove Favorite", False, "No test station ID available for deletion")
            
            response = self.session.delete(f"{API_BASE}/favorites/{self.test_station_id}", timeout=15)
            
            if response.status_code != 200:
                return self.log_test("Remove Favorite", False, f"HTTP {response.status_code}: {response.text}")
            
            delete_response = response.json()
            
            if delete_response.get('status') != 'deleted':
                return self.log_test("Remove Favorite", False, f"Unexpected response: {delete_response}")
            
            # Verify it's actually deleted by trying to get favorites again
            get_response = self.session.get(f"{API_BASE}/favorites", timeout=15)
            if get_response.status_code == 200:
                favorites = get_response.json()
                still_exists = any(fav['station_id'] == self.test_station_id for fav in favorites)
                if still_exists:
                    return self.log_test("Remove Favorite", False, "Favorite still exists after deletion")
            
            self.test_results["favorites_management"]["remove_favorite"] = {
                "status": "PASS",
                "deleted_station_id": self.test_station_id
            }
            
            return self.log_test("Remove Favorite", True, f"Successfully removed favorite: {self.test_station_id}")
            
        except requests.exceptions.Timeout:
            return self.log_test("Remove Favorite", False, "Request timeout")
        except requests.exceptions.RequestException as e:
            return self.log_test("Remove Favorite", False, f"Request error: {str(e)}")
        except Exception as e:
            return self.log_test("Remove Favorite", False, f"Unexpected error: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Radio Web App Backend Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        
        # Test Radio Browser API Integration
        print("\n" + "="*60)
        print("TESTING RADIO BROWSER API INTEGRATION")
        print("="*60)
        
        radio_api_results = []
        radio_api_results.append(self.test_popular_stations())
        radio_api_results.append(self.test_search_stations())
        radio_api_results.append(self.test_stations_by_country())
        
        # Test Favorites Management System
        print("\n" + "="*60)
        print("TESTING FAVORITES MANAGEMENT SYSTEM")
        print("="*60)
        
        favorites_results = []
        favorites_results.append(self.test_add_favorite())
        favorites_results.append(self.test_get_favorites())
        favorites_results.append(self.test_remove_favorite())
        
        # Calculate overall results
        radio_api_success = all(radio_api_results)
        favorites_success = all(favorites_results)
        overall_success = radio_api_success and favorites_success
        
        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Radio Browser API Integration: {'✅ PASS' if radio_api_success else '❌ FAIL'}")
        print(f"Favorites Management System: {'✅ PASS' if favorites_success else '❌ FAIL'}")
        print(f"Overall Backend Status: {'✅ PASS' if overall_success else '❌ FAIL'}")
        
        self.test_results["overall_status"] = "PASS" if overall_success else "FAIL"
        
        return {
            "radio_browser_api_working": radio_api_success,
            "favorites_management_working": favorites_success,
            "overall_working": overall_success,
            "detailed_results": self.test_results
        }

if __name__ == "__main__":
    tester = RadioBackendTester()
    results = tester.run_all_tests()
    
    # Print final results for easy parsing
    print(f"\n🎯 FINAL RESULTS:")
    print(f"Radio Browser API Integration: {results['radio_browser_api_working']}")
    print(f"Favorites Management System: {results['favorites_management_working']}")
    print(f"Overall Backend Working: {results['overall_working']}")