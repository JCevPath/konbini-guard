# KonbiniGuard

KonbiniGuard is a real-time food freshness and shelf-life tracking system designed for convenience store operations. It monitors prepared food batches, calculates expiration windows, and alerts staff when items are nearing or past their shelf life.

---

## Tech Stack and Infrastructure

* **Backend:** FastAPI (Python)
* **Frontend:** Web-based inventory dashboard
* **Database:** PostgreSQL with persistent volume storage
* **Testing:** Pytest
* **Containerization:** Docker & Docker Compose
* **CI/CD:** Jenkins pipeline automation

---

## Key System Features

### Data Persistence
The database uses a dedicated Docker named volume (`konbini_db_data`). This ensures that logged inventory items and store metadata remain intact across container restarts, code updates, and pipeline rebuilds.

### Pipeline Recovery and Reliability
The CI/CD pipeline is configured to protect against accidental downtime:
* **Safe Test Execution:** Backend tests run against the database before any new production images are built or deployed.
* **Automatic Rollback:** If a test or build step fails, the pipeline automatically recovers by re-deploying the images from the last successful build.
* **Data Re-Seeding Guard:** If testing routines wipe table records during execution, post-test verification checks restore core menu catalog items automatically.

---

## Environment Configuration

The application requires an environment file (`.env`) in the project root.

In the Jenkins CI/CD environment, these values are stored as a file credential under the ID `konbiniguard-env`.

---

## Local Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd konbiniguard
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root folder using the parameters listed above.

3. **Start the application stack:**
   ```bash
   docker compose up -d --build
   ```

4. **Access services:**
   * Web Interface: `http://localhost`
   * API Documentation: `http://localhost:8000/docs`

5. **Stop the stack:**
   ```bash
   docker compose -p konbiniguard down
   ```

---

## Running Tests

To run the backend test suite locally within the Docker environment:

```bash
docker compose --env-file .env -p konbiniguard run --rm backend python -m pytest
```

---

## Jenkins Pipeline Summary

The `Jenkinsfile` automates the following steps on every code push:

1. **Checkout:** Clones the repository.
2. **Test:** Starts the database, verifies schema presence, executes `pytest`, and ensures default data is present post-testing.
3. **Build Images:** Builds Docker images tagged with the active build number.
4. **Deploy:** Stops old application containers and starts the new images using `docker compose`.
5. **Smoke Test:** Verifies HTTP response codes from both frontend and backend endpoints before confirming deployment success.