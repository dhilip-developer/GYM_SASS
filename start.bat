@echo off
echo ==============================================
echo           Starting GymOS Development
echo ==============================================
echo.

echo Starting GymOS Backend (Server)...
start "GymOS Backend" cmd /k "cd server && npm run dev"

echo Starting GymOS Frontend (Client)...
start "GymOS Frontend" cmd /k "cd client && npm run dev"

echo.
echo Both services are booting up in separate windows!
echo - Backend will be available on port 3000
echo - Frontend will be available on port 5173
echo.
pause
