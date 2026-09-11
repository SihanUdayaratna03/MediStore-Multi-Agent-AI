# MediStore AI - Start All Services
Write-Host "Starting MediStore AI..." -ForegroundColor Cyan

# scripts/ -> project root
$root = Split-Path -Parent $PSScriptRoot

# Start V2 Backend (port 8000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; .\venv\Scripts\activate; uvicorn backend.api.v2_server:app --reload --port 8000"

# Start V3 Backend (port 8001)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; .\venv\Scripts\activate; uvicorn backend.api.v3_server:app --reload --port 8001"

# Start RAG Backend (port 8002)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; .\venv\Scripts\activate; uvicorn backend.main:app --reload --port 8002"

# Start Frontend (port 5173)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "All services starting in separate windows!" -ForegroundColor Green
Write-Host "  - V2 Backend (Diabetes & Care Map) : http://localhost:8000" -ForegroundColor Yellow
Write-Host "  - V3 Backend (Complication Risk)   : http://localhost:8001" -ForegroundColor Yellow
Write-Host "  - RAG Backend (Doc Intelligence)   : http://localhost:8002" -ForegroundColor Yellow
Write-Host "  - Frontend                         : http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Open your browser at: http://localhost:5173" -ForegroundColor Cyan
