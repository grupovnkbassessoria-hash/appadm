# APP ADM — DOC Finança 360

Aplicativo web em HTML, CSS e JavaScript, servido e compilado pelo Vite.

## Executar no Windows

Abra `Iniciar APP ADM.cmd`. O inicializador usa o Node.js instalado (ou o runtime local do Codex), inicia o servidor em segundo plano e abre o navegador em http://127.0.0.1:5174. A porta fixa preserva a origem dos dados do navegador. Ao abrir novamente, reutiliza o servidor ativo.

Para criar o atalho na Área de Trabalho, execute no PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\criar-atalho.ps1
```

Em uma instalação nova, instale Node.js 24 LTS e execute `npm ci`. Ao trocar Linux por Windows, reinstale as dependências com `npm ci`, pois algumas são específicas do sistema operacional.

## Estrutura

- `index.html`: telas e estrutura da interface.
- `style.css`: estilos.
- `app.js`: regras, interação, armazenamento e backup.
- `data.js`: dados iniciais.
- `assets/`: logo e modelo de documento.
- `dist/`: resultado de `npm run build`, não versionado.
- `.github/workflows/backup-completo.yml`: backup do código no GitHub Actions; a execução Linux é própria do serviço e não impede uso no Windows.

## Dados e serviços

Os registros ficam no `localStorage` do navegador e a sessão no `sessionStorage`. O GitHub não transfere esses registros. Para migrar os dados do Linux, exporte o backup pelo aplicativo de origem e importe no Windows. Use sempre o mesmo navegador e endereço.

Ícones, gráficos, consultas de CNPJ/CEP e geração de QR Code usam serviços externos e precisam de internet. Arquivos `.env*` são locais e ignorados pelo Git. As pastas `api/` presentes nesta cópia não contêm implementação de servidor.

## Desenvolvimento

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
npm run build
```
