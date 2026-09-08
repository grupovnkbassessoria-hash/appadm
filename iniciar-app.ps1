param([switch]$SemNavegador)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$url = 'http://127.0.0.1:5174'
try {
    $resposta = $null
    try { $resposta = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2 } catch {}
    if ($resposta -and $resposta.Content -notmatch '<title>DOC Finan') {
        throw 'A porta 5174 esta ocupada por outro aplicativo.'
    }
    if (-not $resposta) {
        $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
        if (-not $node) {
            $node = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
        }
        if (-not (Test-Path -LiteralPath $node)) { throw 'Instale o Node.js 24 LTS e execute npm ci nesta pasta.' }
        if (-not (Test-Path 'node_modules\vite\bin\vite.js')) { throw 'Dependencias ausentes. Execute npm ci nesta pasta.' }
        $servidor = Start-Process -FilePath $node -ArgumentList 'node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput 'dev-vite.log' -RedirectStandardError 'dev-vite.err.log' -PassThru
        for ($tentativa = 0; $tentativa -lt 30; $tentativa++) {
            Start-Sleep -Milliseconds 500
            if ($servidor.HasExited) { throw 'O servidor encerrou. Consulte dev-vite.err.log nesta pasta.' }
            try { $resposta = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 1 } catch {}
            if ($resposta) { break }
        }
        if (-not $resposta -or $resposta.Content -notmatch '<title>DOC Finan') { throw 'Nao foi possivel iniciar o aplicativo. Consulte dev-vite.err.log.' }
    }
    if (-not $SemNavegador) { Start-Process $url }
    Write-Output "Aplicativo disponivel em $url"
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    if (-not $SemNavegador) { Read-Host 'Pressione Enter para fechar' }
    exit 1
}
