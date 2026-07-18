# AptisEsol Backend

## Requirements
- JDK 17
- Maven
- MySQL 8

## Database
Create a MySQL database:

```powershell
mysql -u root -p < .\sql\01_create_database.sql
mysql -u root -p aptis_esol < .\sql\02_schema_and_seed.sql
```

Default MySQL credentials are `root/demo123`. Override them if needed:

```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/aptis_esol?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh&characterEncoding=utf8"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="demo123"
$env:JWT_SECRET="replace-with-a-long-random-secret-at-least-32-characters"
```

## Run

```powershell
mvn spring-boot:run
```

Or run with local `.env`:

```powershell
.\run-backend.ps1
```

The script loads `backend/.env` into PowerShell process variables before starting Spring Boot.

Swagger UI: `http://localhost:8080/swagger-ui.html`

## Gmail OTP verification

Registration now sends a 6-digit OTP to the user's Gmail/email. The account is activated only after the user enters the correct OTP. For Gmail SMTP, create a Google App Password, then run the backend with these variables:

```powershell
$env:MAIL_ENABLED="true"
$env:MAIL_USERNAME="your-gmail@gmail.com"
$env:MAIL_PASSWORD="your-google-app-password"
$env:FRONTEND_URL="http://localhost:5173"
mvn spring-boot:run
```

If `MAIL_ENABLED=false`, the backend still creates the OTP and prints it in the backend log for local testing.

You can also put the same variables in `backend/.env` and start with:

```powershell
.\run-backend.ps1
```

## SePay renewal payment

Set the receiving bank account before running the backend:

```powershell
$env:PAYMENT_BANK_ID="MB"
$env:PAYMENT_ACCOUNT_NO="your-bank-account-number"
$env:PAYMENT_ACCOUNT_NAME="YOUR ACCOUNT NAME"
mvn spring-boot:run
```

Configure SePay webhook URL:

```text
POST https://your-public-domain/api/payments/sepay/webhook
```

In SePay dashboard, set the webhook auth method to `None / Khong xac thuc` unless you deliberately configure a token.
If you want to protect the webhook with a token, set this env var and send the same value from SePay in one header:

```text
$env:SEPAY_WEBHOOK_TOKEN="your-sepay-webhook-token"
Authorization: Bearer your-sepay-webhook-token
X-SePay-Token: your-sepay-webhook-token
```

When SePay confirms the transfer and the transfer content contains the generated payment code, the backend marks the payment as `PAID` and adds the package days to the user's Pro expiry date.
Webhook test calls without a matching payment code still return `success: true` so SePay can verify the URL successfully.

## Import questions by CSV

Admin endpoint:

```text
POST /api/questions/import-csv?testId={testId}
Content-Type: multipart/form-data
file: CSV file
```

CSV columns:

```csv
type,content,explanation,points,sort_order,answer1,answer2,answer3,answer4,correct_index
SINGLE_CHOICE,"Read the notice. What changed?","Look for the updated information.",5,1,"The time","The place","The price","The speaker",1
TEXT,"Write an email to a friend about your study plan.","Include reason and time.",10,2,,,,,
```

Seed accounts:
- Admin: `admin@aptis.com` / `123456`
- Student: `student@aptis.com` / `123456`
