# VNKB Gestão — ERP + CRM

Sistema integrado para o relacionamento com clientes e a operação da empresa. A versão 2 inicia sem dados de demonstração e sem senha padrão. O atalho **APP ADM** continua abrindo http://127.0.0.1:5174.

## Primeiro acesso no Windows

1. Abra `Iniciar APP ADM.cmd` ou o atalho **APP ADM** na Área de Trabalho.
2. Informe a empresa, seu nome, e-mail e uma senha com pelo menos 10 caracteres.
3. Cadastre usuários e escolha os perfis em **Configurações**.
4. Cadastre produtos/serviços e comece pelos clientes ou leads.

O inicializador compila a interface, inicia o servidor em segundo plano e abre o navegador. Ao abrir novamente, reutiliza o servidor ativo. Requer Node.js 24 ou superior e dependências instaladas; neste computador também encontra o runtime do Codex. Em uma instalação nova, use Node.js 24 LTS e execute `npm ci`.

O aplicativo funciona sem internet neste computador enquanto o servidor estiver iniciado. Fechar o navegador não encerra o servidor. O endereço é restrito ao computador local; não há acesso remoto ou publicação na internet automática.

## Fluxo integrado

- **Lead → cliente e oportunidade:** a conversão cria os dois cadastros e mantém o histórico do lead.
- **Proposta aprovada → pedido:** preserva cliente, itens e desconto, com proteção contra geração duplicada.
- **Pedido → receita / compra → despesa:** cria lançamento pendente; revise o vencimento e registre o pagamento quando ocorrer.
- **Compra → estoque:** o botão Receber produtos cria entradas dos produtos físicos vinculados e marca a compra recebida.
- **Pedido → estoque:** o botão Entregar produtos cria saídas e conclui o pedido. A operação é atômica e bloqueada se faltar saldo.
- Os movimentos gerados por documentos ficam protegidos contra edição/exclusão; correções de saldo são feitas com movimentos de ajuste.
- Valores de documentos que já geraram financeiro ficam protegidos contra alteração. Registros com vínculos não podem ser excluídos indiscriminadamente.

## Módulos disponíveis

| Área | Recursos locais |
| --- | --- |
| CRM | Leads, clientes PF/PJ, empresas, tags, qualificação manual, responsáveis e distribuição de leads |
| Vendas | Oportunidades, Kanban com etapas personalizáveis, probabilidades, motivos de perda, propostas com itens e versões, pedidos |
| Relacionamento | Registro de ligações/conversas, tarefas, follow-ups, agenda mensal e exportação ICS |
| Atendimento | Chamados, prioridade, prazo de SLA, satisfação registrada e base interna de conhecimento |
| Marketing | Planejamento de campanhas por canal/tag e regras de criação automática de tarefas |
| ERP | Produtos/serviços, preços padrão/especial, fornecedores, compras, entradas/saídas de estoque |
| Financeiro | Contas a receber/pagar, baixas, saldo realizado, vencimentos e comissões sobre receitas pagas |
| Fiscal | Registro de documentos emitidos externamente e anexos XML/PDF; acesso ao Emissor Nacional |
| Pessoas | Colaboradores, salários, benefícios e lançamentos internos de folha |
| Frota | Veículos, licenciamento, quilometragem e despesas |
| Administrativo | Contratos, vigência, documentos e anexos |
| Gestão | Dashboard, relatórios por período, desempenho por responsável, CSV, backup/restauração e auditoria |
| Acesso | Administrador, gestor, vendedor, atendimento e financeiro; módulos personalizados por usuário |

## Integrações e limites desta instalação

E-mail/WhatsApp nos contatos abrem os respectivos aplicativos para envio manual. O registro da conversa é feito no módulo Comunicação. Nenhuma mensagem é disparada automaticamente e nenhuma caixa de entrada é sincronizada.

Há uma API de captação funcional em `POST /api/capture`, desabilitada inicialmente. O administrador habilita em Configurações e consulta a chave em Integrações. O conector deve enviar JSON com `name`, `email`, `phone` e `notes`, usando o cabeçalho `X-Capture-Key`. A chave fica no servidor do conector, não no código de formulários públicos. O endereço local não é acessível por Google, Meta ou WordPress externos.

