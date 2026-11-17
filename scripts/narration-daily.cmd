@echo off
rem Run by Windows Task Scheduler once a day ("Laro at Aral narration").
rem Makes the next narration clips within the Gemini free limit and writes what
rem happened to narration-log.txt. When no clips are left to make, it removes
rem its own scheduled task, so it does not keep running for nothing.
setlocal
cd /d "%~dp0.."
set "LOG=narration-log.txt"

echo.>> "%LOG%"
echo ===== %DATE% %TIME% =====>> "%LOG%"
"C:\Program Files\nodejs\node.exe" scripts\generate-narration.mjs >> "%LOG%" 2>&1

"C:\Program Files\nodejs\node.exe" -e "const r=require('fs').readFileSync('narration.csv','utf8').split(/\r?\n/).filter(l=>/,(new|redo)$/.test(l)).length;process.exit(r>0?1:0)"
if %ERRORLEVEL%==0 (
  echo All clips are made. Removing the daily task.>> "%LOG%"
  schtasks /Delete /TN "Laro at Aral narration" /F >> "%LOG%" 2>&1
)
endlocal
