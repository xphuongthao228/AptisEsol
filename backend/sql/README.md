# AptisEsol SQL

Run these scripts in order.

## MySQL Workbench

1. Open a SQL tab connected to your MySQL server.
2. Run `01_create_database.sql`.
3. Connect to database `aptis_esol`.
4. Run `02_schema_and_seed.sql`.

## MySQL CLI

```powershell
mysql -u root -p < .\sql\01_create_database.sql
mysql -u root -p aptis_esol < .\sql\02_schema_and_seed.sql
```

Seed accounts in SQL are only for local development. Change their passwords immediately after importing, or create accounts through the app and keep real credentials in `backend/.env`.