WhatsApp Business, e-mail, Google/Outlook, anúncios, assinatura eletrônica, emissão fiscal, bancos, IA, transcrição, chatbot e notificações push **não estão conectados**. Exigem implementação dos respectivos conectores, credenciais e, conforme o serviço, servidor HTTPS. A tela Integrações informa essa condição. A previsão de vendas é matemática, baseada nas probabilidades; não usa IA.

A interface é responsiva, mas não é um aplicativo nativo Android/iOS. Não há sincronização offline entre dispositivos, geolocalização, multiempresa isolada, folha legal/eSocial, conciliação bancária ou emissão oficial de boletos/notas. As empresas cadastradas no CRM são relacionamentos da organização configurada. Relatórios de folha são controles internos, sem cálculo automático de obrigações trabalhistas.

## Dados zerados e armazenamento

A primeira abertura desta versão remove apenas as chaves antigas `erp_*` e `doc_financa_*` do armazenamento do navegador e a sessão ERP antiga. Não importa nem restaura cadastros anteriores. A limpeza ocorre no navegador/origem em que a versão nova for aberta; outros perfis ou computadores são independentes.

A base nova está em `local-data/gestao.sqlite`. Registros, anexos, senhas derivadas, sessões, versões e auditoria ficam no SQLite. Nenhum cadastro comercial, usuário ou senha de demonstração é criado. O primeiro administrador é definido pelo usuário.

**Não exclua `local-data` para atualizar o programa.** A pasta é ignorada pelo Git e pelo backup de código no GitHub Actions. O GitHub armazena o código, não os registros da empresa. Proteja o acesso ao computador e aos backups; o arquivo do banco não é criptografado em repouso.

- **Backup de dados:** Configurações → Exportar backup. Inclui registros, anexos e versões; não inclui senhas/sessões nem a chave de integração.
- **Restauração:** aceita JSON desta versão até 7 MB; substitui os registros atomicamente e mantém usuários/configurações atuais, recuperando as etapas do funil necessárias. Responsáveis inexistentes ficam sem atribuição. O histórico da restauração é auditado.
- **Backup completo ou base maior:** com o servidor parado, copie toda a pasta `local-data`, incluindo eventuais arquivos auxiliares do SQLite. Essa cópia inclui credenciais e precisa ser protegida. Restaure com o servidor parado.
- **Zerar novamente:** Configurações → Zerar dados operacionais. Exige digitar `ZERAR DADOS`, apaga registros/anexos/histórico e mantém empresa e usuários.
- Anexos individuais: até 5 MB. CSV: até 2.000 linhas, com validação atômica e deduplicação por e-mail.

## Estrutura técnica

- `index.html`, `app.js`, `style.css`: interface, navegação e formulários.
- `crm-model.mjs`: modelos compartilhados de ERP/CRM, campos, regras de perfis e etapas padrão.
- `server.mjs`: API HTTP, SQLite, autenticação, validação, automações e fluxos entre módulos.
- `public/brand.svg`: identidade visual local, sem dependência de CDN.
- `tests/integration.test.mjs`: testes em banco temporário, separado da instalação real.
- `iniciar-app.ps1`, `Iniciar APP ADM.cmd`, `criar-atalho.ps1`: inicialização e atalho Windows.
- `dist/`: interface compilada, recriada pelo inicializador e ignorada pelo Git.

```sh
npm ci
npm run dev
npm run build
npm start
npm test
```

`npm run dev` usa o servidor da aplicação com Vite. `npm start` serve o resultado compilado. Variáveis opcionais: `PORT` (padrão 5174) e `APP_DATA_DIR` (padrão local-data). A API valida o host local e não libera CORS. Sessões usam cookie HttpOnly/SameSite e expiram em 12 horas; senhas usam scrypt. As permissões são verificadas no servidor.

A versão exige um processo Node com disco persistente. Publicar apenas `dist` em hospedagem estática/Vercel não disponibiliza a API ou o banco. Uma implantação externa precisa de adaptação de hospedagem e segurança, além de backup persistente.

## Validação

Os testes cobrem instalação vazia, autenticação, distribuição e conversão de leads, automações, versões de propostas, pedidos/financeiro, concorrência, importação atômica, estoque, recebimento/entrega, permissões, captação autenticada, anexos, backup/restauração e reset. A interface foi conferida em navegador desktop e em largura de 390 px, usando uma base temporária.
