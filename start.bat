@echo off
setlocal
title Naruto Stat Draft
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" (
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
  ) else (
    echo Node.js est absent. Installez Node.js LTS avec npm depuis https://nodejs.org/
    echo Fermez puis rouvrez ce fichier apres installation.
    pause
    exit /b 1
  )
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm est absent. Reinstallez Node.js en incluant npm.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" goto install
if not exist "node_modules\react\package.json" goto install
node -e "for (const p of ['react-dom','lucide-react','@tailwindcss/vite','@vitejs/plugin-react','vite']) require.resolve(p)" >nul 2>nul
if errorlevel 1 goto install
goto launch
:install
echo Installation des dependances. Une connexion Internet est necessaire.
call npm.cmd install --no-audit --no-fund
if errorlevel 1 (
  echo Echec de l'installation. Consultez le message ci-dessus.
  pause
  exit /b 1
)
:launch
if /I "%~1"=="--check" (
  echo Node.js, npm et dependances disponibles.
  exit /b 0
)
echo Naruto Stat Draft : http://127.0.0.1:5173/
echo Gardez cette fenetre ouverte. Ctrl+C pour arreter.
echo Le serveur reste accessible uniquement sur cet ordinateur.
echo Preparation des portraits locaux...
node scripts/download-private-portraits.mjs --if-enabled --if-missing
if errorlevel 1 echo Les portraits n'ont pas pu etre recuperes. Consultez l'erreur ci-dessus ; les avatars restent utilisables.
node -e "fetch('http://127.0.0.1:5173/',{signal:AbortSignal.timeout(800),redirect:'error'}).then(r=>r.text()).then(t=>process.exit(t.includes('Naruto Stat Draft')?0:1)).catch(()=>process.exit(1))" >nul 2>nul
if not errorlevel 1 (
  echo Le jeu est deja demarre. Ouverture du navigateur.
  start "" "http://127.0.0.1:5173/"
  exit /b 0
)
call npm.cmd run dev -- --open --strictPort
if errorlevel 1 (
  echo Le lancement a echoue. Le port 5173 est peut-etre deja utilise.
  echo Fermez l'autre serveur ou consultez le message ci-dessus.
  pause
  exit /b 1
)
endlocal
