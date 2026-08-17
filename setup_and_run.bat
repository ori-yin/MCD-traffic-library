@echo off
chcp 65001 >nul

REM [FIX] OneDrive 路径下 cd /d "%~dp0" 偶尔失败, 改用 pushd + 错误处理
pushd "%~dp0" 2>nul
if errorlevel 1 (
    echo [ERROR] Cannot enter project directory: %~dp0
    echo Cause: OneDrive sync lock or path permission issue.
    echo Fix: Copy project to non-OneDrive path, e.g. C:\projects\mcd-report-archive\
    pause
    exit /b 1
)

echo ==============================
echo   IT-traffic 图书馆 - Launch
echo   CWD: %CD%
echo ==============================
echo.

:: ========== Check Python ==========
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.11+
    echo Download: https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo [OK] Python %PYVER%
echo.

:: ========== Create venv ==========
if not exist "venv\Scripts\activate.bat" (
    echo [1/4] Creating virtual environment...
    python -m venv --system-site-packages venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create venv
        pause
        exit /b 1
    )
    echo       Done!
) else (
    echo [1/4] venv already exists, skipping
)
echo.

:: Activate venv
call venv\Scripts\activate.bat

:: ========== Check dependencies ==========
echo [2/4] Checking dependencies...

set NEED_INSTALL=0

python -c "import fastapi"      >nul 2>&1 || (echo       [X] fastapi      missing & set NEED_INSTALL=1)
python -c "import uvicorn"      >nul 2>&1 || (echo       [X] uvicorn      missing & set NEED_INSTALL=1)
python -c "import jinja2"       >nul 2>&1 || (echo       [X] jinja2       missing & set NEED_INSTALL=1)
python -c "import multipart"    >nul 2>&1 || (echo       [X] multipart    missing & set NEED_INSTALL=1)

if %NEED_INSTALL%==0 (
    echo       All dependencies OK, skipping install
    goto :init_db
)

echo.
echo       Installing missing packages (CN mirror)...
echo.
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com
if %errorlevel% neq 0 (
    echo.
    echo [!] Aliyun mirror failed, trying Tsinghua mirror...
    pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn
)
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Install failed. Check your network.
    pause
    exit /b 1
)
echo.
echo       Install done!

:: ========== Init DB ==========
:init_db
echo.
echo [3/4] Initializing database...
python -m app.init_db
echo.

:: ========== Launch ==========
echo ==============================
echo [4/4] Starting uvicorn...

echo   本机访问: http://localhost:8001
echo   内网访问: http://你的本机IP:8001
echo   (查 IP 命令另开 cmd 跑 ipconfig; 防火墙放行 TCP 8001)
echo ==============================
echo.

REM [FIX] 用 start cmd /k 启动独立新窗口, uvicorn 输出/错误都在新窗口, 不闪退
start "IT-traffic 图书馆 - uvicorn" cmd /k uvicorn app.main:app --host 0.0.0.0 --port 8001

REM 主窗口任务完成, 直接退出
exit /b 0
