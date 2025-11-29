@echo off
setlocal

:: Update these paths to match your installation
set BOOST_ROOT=C:\local\boost_1_83_0
set MINGW_PATH=C:\mingw64\bin

:: Add MinGW to PATH
set PATH=%MINGW_PATH%;%PATH%

echo Compiling server...
g++ -std=c++17 -I%BOOST_ROOT% -I. -o flux_server.exe simple_server.cpp -L%BOOST_ROOT%\lib64-msvc-14.3 -lws2_32 -lwsock32 -lboost_system-mt -lboost_thread-mt

if %ERRORLEVEL% NEQ 0 (
    echo Compilation failed!
    pause
    exit /b
)

echo.
echo Server compiled successfully!
echo Starting server...
start cmd /k "title Flux Server && echo Server running on port 8080 && echo. && .\flux_server"

echo.
echo Starting web client...
start http://localhost:8000
start cmd /k "title Web Server && python -m http.server 8000 --directory web-client"

echo.
echo To test the chat:
echo 1. Open browser and go to http://localhost:8000
echo 2. Open multiple browser windows to test chat between users
echo.
pause
