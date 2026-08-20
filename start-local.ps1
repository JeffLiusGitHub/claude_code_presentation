$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "未找到 Node.js。请先安装 Node.js 22.13 或更新版本。" -ForegroundColor Red
    Read-Host "按 Enter 退出"
    exit 1
}

$nodeVersion = node -p "process.versions.node"
Write-Host "Claude Code Request Anatomy" -ForegroundColor Cyan
Write-Host "项目目录：$projectRoot"
Write-Host "Node.js：$nodeVersion"

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
    Write-Host "首次启动，正在安装本地依赖……" -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "依赖安装失败。"
    }
}

Write-Host ""
Write-Host "启动完成后，请打开 http://localhost:3000" -ForegroundColor Green
Write-Host "关闭此窗口可停止本地网站。" -ForegroundColor DarkGray
Write-Host ""

npm run local
