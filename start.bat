@echo off
echo ==============================================
echo           Starting GymOS Development
echo ==============================================
echo.

echo Starting GymOS Backend (Server)...
start "GymOS Backend" cmd /k "cd server && npm run dev"

echo Starting GymOS Frontend (Client)...
start "GymOS Frontend" cmd /k "cd client && npm run dev"

echo Starting GymOS Local WhatsApp Agent...
start "GymOS Agent" cmd /k "cd agent && npm start"

echo.
echo All three services are booting up in separate windows!
echo - Backend will be available on port 5000
echo - Frontend will be available on port 5173
echo - Agent will run in the system tray
echo.
pause
