$file = 'C:\Users\Harsh\AppData\Local\Temp\claude\D--FitAi-FitAI\7447a5a9-d0f3-4b22-a409-6b9f27d6db69\tasks\brwirz0os.output'
$i = 0
while ($i -lt 60) {
    Start-Sleep -Seconds 15
    $last = Get-Content $file | Select-Object -Last 8
    Write-Output ($last -join "`n")
    Write-Output "---"
    if (($last -join ' ') -match 'BUILD SUCCESSFUL|BUILD FAILED|FAILURE') { break }
    $i++
}
