param([switch]$SemNavegador)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$url = 'http://127.0.0.1:5174'
try {
    $saude = $null
    try { $saude = Invoke-RestMethod "$url/api/health" -TimeoutSec 2 } catch {}
    if ($saude -and $saude.app -ne 'vnkb-gestao') { throw 'A porta 5174 esta ocupada. Feche a versao anterior do aplicativo e tente novamente.' }
    if (-not $saude) {
        $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
        if (-not $node) { $node = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
        if (-not (Test-Path -LiteralPath $node)) { throw 'Instale o Node.js 24 LTS e execute npm ci nesta pasta.' }
        $versao = (& $node --version).TrimStart('v').Split('.')[0]
        if ([int]$versao -lt 24) { throw 'Este aplicativo precisa de Node.js 24 ou superior.' }
        if (-not (Test-Path 'node_modules\vite\bin\vite.js')) { throw 'Dependencias ausentes. Execute npm ci nesta pasta.' }
        & $node 'node_modules/vite/bin/vite.js' build
        if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel preparar o aplicativo.' }
        $servidor = Start-Process -FilePath $node -ArgumentList 'server.mjs --production' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput 'dev-vite.log' -RedirectStandardError 'dev-vite.err.log' -PassThru
        for ($tentativa = 0; $tentativa -lt 30; $tentativa++) {
            Start-Sleep -Milliseconds 500
            if ($servidor.HasExited) { throw 'O servidor encerrou. Consulte dev-vite.err.log nesta pasta.' }
            try { $saude = Invoke-RestMethod "$url/api/health" -TimeoutSec 1 } catch {}
            if ($saude -and $saude.app -eq 'vnkb-gestao') { break }
        }
        if (-not $saude -or $saude.app -ne 'vnkb-gestao') { throw 'Nao foi possivel iniciar. Consulte dev-vite.err.log.' }
    }
    if (-not $SemNavegador) { Start-Process $url }
    Write-Output "VNKB Gestao ERP + CRM disponivel em $url"
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    if (-not $SemNavegador) { Read-Host 'Pressione Enter para fechar' }
    exit 1
}
