# Create necessary directories
New-Item -ItemType Directory -Force -Path "legacy-html"
New-Item -ItemType Directory -Force -Path "legacy-backend"
New-Item -ItemType Directory -Force -Path "apps"

# Move html-platform
if (Test-Path "html-platform") {
    Move-Item -Path "html-platform" -Destination "legacy-html"
    Write-Output "Moved html-platform to legacy-html"
}

# Move backend (Express)
if (Test-Path "backend") {
    Move-Item -Path "backend" -Destination "legacy-backend"
    Write-Output "Moved backend to legacy-backend"
}

# Move frontend (Next.js) to apps
if (Test-Path "frontend") {
    Move-Item -Path "frontend" -Destination "apps"
    Write-Output "Moved frontend to apps/frontend"
}

# Create apps/backend directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "apps\backend"
Write-Output "Created apps/backend"
