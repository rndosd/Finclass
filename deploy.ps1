# 🚀 React 프로젝트 GitHub 저장 & Firebase 호스팅 자동화 스크립트 (PowerShell)
# 사용법: .\deploy.ps1 "커밋메시지"

param(
    [string]$CommitMessage = "feat: update project $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

# 프로젝트 설정 (수정 필요)
$PROJECT_NAME = "Finclass"
$GITHUB_USERNAME = "rndosd"
$HOSTING_SERVICE = "firebase"

Write-Host "🚀 Starting deployment process..." -ForegroundColor Blue

# 1. 커밋 메시지 설정
Write-Host "📝 Commit message: $CommitMessage" -ForegroundColor Yellow

# 2. Git 초기화 (필요한 경우)
if (!(Test-Path ".git")) {
    Write-Host "🔧 Initializing Git repository..." -ForegroundColor Blue
    git init
    
    # .gitignore 파일 생성
    @"
node_modules/
build/
.env.local
.env
dist/
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
}

# 3. 변경사항 추가 및 커밋
Write-Host "📦 Adding files to Git..." -ForegroundColor Blue
git add .
git status

Write-Host "💾 Committing changes..." -ForegroundColor Blue
try {
    git commit -m "$CommitMessage"
    Write-Host "✅ Changes committed successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ No changes to commit or commit failed" -ForegroundColor Yellow
}

# 4. GitHub 원격 저장소 설정
try {
    $remoteUrl = git remote get-url origin 2>$null
    if (!$remoteUrl) {
        Write-Host "🔗 Adding GitHub remote..." -ForegroundColor Blue
        
        $repoUrl = Read-Host "Enter your GitHub repository URL (or press Enter for default)"
        if ([string]::IsNullOrWhiteSpace($repoUrl)) {
            $repoUrl = "https://github.com/$GITHUB_USERNAME/$PROJECT_NAME.git"
        }
        
        git remote add origin $repoUrl
        Write-Host "✅ Remote added: $repoUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Remote already exists or error occurred" -ForegroundColor Yellow
}

# 5. GitHub에 푸시
Write-Host "⬆️ Pushing to GitHub..." -ForegroundColor Blue
try {
    git branch -M main
    git push -u origin main
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to push to GitHub" -ForegroundColor Red
    Write-Host "💡 Make sure your GitHub repository exists and you have permission" -ForegroundColor Yellow
    return
}

# 6. 빌드 테스트
Write-Host "🔨 Testing build..." -ForegroundColor Blue
try {
    npm run build
    Write-Host "✅ Build successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed! Please fix errors before deploying" -ForegroundColor Red
    return
}

# 7. Firebase 배포
Write-Host "🌐 Deploying to Firebase..." -ForegroundColor Blue

# Firebase CLI 설치 확인
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue
if (!$firebaseInstalled) {
    Write-Host "📦 Installing Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
}

# Firebase 설정 파일 확인
if (!(Test-Path "firebase.json")) {
    Write-Host "🔧 Firebase configuration not found. Please run 'firebase init hosting' first" -ForegroundColor Yellow
    return
}

# Firebase 배포 실행
try {
    firebase deploy --only hosting
    Write-Host "✅ Firebase deployment successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase deployment failed!" -ForegroundColor Red
    return
}

# 8. 완료 메시지
Write-Host ""
Write-Host "🎉===================================🎉" -ForegroundColor Green
Write-Host "       DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 GitHub Repository: https://github.com/$GITHUB_USERNAME/$PROJECT_NAME" -ForegroundColor Blue
Write-Host "🌐 Live Site: Check your Firebase dashboard for the URL" -ForegroundColor Blue
Write-Host "📝 Commit: $CommitMessage" -ForegroundColor Blue
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Yellow
Write-Host "   • Check your live site"
Write-Host "   • Update README.md with deployment info"
Write-Host "   • Set up environment variables if needed"
Write-Host ""