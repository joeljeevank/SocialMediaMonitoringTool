@echo off
title GitHub Push - SocialMediaMonitoringTool
cd /d "%~dp0"
echo ====================================================
echo  Pushing SocialMediaMonitoringTool to GitHub
echo  Repository: https://github.com/joeljeevank/SocialMediaMonitoringTool
echo ====================================================
echo.
echo [1/3] Pushing to 'frontend-1' branch...
git push origin frontend-1 --force
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Push to 'frontend-1' failed. Please check your credentials above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Pushing to 'backend' branch...
git push origin backend
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Push to 'backend' failed. Please check your credentials above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Pushing to 'main' branch...
git push origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Push to 'main' failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo  SUCCESS! 'frontend-1', 'backend', and 'main' pushed to GitHub!
echo ====================================================
pause

