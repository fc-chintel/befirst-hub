@echo off
rem Fetch latest news and videos from official RSS feeds
cd /d %~dp0
node scripts\update-data.mjs
echo.
pause
