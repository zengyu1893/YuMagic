@echo off
chcp 437 > nul
cd /d "%~dp0"
echo ============================================
echo   Clean Build - 完全重新编译
echo ============================================
echo.
echo [1/3] 删除旧构建产物...
if exist "dist" rd /s /q "dist"
echo [OK] dist 已删除
echo.
echo [2/3] npm run build...
call npm run build
if %errorlevel% neq 0 (
    echo [FAIL] 构建失败！
    pause
    exit /b 1
)
echo.
echo [3/3] 完成！
echo ============================================
pause
