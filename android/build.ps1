Set-Location "D:\New folder\tenant site\RentalHubMobile\android"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$logFile = "D:\New folder\tenant site\RentalHubMobile\android\build.log"
"Starting build at $(Get-Date)" | Out-File -FilePath $logFile
& "D:\New folder\tenant site\RentalHubMobile\android\gradlew.bat" assembleDebug --no-daemon 2>&1 | Out-File -FilePath $logFile -Append
"Build finished at $(Get-Date)" | Out-File -FilePath $logFile -Append
