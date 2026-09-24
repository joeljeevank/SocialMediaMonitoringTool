@echo off
title GitHub Push - SocialMediaMonitoringTool
cd /d "%~dp0"
echo ====================================================
echo  Pushing SocialMediaMonitoringTool to GitHub
echo  Repository: https://github.com/joeljeevank/SocialMediaMonitoringTool
echo ====================================================
echo.
echo [1/2] Pushing to 'backend' branch...
git push origin backend
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Push to 'backend' failed. Please check your credentials above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Pushing to 'main' branch...
git push origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Push to 'main' failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo  SUCCESS! Both 'backend' and 'main' pushed to GitHub!
echo ====================================================
pause
