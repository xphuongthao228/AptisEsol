$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot ".env"

function Read-EnvFile {
    $values = [ordered]@{}
    if (-not (Test-Path $envFile)) {
        return $values
    }

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
        $values[$name] = $value
    }

    return $values
}

function Quote-EnvValue([string] $value) {
    $escaped = $value.Replace('"', '\"')
    return '"' + $escaped + '"'
}

$apiKey = Read-Host "Paste your DeepSeek API key"
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "DEEPSEEK_API_KEY is empty. Nothing changed." -ForegroundColor Yellow
    exit 1
}

$model = Read-Host "DeepSeek model [deepseek-chat]"
if ([string]::IsNullOrWhiteSpace($model)) {
    $model = "deepseek-chat"
}

$values = Read-EnvFile
$values["DEEPSEEK_API_KEY"] = Quote-EnvValue $apiKey.Trim()
$values["DEEPSEEK_MODEL"] = Quote-EnvValue $model.Trim()
$values["DEEPSEEK_BASE_URL"] = Quote-EnvValue "https://api.deepseek.com"

$lines = @(
    "# Local backend environment. Do not commit this file.",
    "# Created by setup-ai.ps1."
)

foreach ($key in $values.Keys) {
    $lines += "$key=$($values[$key])"
}

Set-Content -Path $envFile -Value $lines -Encoding UTF8

Write-Host "Saved DeepSeek config to backend/.env" -ForegroundColor Green
Write-Host "Start backend with: .\run-backend.ps1" -ForegroundColor Cyan
