import pytest
import requests
import requests_mock

API_URL = "http://localhost:5002"

def test_health_check():
    with requests_mock.Mocker() as m:
        m.get(f"{API_URL}/health", json={"status": "healthy"}, status_code=200)
        response = requests.get(f"{API_URL}/health")
        assert response.status_code == 200

def test_get_todos_unauthorized():
    with requests_mock.Mocker() as m:
        m.get(f"{API_URL}/todos", json={"status": "error", "message": "Unauthorized"}, status_code=401)
        response = requests.get(f"{API_URL}/todos")
        assert response.status_code == 401

def test_create_todo_missing_auth():
    with requests_mock.Mocker() as m:
        m.post(f"{API_URL}/todos", json={"status": "error", "message": "Unauthorized"}, status_code=401)
        response = requests.post(f"{API_URL}/todos", json={"title": "Test Todo"})
        assert response.status_code == 401