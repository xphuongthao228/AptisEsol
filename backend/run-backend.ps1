$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot ".env"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -lt 1) {
            return
        }

        $name = $line.Substring(0, $separatorIndex).Trim()
        $value = $line.Substring($separatorIndex + 1).Trim()

        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }

    Write-Host "Loaded backend/.env" -ForegroundColor Green
} else {
    Write-Host "backend/.env not found. Using application.yml defaults." -ForegroundColor Yellow
}

if ($env:MAIL_ENABLED -eq "true" -and [string]::IsNullOrWhiteSpace($env:MAIL_PASSWORD)) {
    Write-Host "MAIL_PASSWORD is empty. Gmail OTP will not send until you fill backend/.env." -ForegroundColor Yellow
}

$mvnCommand = Get-Command mvn -ErrorAction SilentlyContinue
$localMaven = "C:\Users\LENOVO\Downloads\apache-maven-3.9.11-bin\apache-maven-3.9.11\bin\mvn.cmd"

if ($mvnCommand) {
    & $mvnCommand.Source spring-boot:run
} elseif (Test-Path $localMaven) {
    & $localMaven spring-boot:run
} else {
    Write-Host "Cannot find Maven. Install Maven or update localMaven path in run-backend.ps1." -ForegroundColor Red
    exit 1
}
