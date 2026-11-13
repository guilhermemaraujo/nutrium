# Nutrium appointment requests

Senior Full-Stack challenge implementation. The [challenge PDF](challenge-appointment-requests.pdf) defines the requirements and UI references.

## What works today

The guest search page works with mock nutritionists and services. It supports name, service, and location search, Braga fallback, service details, and pagination. Booking and professional requests are not implemented yet; their API contracts are documented in the frontend types.

## Requirements

- Docker Desktop with Docker Compose
- Free local ports 3000 (Rails), 3036 (Vite), and 8025 (Mailpit)

Ruby, Node, and PostgreSQL run in containers; host installations are unnecessary.

## Run

From the repository root:

```sh
docker compose up --build -d
docker compose ps
```

The web service prepares the database before Rails starts. Open `http://localhost:3000` and confirm the **Find your nutritionist** heading appears. Use `docker compose logs -f web vite worker` to inspect service output, and `docker compose down` to stop the stack while retaining database data.

Source files are bind mounted. Rails reloads code in development, and Vite updates the frontend in the browser when files change.

## Test

Run these with the services started:

```sh
docker compose exec -e RAILS_ENV=test web bin/rails db:prepare
docker compose exec -e RAILS_ENV=test web bin/rails test
docker compose exec vite npm run typecheck
docker compose exec vite npm test
```

To verify production asset compilation, run `docker compose exec -e RAILS_ENV=production -e SECRET_KEY_BASE_DUMMY=1 web bin/rails assets:precompile`.

## Technical notes

- Rails serves the React shell on the same origin. Vite builds the frontend assets and styles; PostgreSQL stores application data.
- Solid Queue runs in a separate worker with its own database in the same PostgreSQL server.
- Development SMTP goes to Mailpit. Captured messages can be inspected at `http://localhost:8025`; no real email provider is needed locally.
- Authentication is outside the challenge requirements.
