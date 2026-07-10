$ErrorActionPreference = "Stop"
$logFile = "D:\New folder\tenant site\RentalHubMobile\android\build.log"
$androidDir = "D:\New folder\tenant site\RentalHubMobile\android"

Set-Location $androidDir

"Build started at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $logFile
"Running: gradlew.bat assembleDebug --no-daemon" | Out-File $logFile -Append

$process = Start-Process -FilePath "cmd" -ArgumentList "/c", "gradlew.bat", "assembleDebug", "--no-daemon" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$logFile.tmp" -RedirectStandardError "$logFile.err"

"Exit code: $($process.ExitCode)" | Out-File $logFile -Append
"Build finished at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $logFile -Append

if (Test-Path "$logFile.tmp") {
    Get-Content "$logFile.tmp" | Out-File $logFile -Append
    Remove-Item "$logFile.tmp" -Force
}
if (Test-Path "$logFile.err") {
    Get-Content "$logFile.err" | Out-File $logFile -Append
    Remove-Item "$logFile.err" -Force
}
