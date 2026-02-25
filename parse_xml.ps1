$content = [System.IO.File]::ReadAllText('D:/FitAi/FitAI/launcher_dump.xml')
$idx = $content.IndexOf('FitAI - AI Fitness Coach')
if ($idx -ge 0) { Write-Host $content.Substring($idx, 500) } else { Write-Host 'NOT FOUND' }


