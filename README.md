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
# Edit .env and fill MAIL_PASSWORD
.\run-backend.ps1
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Default backend URL for frontend: `http://localhost:8080/api`.

Seed accounts:
- Admin: `admin@aptis.com` / `123456`
- Student: `student@aptis.com` / `123456`
