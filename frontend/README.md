KonbiniGuard
KonbiniGuard is a real-time food freshness and inventory shelf-life tracking system designed to monitor item expiration dates, manage stock levels, and automate deployment workflows.

Features
Real-Time Tracking: Monitors food inventory and flags items nearing expiration.

Persistent Database Storage: Utilizes Docker named volumes so that production data and manually logged inventory items survive container restarts, updates, and pipeline rebuilds.

Automated CI/CD Pipeline: Integrates Jenkins, Docker Compose, and Pytest to test, build, and deploy changes securely.

Safe Failure Recovery: Features automated rollback logic in the CI/CD pipeline, ensuring that if a build or test fails, the system immediately reverts to the last stable deployment without leaving the frontend or backend offline.

Tech Stack
Backend: Python with FastAPI

Testing: Pytest

Database: PostgreSQL

Frontend: Web-based interface

Infrastructure & Automation: Docker, Docker Compose, Nginx, Jenkins

Project Structure
app/ - Backend API logic and application endpoints

db/ - Database initialization scripts (init.sql)

tests/ - Automated backend test suite using Pytest

docker-compose.yml - Container orchestration configuration

Jenkinsfile - CI/CD pipeline definition

Setup and Installation
Prerequisites
Docker and Docker Compose installed on your host machine

Jenkins configured with access to a Docker daemon and a file credential ID named konbiniguard-env for environment variables

Running Locally
Clone the repository to your local machine:

Bash
git clone <repository-url>
cd konbiniguard
Create a local .env file in the root directory containing your database credentials and configuration parameters (such as database URL and passwords).

Spin up the entire container stack in detached mode:

Bash
docker compose up -d --build
Open your web browser and navigate to http://localhost to access the application.

CI/CD Pipeline Workflow
The Jenkins pipeline automates the software delivery process through five distinct stages:

Checkout: Pulls the latest source code updates from the repository.

Test: Spins up the PostgreSQL database container, verifies that the database schema and default seed data exist (or runs init.sql if tables are missing or empty), runs backend tests using pytest, and safeguards against accidental test wipes by re-seeding if necessary.

Build Images: Compiles and builds new Docker images for the backend, frontend, and checker services using unique build tags.

Deploy: Stops old containers cleanly, removes conflicting resources, and brings up the updated application stack using Docker Compose.

Smoke Test: Automatically queries the backend and frontend endpoints over the internal Docker network to confirm that the services are up and responding properly.

Failure Recovery and Rollback
If any stage in the pipeline fails (such as a test failure during the Test stage), the pipeline halts execution of new deployments. The post failure block automatically triggers, fetches the build number of the last successful run, injects your environment credentials, and spins up the previous stable container images. This prevents downtime and keeps the last working version of the application live.