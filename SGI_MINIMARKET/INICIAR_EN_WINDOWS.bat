@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo.
echo ==========================================
echo    SGI MINIMARKET - SPRINT 4
echo ==========================================
echo.
echo Debes EXTRAER TODO el ZIP antes de usar este archivo.
echo.
where py >nul 2>nul
if not errorlevel 1 goto usar_py
where python >nul 2>nul
if not errorlevel 1 goto usar_python
echo No se encontro Python en PATH.
echo Instala Python o abre la carpeta con VS Code y Live Server.
pause
exit /b 1
:usar_py
start "Servidor local SGI" /D "%~dp0" cmd /k "py -m http.server 5500 --bind 127.0.0.1"
goto abrir
:usar_python
start "Servidor local SGI" /D "%~dp0" cmd /k "python -m http.server 5500 --bind 127.0.0.1"
:abrir
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5500/index.html"
echo.
echo Abre el navegador en http://127.0.0.1:5500/
echo Para detener el servidor, cierra la ventana del servidor local.
pause
