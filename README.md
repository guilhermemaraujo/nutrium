# Nutrium appointment requests

A Rails and React implementation of the [appointment requests challenge](challenge-appointment-requests.pdf). Guests can search nutritionists by name, service, and location, inspect services, and request an available appointment. A professional demo dashboard lists pending requests and lets a selected nutritionist accept or reject them. Decisions send guest emails to Mailpit.

## Quick demo

Watch a short walkthrough of the guest search, appointment booking, and professional request management experience.

https://github.com/user-attachments/assets/c15cbcd1-a892-430c-a707-c3839993c21b

## Requirements and startup

The application uses Ruby on Rails 7.2, PostgreSQL 16, React/TypeScript, Vite, and Tailwind CSS. Install Docker Desktop with Docker Compose and make ports **3000**, **3036**, and **8025** available. Ruby, Node, and PostgreSQL are installed in the containers; they are not required on the host for normal use.

From the repository root:

```sh
docker compose up --build -d
docker compose ps
```

The `web` service runs `bin/rails db:prepare` on startup. Initialize the demo data after the services are ready:

```sh
docker compose exec web bin/rails db:seed
```

The seed is safe to rerun and supplies five fictional professionals, varied services and schedules, pending requests, and an accepted slot. It does not clear existing data. Use `docker compose logs -f web vite worker` to inspect startup or email delivery, and `docker compose down` to stop the stack while retaining PostgreSQL data.

| Page | URL |
| --- | --- |
| Guest search and booking | http://localhost:3000/ |
| Professional requests | http://localhost:3000/requests |
| Mailpit inbox | http://localhost:8025/ |

## Try the workflows

1. On the guest page, search by nutritionist or service. Leave location empty to use Braga, or enter Porto to see eligible Porto and online services. Choose a service and select **Schedule appointment**.
2. Enter a name and email, choose a highlighted available date and time, and submit. The calendar and time choices come from Rails. A guest can have only one pending request; submitting another supersedes it.
3. Open **For professionals** from the header (or visit `/requests`), select the nutritionist who received the request, and choose **Accept** or **Reject**. Check the resulting email in Mailpit. Accepting a request automatically rejects that professional's overlapping pending requests.

The demo selector has no sign-in and is **not authorization**; anyone with access to the app can choose a professional and decide requests. Only meant for local challenge demo.

## Checks

With the Compose stack running:

```sh
docker compose exec -e RAILS_ENV=test web bin/rails db:prepare
docker compose exec -e RAILS_ENV=test web bin/rails test
docker compose exec vite npm run quality
docker compose exec vite npm test
docker compose exec vite npm run build
```

For the real-browser end-to-end test, keep the stack running and seeded. On the host, install Node.js 22 and run:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

Playwright runs desktop and mobile Chromium against `http://127.0.0.1:3000` and checks the acceptance email through Mailpit. It creates a new demo request and decision in the development database. The Rails test suite uses its separate `nutrium_test` database.

## Design notes and scope

- Rails serves the React app and same-origin JSON API. Search, booking, and requests have separate frontend features; the mock API remains available for frontend development with `VITE_API_MODE=mock`.
- PostgreSQL stores guests, services, recurring weekly availability, and appointment requests. Requests snapshot service details; database constraints protect one pending request per guest, service ownership, and nonoverlapping accepted appointments.
- Rails generates future slots in each nutritionist's time zone, checks availability again when booking, and serializes booking and decisions. A Solid Queue worker sends decision emails after commit through local Mailpit SMTP.
- Online services have no physical address and are searchable across locations. The disabled **Website** button is a visual placeholder. Browser geolocation, distance ranking, external search, and multiple languages are outside this implementation; Tailwind CSS covers the utility-first CSS extra mile.
