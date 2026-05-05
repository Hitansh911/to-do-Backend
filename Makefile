.PHONY: build up down logs ps test scan push volumes prune swarm-init swarm-deploy swarm-scale swarm-rm secrets

build:
	DOCKER_BUILDKIT=1 docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

test:
	@echo "Running tests for auth-service..."
	docker compose run --rm auth-service python -m pytest tests/test_auth.py -v
	@echo "Running tests for notes-service..."
	docker compose run --rm notes-service python -m pytest tests/test_notes.py -v
	@echo "Running tests for todo-service..."
	docker compose run --rm todo-service python -m pytest tests/test_todos.py -v

scan:
	@echo "Scanning auth-service..."
	trivy image notes-todo-auth-service:latest
	@echo "Scanning notes-service..."
	trivy image notes-todo-notes-service:latest
	@echo "Scanning todo-service..."
	trivy image notes-todo-todo-service:latest

push:
	docker compose push

volumes:
	docker volume ls
	@echo "Inspecting postgres-data:"
	docker volume inspect postgres-data || echo "Volume not found"

prune:
	docker system prune -f

swarm-init:
	docker swarm init

secrets:
	@echo "Creating Docker secrets..."
	-@docker secret create db_password .env
	-@docker secret create jwt_secret .env

swarm-deploy:
	docker stack deploy -c docker-stack.yml notesapp

swarm-scale:
	docker service scale notesapp_notes-service=4

swarm-rm:
	docker stack rm notesapp