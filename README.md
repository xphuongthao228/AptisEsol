# AptisEsol

Full-stack Aptis ESOL practice app with React TypeScript frontend and Spring Boot 3 backend.

## Backend

Create MySQL database with SQL:

```powershell
cd backend
mysql -u root -p < .\sql\01_create_database.sql
mysql -u root -p aptis_esol < .\sql\02_schema_and_seed.sql
```

```powershell
cd backend
mvn spring-boot:run
```

Or run backend with `.env`:

```powershell
cd backend
Copy-Item .env.example .env
# For local OTP testing, set MAIL_ENABLED=false.
# For real email OTP, fill GAS_MAIL_URL and GAS_MAIL_SECRET.
.\run-backend.ps1
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Default backend URL for frontend: `http://localhost:8080/api`.

## Deploy backend with Docker

The backend image runs only Java; it does not include a MySQL server. Provision
MySQL separately and add its connection settings in the deployment platform's
environment variables before starting the backend:

```dotenv
DB_URL=jdbc:mysql://YOUR_MYSQL_HOST:3306/aptis_esol?serverTimezone=Asia/Ho_Chi_Minh&characterEncoding=utf8
DB_USERNAME=YOUR_MYSQL_USER
DB_PASSWORD=YOUR_MYSQL_PASSWORD
FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN
APP_CORS=https://YOUR_FRONTEND_DOMAIN
AUTH_COOKIE_SECURE=true
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
```

Create the `aptis_esol` database first and grant the application user access.
Use the database provider's required TLS options in `DB_URL` when applicable.
Use the MySQL hostname and port reachable from the backend container. `localhost`
points to the backend container itself, so it will not reach a separate database.
If MySQL and the backend share a Docker Compose network, the MySQL service in
this repository is reachable as `mysql:3306`. The existing `docker-compose.yml`
starts only MySQL; deploying `backend/Dockerfile` alone does not start that service.

Set these variables directly in the platform. The Dockerfile does not load
`backend/.env`. A successful Maven/image build followed by a MySQL socket error
and container restarts means the runtime database connection needs checking:
hostname, port, network/firewall, database availability, then credentials.

When deploying the frontend separately, set `VITE_API_URL` to
`https://YOUR_BACKEND_DOMAIN/api` before building it.

Seed accounts:
- Admin: `admin@aptis.com` / `123456`
- Student: `student@aptis.com` / `123456`
