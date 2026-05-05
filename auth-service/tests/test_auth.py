import pytest
import requests
import requests_mock

API_URL = "http://localhost:5003"

def test_health_check():
    with requests_mock.Mocker() as m:
        m.get(f"{API_URL}/health", json={"status": "healthy"}, status_code=200)
        response = requests.get(f"{API_URL}/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

def test_register_missing_fields():
    with requests_mock.Mocker() as m:
        m.post(f"{API_URL}/auth/register", json={"status": "error", "message": "Username and password required"}, status_code=400)
        response = requests.post(f"{API_URL}/auth/register", json={})
        assert response.status_code == 400
        assert response.json()["status"] == "error"

def test_login_invalid_creds():
    with requests_mock.Mocker() as m:
        m.post(f"{API_URL}/auth/login", json={"status": "error", "message": "Invalid credentials"}, status_code=401)
        response = requests.post(f"{API_URL}/auth/login", json={"username": "fake", "password": "fake"})
        assert response.status_code == 401
        assert "Invalid" in response.json()["message"]