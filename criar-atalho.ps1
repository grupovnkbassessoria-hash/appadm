$ErrorActionPreference = 'Stop'
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$atalho = $shell.CreateShortcut((Join-Path $desktop 'APP ADM.lnk'))
$atalho.TargetPath = Join-Path $PSScriptRoot 'Iniciar APP ADM.cmd'
$atalho.WorkingDirectory = $PSScriptRoot
$atalho.Description = 'Abrir VNKB Gestao ERP + CRM'
$atalho.WindowStyle = 7
$atalho.Save()
Write-Output "Atalho criado em $desktop"
