@echo off
rem Start local preview server and open the app in browser
cd /d %~dp0
echo Starting BE:FIRST HUB preview at http://localhost:8787
echo (Close this window to stop the preview)
start "" http://localhost:8787
python -m http.server 8787
