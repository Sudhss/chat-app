@echo off
echo Starting web server...
start http://localhost:8000
python -m http.server 8000 --directory web-client
