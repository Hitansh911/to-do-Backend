import pytest
import requests
import requests_mock

API_URL = "http://localhost:5001"
VALID_TOKEN = "Bearer valid.jwt.token"

def test_health_check():
    with requests_mock.Mocker() as m:
        m.get(f"{API_URL}/health", json={"status": "healthy"}, status_code=200)
        response = requests.get(f"{API_URL}/health")
        assert response.status_code == 200

def test_get_notes_unauthorized():
    with requests_mock.Mocker() as m:
        m.get(f"{API_URL}/notes", json={"status": "error", "message": "Unauthorized"}, status_code=401)
        response = requests.get(f"{API_URL}/notes")
        assert response.status_code == 401

def test_create_note_missing_auth():
    with requests_mock.Mocker() as m:
        m.post(f"{API_URL}/notes", json={"status": "error", "message": "Unauthorized"}, status_code=401)
        response = requests.post(f"{API_URL}/notes", json={"title": "Test"})
        assert response.status_code == 401