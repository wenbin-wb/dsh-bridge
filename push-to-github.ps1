#!/usr/bin/env pwsh
# DSH Bridge - GitHub 推送脚本
# 执行前请先在 GitHub 创建仓库: https://github.com/new

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DSH Bridge - GitHub 推送向导" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Git 状态
Write-Host "[1/4] 检查 Git 仓库状态..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "  ⚠ 有未提交的更改:" -ForegroundColor Red
    Write-Host $gitStatus
    exit 1
}
Write-Host "  ✓ 工作区干净" -ForegroundColor Green
Write-Host ""

# 显示提交历史
Write-Host "[2/4] 提交历史:" -ForegroundColor Yellow
git log --oneline --all
Write-Host ""

# 显示远程仓库
Write-Host "[3/4] 远程仓库配置:" -ForegroundColor Yellow
git remote -v
Write-Host ""

# 推送提示
Write-Host "[4/4] 准备推送到 GitHub" -ForegroundColor Yellow
Write-Host ""
Write-Host "在推送之前，请确保:" -ForegroundColor Cyan
Write-Host "  1. ✓ 已在 GitHub 创建仓库: dsh-bridge" -ForegroundColor White
Write-Host "  2. ✓ 仓库地址: https://github.com/wenbin-wb/dsh-bridge" -ForegroundColor White
Write-Host "  3. ✓ 仓库为空 (不要勾选 README/gitignore/license)" -ForegroundColor White
Write-Host ""

# 询问是否继续
$continue = Read-Host "是否现在推送? (y/n)"
if ($continue -ne "y") {
    Write-Host "已取消推送" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "正在推送..." -ForegroundColor Green
Write-Host ""

# 推送
try {
    git push -u origin main
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ 推送成功!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "访问您的仓库:" -ForegroundColor Cyan
    Write-Host "https://github.com/wenbin-wb/dsh-bridge" -ForegroundColor White
    Write-Host ""
    Write-Host "下一步:" -ForegroundColor Yellow
    Write-Host "  1. 查看 README.md 是否正确显示" -ForegroundColor White
    Write-Host "  2. 创建 Release (可选): v1.0.0" -ForegroundColor White
    Write-Host "  3. 发布到 npm (可选): npm publish" -ForegroundColor White
    Write-Host "  4. 添加徽章到 README (可选)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ 推送失败!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因:" -ForegroundColor Yellow
    Write-Host "  1. 仓库不存在 - 请先在 GitHub 创建" -ForegroundColor White
    Write-Host "  2. 没有推送权限 - 检查 Git 凭证" -ForegroundColor White
    Write-Host "  3. 网络问题 - 检查网络连接" -ForegroundColor White
    Write-Host ""
    Write-Host "手动推送命令:" -ForegroundColor Cyan
    Write-Host "  git push -u origin main" -ForegroundColor White
    Write-Host ""
    Write-Host "使用 Token 推送:" -ForegroundColor Cyan
    Write-Host "  git push https://YOUR_TOKEN@github.com/wenbin-wb/dsh-bridge.git main" -ForegroundColor White
    Write-Host ""
    exit 1
}
