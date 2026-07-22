import { initialData } from './data.js';

// ============================================================
// MULTI-COMPANY STATE MANAGEMENT
// ============================================================
let GLOBAL_STATE = JSON.parse(localStorage.getItem('erp_global'));
if (!GLOBAL_STATE || !GLOBAL_STATE.users || !GLOBAL_STATE.users.length) {
  GLOBAL_STATE = JSON.parse(JSON.stringify(initialData));
  localStorage.setItem('erp_global', JSON.stringify(GLOBAL_STATE));
} else {
  // Developer Seeding Merge: Ensure new companies and users in initialData are merged into existing localStorage state
  initialData.companies.forEach(ic => {
    if (!GLOBAL_STATE.companies.some(c => c.cnpj === ic.cnpj)) {
      GLOBAL_STATE.companies.push(JSON.parse(JSON.stringify(ic)));
    }
  });
  initialData.users.forEach(iu => {
    if (!GLOBAL_STATE.users.some(u => u.username === iu.username && u.cnpj === iu.cnpj)) {
      GLOBAL_STATE.users.push(iu);
    }
  });
  localStorage.setItem('erp_global', JSON.stringify(GLOBAL_STATE));
}
let ACTIVE_SESSION = null; // { companyId, username, cnpj }
let ERP_DATA = null;       // Active company data (shortcut)

function saveState() {
  if (ACTIVE_SESSION && ERP_DATA) {
    const comp = GLOBAL_STATE.companies.find(c => c.cnpj === ACTIVE_SESSION.cnpj);
    if (comp) comp.data = ERP_DATA;
  }
  localStorage.setItem('erp_global', JSON.stringify(GLOBAL_STATE));
}

function loadCompanyData(cnpj) {
  const comp = GLOBAL_STATE.companies.find(c => c.cnpj === cnpj);
  if (!comp) return null;
  return comp.data;
}

function getActiveCompany() {
  if (!ACTIVE_SESSION) return null;
  return GLOBAL_STATE.companies.find(c => c.cnpj === ACTIVE_SESSION.cnpj) || null;
}

// Charts references
let cashFlowChartInstance = null;
let forecastChartInstance = null;

// Initialize Lucide Icons
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  initLogin();
});

function bootApp() {
  initRouter();
  initTheme();
  initTabs();
  initSidebarCollapse();
  initSidebarSession();
  initDashboard();
  initComercial();
  initCadastro();
  initFiscal();
  initFinanceiro();
  initRH();
  initFrota();
  initEstoque();
  initAdministrativo();
  initRelatorios();
  initModal();
  lucide.createIcons();
}

// ============================================================
// LOGIN MODULE
// ============================================================
function initLogin() {
  const loginLayout = document.getElementById('login-layout');
  const appLayout = document.getElementById('app-layout');

  // Check existing session in sessionStorage
  const savedSession = sessionStorage.getItem('erp_session');
  if (savedSession) {
    ACTIVE_SESSION = JSON.parse(savedSession);
    ERP_DATA = loadCompanyData(ACTIVE_SESSION.cnpj);
    loginLayout.classList.add('hidden');
    appLayout.style.display = '';
    bootApp();
    return;
  }

  // Show login, hide app
  loginLayout.classList.remove('hidden');
  appLayout.style.display = 'none';

  const form = document.getElementById('login-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const cnpjInput = document.getElementById('login-cnpj').value.trim();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error-msg');

    // Helper to sanitize CNPJ
    const cleanCNPJ = (val) => val.replace(/\D/g, '');

    // Validate using cleaned CNPJ comparison
    const user = GLOBAL_STATE.users.find(
      u => cleanCNPJ(u.cnpj) === cleanCNPJ(cnpjInput) && u.username === username && u.password === password
    );

    if (!user) {
      errorMsg.classList.remove('hidden');
      document.getElementById('login-password').value = '';
      return;
    }

    errorMsg.classList.add('hidden');
    ACTIVE_SESSION = { cnpj: user.cnpj, username: user.username };
    sessionStorage.setItem('erp_session', JSON.stringify(ACTIVE_SESSION));
    ERP_DATA = loadCompanyData(user.cnpj);

    loginLayout.classList.add('hidden');
    appLayout.style.display = '';
    bootApp();
  });

  lucide.createIcons();
}

function doLogout() {
  saveState();
  sessionStorage.removeItem('erp_session');
  ACTIVE_SESSION = null;
  ERP_DATA = null;
  // Reload to reset all state
  window.location.reload();
}

function initSidebarSession() {
  const sidebarFooter = document.querySelector('.sidebar-footer');
  if (!sidebarFooter || sidebarFooter.dataset.sessionInjected) return;
  sidebarFooter.dataset.sessionInjected = 'true';

  const comp = getActiveCompany();
  const companyName = comp ? comp.razaoSocial : 'Empresa';

  // Update user info
  const userNameEl = sidebarFooter.querySelector('.user-name');
  const userRoleEl = sidebarFooter.querySelector('.user-role');
  const avatarEl = sidebarFooter.querySelector('.avatar');

  if (userNameEl) userNameEl.textContent = ACTIVE_SESSION?.username || 'Usuário';
  if (userRoleEl) userRoleEl.innerHTML = `<span class="active-company-badge">${companyName}</span>`;
  if (avatarEl) avatarEl.textContent = (ACTIVE_SESSION?.username || 'U').slice(0, 3).toUpperCase();

  // Add logout button
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'logout-btn';
  logoutBtn.innerHTML = '<i data-lucide="log-out"></i> Sair do Sistema';
  logoutBtn.addEventListener('click', doLogout);
  sidebarFooter.appendChild(logoutBtn);
  lucide.createIcons();
}

function initSidebarCollapse() {
  const appLayout = document.getElementById("app-layout");
  const collapseBtn = document.getElementById("sidebar-collapse");
  if (!appLayout || !collapseBtn || collapseBtn.dataset.bound === "true") return;

  const setCollapsed = (collapsed) => {
    appLayout.classList.toggle("sidebar-collapsed", collapsed);
    collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    collapseBtn.setAttribute("aria-label", collapsed ? "Expandir menu" : "Recolher menu");
    collapseBtn.setAttribute("title", collapsed ? "Expandir menu" : "Recolher menu");
    collapseBtn.innerHTML = `<i data-lucide="${collapsed ? "panel-left-open" : "panel-left-close"}"></i>`;
    localStorage.setItem("doc_financa_sidebar_collapsed", collapsed ? "true" : "false");
    lucide.createIcons();
  };

  collapseBtn.dataset.bound = "true";
  setCollapsed(localStorage.getItem("doc_financa_sidebar_collapsed") === "true");
  collapseBtn.addEventListener("click", () => setCollapsed(!appLayout.classList.contains("sidebar-collapsed")));
}

// Router logic (SPA View switcher)
function initRouter() {
  const navItems = document.querySelectorAll(".nav-item");
  const viewContents = document.querySelectorAll(".view-content");
  const titleEl = document.getElementById("current-view-title");
  const subtitleEl = document.getElementById("current-view-subtitle");

  const viewInfo = {
    dashboard: { title: "Dashboard", sub: "Visão geral da empresa e pendências operacionais" },
    comercial: { title: "Gestão Comercial", sub: "Propostas comerciais, pedidos ativos e contratos ativos" },
    cadastro: { title: "Base de Cadastros", sub: "Controle central de clientes, fornecedores, pessoal, frotas e itens de portfólio" },
    fiscal: { title: "Faturamento & Fiscal", sub: "Emissão de notas fiscais oficiais de produtos/serviços e relatórios de contabilidade" },
    financeiro: { title: "Painel Financeiro", sub: "Fluxo de caixa, relatórios de previsões financeiras e contas a pagar/receber" },
    rh: { title: "Recursos Humanos (RH)", sub: "Quadros funcionais, contratos corporativos e emissão de holerites" },
    frota: { title: "Gestão de Frotas", sub: "Controle de despesas, manutenção, documentações obrigatórias e consumo" },
    estoque: { title: "Estoque & Logística", sub: "Balanço físico, custos e prazos de validade de insumos" },
    administrativo: { title: "Área Administrativa", sub: "Arquivos corporativos, alvarás reguladores e relatórios consolidados" },
    relatorios: { title: "Relatórios", sub: "Visão consolidada de todas as informações do app" }
  };

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const viewId = item.getAttribute("data-view");
      navItems.forEach(el => el.classList.remove("active"));
      item.classList.add("active");
      viewContents.forEach(view => {
        view.classList.remove("active");
        if (view.id === `view-${viewId}`) view.classList.add("active");
      });
      if (viewInfo[viewId]) {
        titleEl.textContent = viewInfo[viewId].title;
        subtitleEl.textContent = viewInfo[viewId].sub;
      }
      if (viewId === 'dashboard') {
        initDashboard();
      } else if (viewId === 'financeiro') {
        renderForecastTable();
      } else if (viewId === 'relatorios') {
        renderRelatorios();
      }
    });
  });
}

// Light / Dark Theme toggle
function initTheme() {
  const btn = document.getElementById("theme-toggle");
  const sunIcon = btn.querySelector("i");
  
  // Default is dark theme, toggle light class
  btn.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    sunIcon.setAttribute("data-lucide", isLight ? "moon" : "sun");
    lucide.createIcons();
  });
}

// Tabs Navigation logic inside views
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetContentId = tab.getAttribute("data-tab");
      const parentView = tab.closest(".view-content");
      
      parentView.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
      parentView.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      
      tab.classList.add("active");
      const content = document.getElementById(targetContentId);
      if (content) content.classList.add("active");
    });
  });
}

// Helper formatting utilities
const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDateBR = (value) => {
  if (!value) return "–";
  if (typeof value !== "string") return value;
  const isoDate = value.split("T")[0];
  const parts = isoDate.split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// 1. DASHBOARD CONTROLLER
function initDashboard() {
  setupDashboardWindows();
  setupClientTaskBoard();
  renderDashboardKpis();
  renderDashboardNotifications();
  renderClientTaskBoard();
}

function setupDashboardWindows() {
  const buttons = document.querySelectorAll("[data-dashboard-window]");
  if (!buttons.length) return;
  const savedWindow = localStorage.getItem("doc_financa_dashboard_window") || "resumo";
  setDashboardWindow(savedWindow);
  buttons.forEach(button => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      setDashboardWindow(button.dataset.dashboardWindow || "resumo");
    });
  });
}

function setDashboardWindow(windowName) {
  const validWindow = ["resumo", "tarefas", "alertas"].includes(windowName) ? windowName : "resumo";
  document.querySelectorAll("[data-dashboard-window]").forEach(button => {
    button.classList.toggle("active", button.dataset.dashboardWindow === validWindow);
  });
  document.querySelectorAll("[data-dashboard-panel]").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.dashboardPanel === validWindow);
  });
  localStorage.setItem("doc_financa_dashboard_window", validWindow);
}

function renderDashboardKpis() {
  const container = document.getElementById("dashboard-kpis");
  if (!container || !ERP_DATA) return;

  const receber = sumBy(ERP_DATA.financeiro.contasReceber, "valor");
  const pagar = sumBy(ERP_DATA.financeiro.contasPagar, "valor");
  const documentos = ERP_DATA.administrativo.documentos.length;
  const colaboradores = ERP_DATA.cadastro.colaboradores.length;
  const pendingTasks = getClientTasks().filter(task => task.status !== "concluido").length;

  container.innerHTML = [
    ["Contas a receber", formatBRL(receber), "Recebíveis cadastrados"],
    ["Contas a pagar", formatBRL(pagar), "Compromissos em aberto"],
    ["Tarefas de clientes", String(pendingTasks), "Pendências em aberto"],
    ["Colaboradores", String(colaboradores), "Registros ativos"],
    ["Documentos", String(documentos), "Arquivos administrativos"]
  ].map(item => `<div class="report-kpi"><span>${item[0]}</span><strong>${item[1]}</strong><em>${item[2]}</em></div>`).join("");
}

function updateDashboardKPIs() {
  renderDashboardKpis();
  renderDashboardNotifications();
}

function renderDashboardNotifications() {
  const container = document.getElementById("dashboard-notifications");
  if (!container) return;

  const notifications = [];
  const today = new Date();

  // 1. Process Product Expirations
  ERP_DATA.cadastro.produtos.forEach(p => {
    if (p.validade) {
      const expDate = new Date(p.validade);
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        notifications.push({ type: "danger", text: `Produto [${p.nome}] está VENCIDO há ${Math.abs(diffDays)} dias.` });
      } else if (diffDays <= 30) {
        notifications.push({ type: "warning", text: `Produto [${p.nome}] vence em ${diffDays} dias.` });
      }
    }
  });

  // 2. Process Document Expirations
  ERP_DATA.administrativo.documentos.forEach(d => {
    if (d.vencimento) {
      const expDate = new Date(d.vencimento);
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        notifications.push({ type: "danger", text: `Documento [${d.nome}] EXPIRADO.` });
      } else if (diffDays <= 30) {
        notifications.push({ type: "warning", text: `Documento [${d.nome}] vence em ${diffDays} dias.` });
      }
    }
  });

  // 3. Fallback default if clean
  if (notifications.length === 0) {
    notifications.push({ type: "info", text: "Tudo certo! Nenhuma pendência crítica ou vencimento nos próximos 30 dias." });
  }

  container.innerHTML = notifications.map(notif => `
    <div class="notification-item">
      <div class="notification-indicator ${notif.type}"></div>
      <div>${notif.text}</div>
    </div>
  `).join('');
}

const CLIENT_TASK_STATUSES = ["novo", "andamento", "aguardando", "concluido"];

function ensureClientTasksData() {
  if (!ERP_DATA?.administrativo) return [];
  if (!Array.isArray(ERP_DATA.administrativo.tarefasClientes)) {
    ERP_DATA.administrativo.tarefasClientes = [];
  }
  return ERP_DATA.administrativo.tarefasClientes;
}

function getClientTasks() {
  return ensureClientTasksData();
}

function setupClientTaskBoard() {
  ensureClientTasksData();
  populateTaskClientSelect();
  const form = document.getElementById("form-dashboard-task");
  if (form && form.dataset.bound !== "true") {
    form.dataset.bound = "true";
    form.addEventListener("submit", event => {
      event.preventDefault();
      const title = document.getElementById("task-titulo").value.trim();
      const cliente = document.getElementById("task-cliente").value;
      if (!title || !cliente) return;
      getClientTasks().unshift({
        id: nextClientTaskId(),
        cliente,
        titulo: title,
        responsavel: document.getElementById("task-responsavel").value.trim(),
        prazo: document.getElementById("task-prazo").value,
        prioridade: document.getElementById("task-prioridade").value || "normal",
        status: "novo",
        criadoEm: new Date().toISOString()
      });
      saveState();
      form.reset();
      populateTaskClientSelect();
      renderDashboardKpis();
      renderDashboardNotifications();
      renderClientTaskBoard();
    });
  }

  const board = document.getElementById("dashboard-kanban");
  if (board && board.dataset.bound !== "true") {
    board.dataset.bound = "true";
    board.addEventListener("click", event => {
      const button = event.target.closest("[data-task-action]");
      if (!button) return;
      handleClientTaskAction(button.dataset.taskAction, button.dataset.taskId);
    });
  }
}

function populateTaskClientSelect() {
  const select = document.getElementById("task-cliente");
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = "<option value=''>Selecione o Cliente</option>" + clientSelectOptionsHtml();
  if (currentValue && ERP_DATA.cadastro.clientes.some(client => client.nome === currentValue)) {
    select.value = currentValue;
  }
}

function nextClientTaskId() {
  const usedIds = new Set(getClientTasks().map(task => task.id));
  let counter = getClientTasks().length + 1;
  let id = `TAR-${String(counter).padStart(3, "0")}`;
  while (usedIds.has(id)) {
    counter += 1;
    id = `TAR-${String(counter).padStart(3, "0")}`;
  }
  return id;
}

function handleClientTaskAction(action, taskId) {
  const tasks = getClientTasks();
  const task = tasks.find(item => item.id === taskId);
  if (!task) return;
  const currentIndex = CLIENT_TASK_STATUSES.indexOf(task.status);
  if (action === "next" && currentIndex < CLIENT_TASK_STATUSES.length - 1) {
    task.status = CLIENT_TASK_STATUSES[currentIndex + 1];
  }
  if (action === "prev" && currentIndex > 0) {
    task.status = CLIENT_TASK_STATUSES[currentIndex - 1];
  }
  if (action === "done") {
    task.status = "concluido";
  }
  if (action === "delete") {
    if (!confirm("Excluir esta tarefa?")) return;
    const index = tasks.findIndex(item => item.id === taskId);
    if (index >= 0) tasks.splice(index, 1);
  }
  saveState();
  renderDashboardKpis();
  renderDashboardNotifications();
  renderClientTaskBoard();
}

function renderClientTaskBoard() {
  const tasks = getClientTasks();
  CLIENT_TASK_STATUSES.forEach(status => {
    const column = document.getElementById(`kanban-col-${status}`);
    const count = document.getElementById(`kanban-count-${status}`);
    const items = tasks.filter(task => task.status === status);
    if (count) count.textContent = String(items.length);
    if (!column) return;
    column.innerHTML = items.length
      ? items.map(task => clientTaskCardHtml(task)).join("")
      : `<div class="kanban-empty">Sem tarefas</div>`;
  });
  lucide.createIcons();
}

function clientTaskCardHtml(task) {
  const statusIndex = CLIENT_TASK_STATUSES.indexOf(task.status);
  const priorityClass = `priority-${task.prioridade || "normal"}`;
  const dueLabel = task.prazo ? formatDateBR(task.prazo) : "Sem prazo";
  return `
    <article class="kanban-card ${priorityClass}">
      <div class="kanban-card-top">
        <strong>${escapeHtml(task.titulo)}</strong>
        <span class="task-priority">${escapeHtml(getTaskPriorityLabel(task.prioridade))}</span>
      </div>
      <div class="kanban-client">${escapeHtml(task.cliente)}</div>
      <div class="kanban-meta">
        <span><i data-lucide="calendar"></i>${escapeHtml(dueLabel)}</span>
        <span><i data-lucide="user"></i>${escapeHtml(task.responsavel || "Sem responsável")}</span>
      </div>
      <div class="kanban-actions">
        <button type="button" class="btn btn-secondary btn-icon-only" data-task-action="prev" data-task-id="${task.id}" title="Voltar etapa" ${statusIndex === 0 ? "disabled" : ""}><i data-lucide="arrow-left"></i></button>
        <button type="button" class="btn btn-secondary btn-icon-only" data-task-action="next" data-task-id="${task.id}" title="Avançar etapa" ${statusIndex === CLIENT_TASK_STATUSES.length - 1 ? "disabled" : ""}><i data-lucide="arrow-right"></i></button>
        <button type="button" class="btn btn-secondary btn-icon-only" data-task-action="done" data-task-id="${task.id}" title="Concluir"><i data-lucide="check"></i></button>
        <button type="button" class="btn btn-danger btn-icon-only" data-task-action="delete" data-task-id="${task.id}" title="Excluir"><i data-lucide="trash-2"></i></button>
      </div>
    </article>
  `;
}

function getTaskPriorityLabel(priority) {
  if (priority === "alta") return "Alta";
  if (priority === "baixa") return "Baixa";
  return "Normal";
}

function renderCashFlowChart() {
  const ctx = document.getElementById("cashflow-chart");
  if (!ctx) return;

  if (cashFlowChartInstance) {
    cashFlowChartInstance.destroy();
  }

  const dataPoints = ERP_DATA.financeiro.fluxoCaixa.diario;
  const labels = dataPoints.map(d => d.data);
  const receitas = dataPoints.map(d => d.receita);
  const despesas = dataPoints.map(d => d.despesa);

  const isLight = document.body.classList.contains("light-theme");
  const textColor = isLight ? '#475569' : '#94a3b8';

  cashFlowChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Receitas (R$)',
          data: receitas,
          backgroundColor: '#10b981',
          borderRadius: 6
        },
        {
          label: 'Despesas (R$)',
          data: despesas,
          backgroundColor: '#ef4444',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// 2. COMERCIAL CONTROLLER
const COMMERCIAL_SERVICES_UPGRADE = [
  { id: "SERV-001", nome: "Instalação técnica", precoVenda: 450 },
  { id: "SERV-002", nome: "Manutenção preventiva", precoVenda: 320 },
  { id: "SERV-003", nome: "Consultoria operacional", precoVenda: 180 }
];

let commercialDraftUpgrade = { orcamento: [], pedido: [] };
let commercialEditingUpgrade = { orcamento: null, pedido: null };

function initComercial() {
  buildCommercialUpgradeForms();
  populateClientSelectors();
  setupCommercialUpgradeLauncher("orcamento");
  setupCommercialUpgradeLauncher("pedido");
  setupCommercialUpgradeSubmits();
  setupCommercialActionDelegation();
  setDefaultCommercialDeliveryDate();
  renderCommercialUpgradeDraft("orcamento");
  renderCommercialUpgradeDraft("pedido");
  hideCommercialForm("orcamento");
  hideCommercialForm("pedido");
  renderComercialTables();
  initContratosComerciais();
}

function buildCommercialUpgradeForms() {
  const orcForm = document.getElementById("form-orcamento");
  if (orcForm) {
    const formPanel = orcForm.closest(".panel");
    formPanel?.classList.add("commercial-form-panel", "hidden");
    const title = formPanel?.querySelector(".panel-title");
    if (title) title.textContent = "Novo Orçamento";
    orcForm.className = "commercial-form";
    orcForm.removeAttribute("style");
    orcForm.innerHTML = commercialUpgradeFormHtml("orcamento");
  }

  const orcTab = document.getElementById("tab-orcamentos");
  const orcGrid = orcTab?.querySelector(".section-grid");
  if (orcGrid) orcGrid.classList.add("commercial-list-layout");
  const orcTablePanel = document.getElementById("table-orcamentos-body")?.closest(".panel");
  if (orcTablePanel) {
    const header = orcTablePanel.querySelector(".panel-header");
    const title = header?.querySelector(".panel-title");
    if (title) title.textContent = "Orçamentos";
    if (header && !header.querySelector("[data-commercial-new='orcamento']")) {
      header.insertAdjacentHTML("beforeend", "<button type='button' class='btn btn-primary' data-commercial-new='orcamento'><i data-lucide='plus'></i> Novo Orçamento</button>");
    }
  }

  const pedidosTab = document.getElementById("tab-pedidos");
  if (pedidosTab && !document.getElementById("form-pedido")) {
    const oldPanel = pedidosTab.querySelector(".panel");
    const grid = document.createElement("div");
    grid.className = "section-grid commercial-list-layout";
    const formPanel = document.createElement("div");
    formPanel.className = "panel commercial-form-panel hidden";
    formPanel.innerHTML = "<div class='panel-header'><h3 class='panel-title'>Novo Pedido</h3></div><form id='form-pedido' class='commercial-form'>" + commercialUpgradeFormHtml("pedido") + "</form>";
    grid.appendChild(formPanel);
    if (oldPanel) grid.appendChild(oldPanel);
    pedidosTab.innerHTML = "";
    pedidosTab.appendChild(grid);
  }

  const pedTablePanel = document.getElementById("table-pedidos-body")?.closest(".panel");
  if (pedTablePanel) {
    const header = pedTablePanel.querySelector(".panel-header");
    const title = header?.querySelector(".panel-title");
    if (title) title.textContent = "Pedidos";
    if (header && !header.querySelector("[data-commercial-new='pedido']")) {
      header.insertAdjacentHTML("beforeend", "<button type='button' class='btn btn-primary' data-commercial-new='pedido'><i data-lucide='plus'></i> Novo Pedido</button>");
    }
  }

  const orcHead = document.querySelector("#table-orcamentos-body")?.closest("table")?.querySelector("thead tr");
  if (orcHead) orcHead.innerHTML = "<th>Cód</th><th>Cliente</th><th>Total</th><th>Status</th><th>Ações</th>";
  const pedHead = document.querySelector("#table-pedidos-body")?.closest("table")?.querySelector("thead tr");
  if (pedHead) pedHead.innerHTML = "<th>Código</th><th>Cliente</th><th>Data</th><th>Total</th><th>Previsão</th><th>Status</th><th>Ações</th>";
  lucide.createIcons();
}

function commercialUpgradeFormHtml(kind) {
  const prefix = kind === "orcamento" ? "orc" : "ped";
  const clientFields = kind === "orcamento"
    ? "<div class='form-group'><label>Cliente</label><select class='form-select' id='orc-cliente' required><option value=''>Selecione o Cliente</option></select></div>"
    : "<div class='form-row'><div class='form-group'><label>Cliente</label><select class='form-select' id='ped-cliente' required><option value=''>Selecione o Cliente</option></select></div><div class='form-group'><label>Previsão de Entrega</label><input type='date' class='form-input' id='ped-entrega' required></div></div>";
  const descriptiveField = kind === "orcamento"
    ? "<div class='form-group' style='grid-column:1/-1;'><label>Descritivo completo</label><textarea class='form-textarea' id='orc-descritivo-completo' rows='7' placeholder='Ex: Manutenção de prontuários, assessoria em compras, serviço contábil mensal, atendimento semanal e demais condições do orçamento.'></textarea></div>"
    : "";
  const totalLabel = kind === "orcamento" ? "VALOR FINAL" : "TOTAL DO PEDIDO";
  const buttonLabel = kind === "orcamento" ? "Salvar Orçamento" : "Salvar Pedido";
  const icon = kind === "orcamento" ? "check-circle" : "shopping-bag";
  const cancelButton = "<button type='button' class='btn btn-secondary' data-commercial-action='close-form' data-kind='" + kind + "'><i data-lucide='x'></i> Cancelar</button>";
  return clientFields +
    descriptiveField +
    "<div class='line-item-box'><div class='line-item-title'>Produtos e serviços</div><div class='line-item-entry'>" +
    "<div class='form-group'><label>Tipo</label><select class='form-select' id='" + prefix + "-item-tipo'><option value='Produto'>Produto</option><option value='Serviço'>Serviço</option></select></div>" +
    "<div class='form-group line-item-grow'><label>Produto/Serviço</label><select class='form-select' id='" + prefix + "-item-produto'></select></div>" +
    "<div class='form-group'><label>Quantidade</label><input type='number' class='form-input' id='" + prefix + "-item-quantidade' min='0.01' step='0.01' value='1'></div>" +
    "<div class='form-group'><label>Valor Unitário</label><input type='number' class='form-input' id='" + prefix + "-item-valor' min='0' step='0.01' value='0'></div>" +
    "<button type='button' class='btn btn-secondary line-item-add' id='btn-add-" + prefix + "-item' title='Adicionar item'><i data-lucide='plus'></i></button></div>" +
    "<div class='table-wrapper line-items-table'><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th><th></th></tr></thead><tbody id='" + prefix + "-itens-body'></tbody></table></div></div>" +
    "<div class='commercial-summary'><div class='commercial-total'><span>" + totalLabel + "</span><strong id='" + prefix + "-resultado-val'>R$ 0,00</strong></div><div class='commercial-form-actions'>" + cancelButton + "<button type='submit' class='btn btn-primary'><i data-lucide='" + icon + "'></i> " + buttonLabel + "</button></div></div>";
}

function populateClientSelectors() {
  ["orc-cliente", "ped-cliente", "receber-cliente", "fat-cliente"].forEach(function(id) {
    const select = document.getElementById(id);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = "<option value=''>Selecione o Cliente</option>" + clientSelectOptionsHtml();
    if (currentValue && ERP_DATA.cadastro.clientes.some(client => client.nome === currentValue)) {
      select.value = currentValue;
    }
  });
}

function populateCommercialPartnerSelect(preferredValue) {
  const parceiroSelect = document.getElementById('contrato-c-parceiro');
  if (!parceiroSelect || !ERP_DATA?.cadastro) return;

  const tipoSelect = document.getElementById('contrato-c-tipo');
  const tipo = tipoSelect?.value || 'Cliente';
  const parceiros = tipo === 'Fornecedor'
    ? ERP_DATA.cadastro.fornecedores.map(f => ({ nome: f.nome, tipo: 'Fornecedor' }))
    : ERP_DATA.cadastro.clientes.map(c => ({ nome: c.nome, tipo: 'Cliente' }));
  const currentValue = preferredValue !== undefined ? preferredValue : parceiroSelect.value;

  parceiroSelect.innerHTML = parceiros.length
    ? parceiros.map(p => {
        const name = escapeHtml(p.nome || "");
        return `<option value="${name}">${name} (${p.tipo})</option>`;
      }).join('')
    : `<option value="">Nenhum ${tipo.toLowerCase()} cadastrado</option>`;

  if (currentValue && parceiros.some(p => p.nome === currentValue)) {
    parceiroSelect.value = currentValue;
  }

  updateCommercialPartnerFields();
}

function clientSelectOptionsHtml() {
  return ERP_DATA.cadastro.clientes
    .map(function(c) {
      const name = escapeHtml(c.nome || "");
      return `<option value="${name}">${name}</option>`;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function setupCommercialUpgradeLauncher(kind) {
  const prefix = kind === "orcamento" ? "orc" : "ped";
  const typeSelect = document.getElementById(prefix + "-item-tipo");
  const productSelect = document.getElementById(prefix + "-item-produto");
  const qtyInput = document.getElementById(prefix + "-item-quantidade");
  const valueInput = document.getElementById(prefix + "-item-valor");
  const addBtn = document.getElementById("btn-add-" + prefix + "-item");
  if (!typeSelect || !productSelect || !addBtn) return;

  const syncOptions = function() {
    const catalog = getCommercialUpgradeCatalog(typeSelect.value);
    productSelect.innerHTML = catalog.map(function(item, index) { return "<option value='" + index + "'>" + item.nome + "</option>"; }).join("");
    valueInput.value = catalog[0] ? catalog[0].precoVenda.toFixed(2) : "0.00";
  };

  typeSelect.addEventListener("change", syncOptions);
  productSelect.addEventListener("change", function() {
    const catalogItem = getCommercialUpgradeCatalog(typeSelect.value)[parseInt(productSelect.value, 10)];
    if (catalogItem) valueInput.value = catalogItem.precoVenda.toFixed(2);
  });
  addBtn.addEventListener("click", function() {
    const catalogItem = getCommercialUpgradeCatalog(typeSelect.value)[parseInt(productSelect.value, 10)];
    const quantidade = parseFloat(qtyInput.value) || 0;
    const valorUnitario = parseFloat(valueInput.value) || 0;
    if (!catalogItem || quantidade <= 0) {
      alert("Informe um item e uma quantidade válida.");
      return;
    }
    commercialDraftUpgrade[kind].push({ tipo: typeSelect.value, descricao: catalogItem.nome, quantidade: quantidade, valorUnitario: valorUnitario, total: quantidade * valorUnitario });
    qtyInput.value = "1";
    renderCommercialUpgradeDraft(kind);
  });

  if (kind === "orcamento") {
    [document.getElementById("orc-margem"), document.getElementById("orc-imposto")].forEach(function(input) {
      if (input) input.addEventListener("input", function() { renderCommercialUpgradeDraft("orcamento"); });
    });
  }
  syncOptions();
}

function getCommercialUpgradeCatalog(tipo) {
  const catalog = ERP_DATA.cadastro.produtos.filter(item => tipo === "Serviço" ? item.tipo === "Serviço" : item.tipo !== "Serviço");
  return tipo === "Serviço" && !catalog.length ? COMMERCIAL_SERVICES_UPGRADE : catalog;
}

function renderCommercialUpgradeDraft(kind) {
  const prefix = kind === "orcamento" ? "orc" : "ped";
  const body = document.getElementById(prefix + "-itens-body");
  if (body) {
    if (!commercialDraftUpgrade[kind].length) {
      body.innerHTML = "<tr><td colspan='6' class='empty-line-items'>Nenhum item lançado</td></tr>";
    } else {
      body.innerHTML = commercialDraftUpgrade[kind].map(function(item, index) {
        return "<tr><td>" + item.tipo + "</td><td>" + item.descricao + "</td><td>" + item.quantidade + "</td><td>" + formatBRL(item.valorUnitario) + "</td><td>" + formatBRL(item.total) + "</td><td><button type='button' class='btn btn-danger btn-icon-only' onclick=\"removeCommercialUpgradeItem('" + kind + "', " + index + ")\" title='Remover item'><i data-lucide='trash-2'></i></button></td></tr>";
      }).join("");
    }
  }
  const totals = calculateCommercialUpgradeTotals(kind);
  const totalEl = document.getElementById(prefix + "-resultado-val");
  if (totalEl) totalEl.textContent = formatBRL(kind === "orcamento" ? totals.finalValue : totals.subtotal);
  lucide.createIcons();
}

function calculateCommercialUpgradeTotals(kind) {
  const subtotal = commercialDraftUpgrade[kind].reduce(function(sum, item) { return sum + item.total; }, 0);
  return { subtotal: subtotal, finalValue: subtotal, taxValue: 0 };
}

window.removeCommercialUpgradeItem = function(kind, index) {
  commercialDraftUpgrade[kind].splice(index, 1);
  renderCommercialUpgradeDraft(kind);
};

function setupCommercialUpgradeSubmits() {
  const orcForm = document.getElementById("form-orcamento");
  if (orcForm) {
    orcForm.addEventListener("submit", function(e) {
      e.preventDefault();
      if (!commercialDraftUpgrade.orcamento.length) { alert("Adicione pelo menos um produto ou serviço ao orçamento."); return; }
      const totals = calculateCommercialUpgradeTotals("orcamento");
      const editingId = commercialEditingUpgrade.orcamento;
      const record = editingId ? ERP_DATA.comercial.orcamentos.find(function(item) { return item.id === editingId; }) : null;
      const savedOrc = {
        id: editingId || nextCommercialUpgradeId("ORC", ERP_DATA.comercial.orcamentos),
        cliente: document.getElementById("orc-cliente").value,
        data: record?.data || new Date().toISOString().split("T")[0],
        descritivoCompleto: document.getElementById("orc-descritivo-completo")?.value.trim() || "",
        itens: cloneCommercialItems(commercialDraftUpgrade.orcamento),
        subtotal: totals.subtotal,
        impostos: 0,
        total: totals.finalValue,
        margem: 0,
        status: record?.status || "Pendente"
      };
      if (record) Object.assign(record, savedOrc);
      else ERP_DATA.comercial.orcamentos.unshift(savedOrc);
      saveState();
      resetCommercialForm("orcamento");
      renderComercialTables();
    });
  }

  const pedForm = document.getElementById("form-pedido");
  if (pedForm) {
    pedForm.addEventListener("submit", function(e) {
      e.preventDefault();
      if (!commercialDraftUpgrade.pedido.length) { alert("Adicione pelo menos um produto ou serviço ao pedido."); return; }
      const total = calculateCommercialUpgradeTotals("pedido").subtotal;
      const editingId = commercialEditingUpgrade.pedido;
      const record = editingId ? ERP_DATA.comercial.pedidos.find(function(item) { return item.id === editingId; }) : null;
      const savedPed = {
        id: editingId || nextCommercialUpgradeId("PED", ERP_DATA.comercial.pedidos),
        cliente: document.getElementById("ped-cliente").value,
        data: record?.data || new Date().toISOString().split("T")[0],
        itens: cloneCommercialItems(commercialDraftUpgrade.pedido),
        total: total,
        status: record?.status || "Aguardando Aprovação",
        entregaEstimada: document.getElementById("ped-entrega").value
      };
      if (record) Object.assign(record, savedPed);
      else ERP_DATA.comercial.pedidos.unshift(savedPed);
      saveState();
      resetCommercialForm("pedido");
      renderComercialTables();
      updateDashboardKPIs();
    });
  }
}

function resetCommercialForm(kind) {
  const prefix = kind === "orcamento" ? "orc" : "ped";
  const form = document.getElementById(kind === "orcamento" ? "form-orcamento" : "form-pedido");
  commercialDraftUpgrade[kind] = [];
  commercialEditingUpgrade[kind] = null;
  if (form) form.reset();
  if (kind === "pedido") setDefaultCommercialDeliveryDate();
  const productSelect = document.getElementById(prefix + "-item-produto");
  if (productSelect) productSelect.dispatchEvent(new Event("change"));
  renderCommercialUpgradeDraft(kind);
  hideCommercialForm(kind);
}

function openCommercialForm(kind) {
  commercialDraftUpgrade[kind] = [];
  commercialEditingUpgrade[kind] = null;
  const form = document.getElementById(kind === "orcamento" ? "form-orcamento" : "form-pedido");
  if (form) form.reset();
  if (kind === "pedido") setDefaultCommercialDeliveryDate();
  showCommercialForm(kind);
  renderCommercialUpgradeDraft(kind);
}

function showCommercialForm(kind) {
  const form = document.getElementById(kind === "orcamento" ? "form-orcamento" : "form-pedido");
  form?.closest(".commercial-form-panel")?.classList.remove("hidden");
  form?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideCommercialForm(kind) {
  const form = document.getElementById(kind === "orcamento" ? "form-orcamento" : "form-pedido");
  form?.closest(".commercial-form-panel")?.classList.add("hidden");
}

function nextCommercialUpgradeId(prefix, list) {
  const used = new Set(list.map(function(item) { return item.id; }));
  let counter = list.length + 1;
  let id = prefix + "-" + String(counter).padStart(3, "0");
  while (used.has(id)) {
    counter += 1;
    id = prefix + "-" + String(counter).padStart(3, "0");
  }
  return id;
}

function setDefaultCommercialDeliveryDate() {
  const input = document.getElementById("ped-entrega");
  if (!input || input.value) return;
  const date = new Date();
  date.setDate(date.getDate() + 7);
  input.value = date.toISOString().split("T")[0];
}

function normalizeCommercialUpgradeItems(record, fallbackLabel) {
  if (Array.isArray(record.itens) && record.itens.length) return record.itens;
  const base = record.subtotal || record.total || 0;
  return [{ tipo: "Resumo", descricao: fallbackLabel, quantidade: 1, valorUnitario: base, total: base }];
}

function cloneCommercialItems(items) {
  return items.map(function(item) { return Object.assign({}, item); });
}

function getCommercialRecord(kind, id) {
  const list = kind === "orcamento" ? ERP_DATA.comercial.orcamentos : ERP_DATA.comercial.pedidos;
  return list.find(function(item) { return item.id === id; });
}

function getCommercialList(kind) {
  return kind === "orcamento" ? ERP_DATA.comercial.orcamentos : ERP_DATA.comercial.pedidos;
}

function buildPartnerAddress(record) {
  if (!record) return "";
  const parts = [record.endereco, record.numero, record.bairro, record.cidade, record.uf, record.cep]
    .filter(Boolean)
    .map(function(value) { return String(value).trim(); })
    .filter(Boolean);
  return parts.length ? parts.join(", ") : (record.endereco || "");
}

function getCommercialPartnerDetails(name) {
  const cliente = ERP_DATA.cadastro.clientes.find(function(item) { return item.nome === name; });
  const fornecedor = ERP_DATA.cadastro.fornecedores.find(function(item) { return item.nome === name; });
  const record = cliente || fornecedor || null;
  return {
    nome: name || "",
    documento: record?.cnpj || "",
    email: record?.email || "",
    telefone: record?.telefone || "",
    endereco: buildPartnerAddress(record),
    representante: record?.contato || ""
  };
}

function updateCommercialPartnerFields() {
  const parceiroSelect = document.getElementById('contrato-c-parceiro');
  if (!parceiroSelect) return;

  const partner = getCommercialPartnerDetails(parceiroSelect.value);
  const documento = document.getElementById('contrato-c-documento');
  const endereco = document.getElementById('contrato-c-endereco');
  const representante = document.getElementById('contrato-c-representante');

  if (documento) documento.value = partner.documento || '';
  if (endereco) endereco.value = partner.endereco || '';
  if (representante) representante.value = partner.representante || '';
}

function getCommercialContractDetails(contract) {
  const partner = getCommercialPartnerDetails(contract.parceiro);
  return {
    documento: contract.documentoContratante || partner.documento || "",
    endereco: contract.enderecoContratante || partner.endereco || "",
    email: contract.emailContratante || partner.email || "",
    telefone: contract.telefoneContratante || partner.telefone || "",
    representante: contract.representanteContratante || partner.representante || "",
    objeto: contract.objeto || "Prestação de serviços de assessoria administrativa, financeira e apoio em processos de compras, conforme demanda da CONTRATANTE.",
    pagamento: contract.condicaoPagamento || "até o 5º dia útil de cada mês subsequente ao da prestação dos serviços",
    foro: contract.foro || "Comarca de Ourinhos, Estado de São Paulo",
    tecnico: contract.tecnicoResponsavel || "Danilo Jorge Rodrigues da Silva, CPF nº 469.714.768-59"
  };
}

function renderComercialTables() {
  const orcBody = document.getElementById("table-orcamentos-body");
  if (orcBody) {
    orcBody.innerHTML = ERP_DATA.comercial.orcamentos.map(function(orc) {
      const badge = orc.status === "Aprovado" ? "badge-success" : orc.status === "Cancelado" ? "badge-danger" : orc.status === "Pendente" ? "badge-warning" : "badge-primary";
      return "<tr><td><strong>" + orc.id + "</strong></td><td>" + orc.cliente + "</td><td>" + formatBRL(orc.total) + "</td><td><span class='badge " + badge + "'>" + orc.status + "</span></td><td>" + commercialActionsHtml("orcamento", orc.id) + "</td></tr>";
    }).join("");
  }

  const pedBody = document.getElementById("table-pedidos-body");
  if (pedBody) {
    pedBody.innerHTML = ERP_DATA.comercial.pedidos.map(function(ped) {
      const badge = ped.status === "Entregue" ? "badge-success" : ped.status === "Preparando" ? "badge-primary" : ped.status === "Cancelado" ? "badge-danger" : "badge-warning";
      return "<tr><td><strong>" + ped.id + "</strong></td><td>" + ped.cliente + "</td><td>" + formatDateBR(ped.data) + "</td><td>" + formatBRL(ped.total) + "</td><td>" + formatDateBR(ped.entregaEstimada) + "</td><td><span class='badge " + badge + "'>" + ped.status + "</span></td><td>" + commercialActionsHtml("pedido", ped.id) + "</td></tr>";
    }).join("");
  }

  const conBody = document.getElementById("table-contratos-body");
  if (conBody) {
    conBody.innerHTML = ERP_DATA.comercial.contratos.map(function(con) {
      const badge = con.status === "Ativo" ? "badge-success" : "badge-warning";
      return "<tr><td><strong>" + con.titulo + "</strong></td><td>" + con.tipo + "</td><td>" + con.parceiro + "</td><td>" + formatDateBR(con.vigenciaInicio) + "</td><td>" + formatDateBR(con.vigenciaFim) + "</td><td>" + formatBRL(con.valorMensal) + "</td><td><span class='badge badge-success'><i data-lucide='check'></i> Digital</span></td><td><span class='badge " + badge + "'>" + con.status + "</span></td><td><div class='commercial-actions'><button class='btn btn-secondary' style='font-size:0.78rem;padding:0.3rem 0.75rem;' onclick=\"editCommercialContract('" + con.id + "')\" title='Editar contrato'><i data-lucide='pencil'></i> Editar</button><button class='btn btn-secondary' style='font-size:0.78rem;padding:0.3rem 0.75rem;' onclick=\"generateContractPdf('" + con.id + "')\" title='Imprimir contrato em PDF'><i data-lucide='file-down'></i> Imprimir PDF</button><button class='btn btn-primary' style='font-size:0.78rem;padding:0.3rem 0.75rem;' onclick=\"faturarContrato('" + con.id + "')\" title='Gerar fatura deste contrato'><i data-lucide='receipt-text'></i> Faturar</button></div></td></tr>";
    }).join("");
  }
  lucide.createIcons();
}

window.faturarContrato = function(id) {
  const con = ERP_DATA.comercial.contratos.find(c => c.id === id);
  if (!con) return;
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 30);
  const existing = ERP_DATA.financeiro.contasReceber.find(r => r.contratoId === con.id && r.status !== "Recebido");
  if (existing) {
    alert('Já existe uma fatura em aberto para este contrato: ' + existing.id + '.');
    return;
  }
  const fatId = 'FAT-' + String(ERP_DATA.financeiro.contasReceber.length + 1).padStart(3, '0');
  const newFat = {
    id: fatId,
    descricao: 'Fatura Contrato: ' + con.titulo,
    cliente: con.parceiro,
    emissao: today.toISOString().split('T')[0],
    vencimento: dueDate.toISOString().split('T')[0],
    valor: con.valorMensal,
    status: 'A Receber',
    contratoId: con.id,
    nfseEmitida: false,
    boletoGerado: false
  };
  ERP_DATA.financeiro.contasReceber.push(newFat);
  saveState();
  renderFinanceiroTables();
  alert('Fatura ' + fatId + ' gerada no valor de ' + formatBRL(con.valorMensal) + ' para ' + con.parceiro + '!\nAcesse Financeiro > Faturamento para abrir o Emissor Nacional e gerar o boleto em PDF.');
};

function commercialActionsHtml(kind, id) {
  const primaryAction = kind === "orcamento" ? "generate-order" : "approve-order";
  const primaryTitle = kind === "orcamento" ? "Transformar em pedido" : "Aprovar e enviar ao Fiscal";
  const primaryIcon = kind === "orcamento" ? "shopping-bag" : "send";
  return "<div class='commercial-actions'>" +
    "<button type='button' class='btn btn-secondary btn-icon-only' data-commercial-action='" + primaryAction + "' data-kind='" + kind + "' data-id='" + id + "' title='" + primaryTitle + "'><i data-lucide='" + primaryIcon + "'></i></button>" +
    "<button type='button' class='btn btn-secondary btn-icon-only' data-commercial-action='pdf' data-kind='" + kind + "' data-id='" + id + "' title='Gerar PDF'><i data-lucide='file-down'></i></button>" +
    "<button type='button' class='btn btn-secondary btn-icon-only' data-commercial-action='edit' data-kind='" + kind + "' data-id='" + id + "' title='Editar'><i data-lucide='pencil'></i></button>" +
    "<button type='button' class='btn btn-secondary btn-icon-only' data-commercial-action='duplicate' data-kind='" + kind + "' data-id='" + id + "' title='Duplicar'><i data-lucide='copy'></i></button>" +
    "<button type='button' class='btn btn-secondary btn-icon-only' data-commercial-action='cancel' data-kind='" + kind + "' data-id='" + id + "' title='Cancelar'><i data-lucide='ban'></i></button>" +
    "<button type='button' class='btn btn-danger btn-icon-only' data-commercial-action='delete' data-kind='" + kind + "' data-id='" + id + "' title='Excluir'><i data-lucide='trash-2'></i></button>" +
  "</div>";
}

function setupCommercialActionDelegation() {
  const comercialView = document.getElementById("view-comercial");
  if (!comercialView || comercialView.dataset.actionsBound === "true") return;
  comercialView.dataset.actionsBound = "true";
  comercialView.addEventListener("click", function(event) {
    const newButton = event.target.closest("[data-commercial-new]");
    if (newButton) {
      openCommercialForm(newButton.getAttribute("data-commercial-new"));
      return;
    }

    const button = event.target.closest("[data-commercial-action]");
    if (!button) return;
    const action = button.getAttribute("data-commercial-action");
    const kind = button.getAttribute("data-kind");
    const id = button.getAttribute("data-id");
    handleCommercialAction(action, kind, id);
  });
}

function handleCommercialAction(action, kind, id) {
  if (action === "pdf") generateCommercialPdf(kind, id);
  if (action === "edit") editCommercialRecord(kind, id);
  if (action === "duplicate") duplicateCommercialRecord(kind, id);
  if (action === "cancel") cancelCommercialRecord(kind, id);
  if (action === "delete") deleteCommercialRecord(kind, id);
  if (action === "generate-order") generateOrderFromBudget(id);
  if (action === "approve-order") approveOrderForFiscal(id);
  if (action === "close-form") resetCommercialForm(kind);
}

function switchCommercialTab(tabId) {
  const tabButton = document.querySelector("#view-comercial .tab-btn[data-tab='" + tabId + "']");
  if (tabButton) tabButton.click();
}

function editCommercialRecord(kind, id) {
  const record = getCommercialRecord(kind, id);
  if (!record || record.status === "Cancelado") return;
  const formKind = kind;
  const prefix = formKind === "orcamento" ? "orc" : "ped";
  commercialEditingUpgrade[formKind] = id;
  commercialDraftUpgrade[formKind] = cloneCommercialItems(normalizeCommercialUpgradeItems(record, kind === "orcamento" ? "Orçamento" : "Pedido"));
  switchCommercialTab(kind === "orcamento" ? "tab-orcamentos" : "tab-pedidos");
  showCommercialForm(formKind);
  const clientSelect = document.getElementById(prefix + "-cliente");
  if (clientSelect) clientSelect.value = record.cliente;
  if (kind === "orcamento") {
    const margemInput = document.getElementById("orc-margem");
    if (margemInput) margemInput.value = record.margem || 0;
    const descritivoInput = document.getElementById("orc-descritivo-completo");
    if (descritivoInput) descritivoInput.value = record.descritivoCompleto || "";
  } else {
    const entregaInput = document.getElementById("ped-entrega");
    if (entregaInput) entregaInput.value = record.entregaEstimada || "";
  }
  renderCommercialUpgradeDraft(formKind);
}

function duplicateCommercialRecord(kind, id) {
  const record = getCommercialRecord(kind, id);
  if (!record) return;
  const list = getCommercialList(kind);
  const clone = Object.assign({}, record, {
    id: nextCommercialUpgradeId(kind === "orcamento" ? "ORC" : "PED", list),
    data: new Date().toISOString().split("T")[0],
    itens: cloneCommercialItems(normalizeCommercialUpgradeItems(record, kind === "orcamento" ? "Orçamento" : "Pedido")),
    status: kind === "orcamento" ? "Pendente" : "Aguardando Aprovação"
  });
  list.unshift(clone);
  saveState();
  renderComercialTables();
  updateDashboardKPIs();
}

function cancelCommercialRecord(kind, id) {
  const record = getCommercialRecord(kind, id);
  if (!record) return;
  if (!confirm("Cancelar " + id + "?")) return;
  record.status = "Cancelado";
  saveState();
  renderComercialTables();
  updateDashboardKPIs();
}

function deleteCommercialRecord(kind, id) {
  const list = getCommercialList(kind);
  const index = list.findIndex(function(item) { return item.id === id; });
  if (index < 0) return;
  if (!confirm("Excluir definitivamente " + id + "?")) return;
  list.splice(index, 1);
  saveState();
  renderComercialTables();
  updateDashboardKPIs();
}

function generateOrderFromBudget(id) {
  const orc = getCommercialRecord("orcamento", id);
  if (!orc) return;
  const existing = ERP_DATA.comercial.pedidos.find(function(ped) { return ped.origem === orc.id; });
  if (existing) {
    switchCommercialTab("tab-pedidos");
    alert("Este orçamento já gerou o pedido " + existing.id + ". Ele está no histórico de pedidos.");
    return;
  }
  const newPed = {
    id: nextCommercialUpgradeId("PED", ERP_DATA.comercial.pedidos),
    cliente: orc.cliente,
    data: new Date().toISOString().split("T")[0],
    itens: cloneCommercialItems(normalizeCommercialUpgradeItems(orc, "Orçamento")),
    descritivoCompleto: orc.descritivoCompleto || "",
    total: orc.total,
    status: "Aguardando Aprovação",
    entregaEstimada: futureDateIso(7),
    origem: orc.id
  };
  ERP_DATA.comercial.pedidos.unshift(newPed);
  orc.status = "Aprovado";
  saveState();
  renderComercialTables();
  updateDashboardKPIs();
  switchCommercialTab("tab-pedidos");
  alert("Pedido " + newPed.id + " gerado a partir do orçamento " + orc.id + ".");
}

function approveOrderForFiscal(id) {
  const ped = getCommercialRecord("pedido", id);
  if (!ped) return;
  const existing = ERP_DATA.fiscal.notasEmitidas.find(function(nf) { return nf.origem === ped.id; });
  if (existing) {
    alert("Este pedido já está na área fiscal como " + existing.id + ".");
    return;
  }
  const fiscalRecord = {
    id: "NF-" + String(1026 + ERP_DATA.fiscal.notasEmitidas.length).padStart(4, "0"),
    destinatario: ped.cliente,
    tipo: "NFS-e / NF-e",
    valor: ped.total,
    emissao: new Date().toISOString(),
    status: "Aguardando envio/emissão",
    xmlFile: "NFe" + Date.now() + ".xml",
    origem: ped.id
  };
  ERP_DATA.fiscal.notasEmitidas.unshift(fiscalRecord);
  ped.status = "Aprovado - aguardando Fiscal";
  saveState();
  renderComercialTables();
  renderFiscalData();
  alert("Pedido " + ped.id + " aprovado e enviado para a área Fiscal. Ele ficou aguardando envio/emissão de nota fiscal de serviço ou venda.");
}

function futureDateIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

const DOC_ASSESSORIA_CNPJ = "67873641000121";
const DOC_ASSESSORIA_LOGO = "assets/doc-assessoria/logo.png";

function cleanCnpjValue(value) {
  return String(value || "").replace(/\D/g, "");
}

function getDocumentBranding() {
  const comp = getActiveCompany();
  if (!comp || cleanCnpjValue(comp.cnpj) !== DOC_ASSESSORIA_CNPJ) {
    return {
      className: "",
      stylesheet: "",
      headerHtml: "",
      footerHtml: ""
    };
  }

  return {
    className: "doc-assessoria-letterhead",
    stylesheet: `
      body.doc-assessoria-letterhead { margin: 0; color: #0f2533; background: #fff; }
      body.doc-assessoria-letterhead .letterhead-page { padding: 24px 36px 34px; position: relative; box-sizing: border-box; }
      body.doc-assessoria-letterhead .brand-watermark { position: fixed; left: 50%; top: 50%; width: 460px; max-width: 72%; opacity: 0.045; transform: translate(-50%, -50%); z-index: 0; pointer-events: none; }
      body.doc-assessoria-letterhead .letterhead-header { border-bottom: 2px solid #1b5c72; padding: 0 0 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 20px; position: relative; z-index: 1; }
      body.doc-assessoria-letterhead .letterhead-header img { width: 164px; height: auto; display: block; }
      body.doc-assessoria-letterhead .letterhead-company { text-align: right; font-size: 10px; line-height: 1.25; color: #24475a; }
      body.doc-assessoria-letterhead .letterhead-content { position: relative; z-index: 1; }
      body.doc-assessoria-letterhead .letterhead-footer { border-top: 1px solid #8aaaba; padding-top: 5px; margin-top: 12px; text-align: center; color: #31596b; font-size: 9px; }
      @media print {
        body.doc-assessoria-letterhead .letterhead-page { padding: 0; }
        body.doc-assessoria-letterhead .letterhead-footer { position: static; }
      }
    `,
    headerHtml: `
      <img class="brand-watermark" src="${DOC_ASSESSORIA_LOGO}" alt="">
      <div class="letterhead-header">
        <img src="${DOC_ASSESSORIA_LOGO}" alt="D.O.C. Assessoria e Consultoria">
        <div class="letterhead-company">
          <strong>D.O.C. Assessoria e Consultoria</strong><br>
          CNPJ: 67.873.641/0001-21<br>
          Documento gerado pelo APP ADM
        </div>
      </div>
    `,
    footerHtml: `<div class="letterhead-footer">D.O.C. Assessoria e Consultoria - documento emitido eletronicamente</div>`
  };
}

function wrapPdfWithBranding(contentHtml, extraStyles) {
  const branding = getDocumentBranding();
  const pageClass = branding.className ? "letterhead-page" : "";
  const contentClass = branding.className ? "letterhead-content" : "";
  return {
    bodyClass: branding.className,
    styles: (branding.stylesheet || "") + (extraStyles || ""),
    body: `<section class="${pageClass}">${branding.headerHtml}<main class="${contentClass}">${contentHtml}</main>${branding.footerHtml}</section>`
  };
}

function printHtmlDocument(html, frameId, title) {
  const oldFrame = document.getElementById(frameId);
  if (oldFrame) oldFrame.remove();
  const frame = document.createElement("iframe");
  frame.id = frameId;
  frame.title = title;
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  frame.contentDocument.open();
  frame.contentDocument.write(html);
  frame.contentDocument.close();
  const printFrame = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  };
  frame.onload = printFrame;
  setTimeout(printFrame, 250);
}

function generateCommercialPdf(kind, id) {
  const record = getCommercialRecord(kind, id);
  if (!record) return;
  const title = kind === "orcamento" ? "Orçamento Comercial" : "Pedido Comercial";
  const items = normalizeCommercialUpgradeItems(record, title);
  const subtotal = items.reduce(function(sum, item) { return sum + item.total; }, 0);
  const rows = items.map(function(item) {
    return "<tr><td>" + item.tipo + "</td><td>" + item.descricao + "</td><td>" + item.quantidade + "</td><td>" + formatBRL(item.valorUnitario) + "</td><td>" + formatBRL(item.total) + "</td></tr>";
  }).join("");
  const extraHtml = kind === "pedido" 
    ? "<div><span class='muted'>Previsão de entrega</span><br><strong>" + formatDateBR(record.entregaEstimada) + "</strong></div>"
    : "";
  const descritivoHtml = record.descritivoCompleto
    ? "<section class='box'><strong>Descritivo</strong><div class='description-block'>" + escapeHtml(record.descritivoCompleto) + "</div></section>"
    : "";
  const taxLine = "";
  const contentHtml = "<header><div><h1>" + title + "</h1><div class='muted'>APP ADM - Sistema Integrado de Gestão ERP</div></div><div><strong>" + record.id + "</strong><br><span class='muted'>Emissão: " + new Date().toLocaleDateString("pt-BR") + "</span></div></header><section class='box grid'><div><span class='muted'>Cliente</span><br><strong>" + record.cliente + "</strong></div><div><span class='muted'>Data do registro</span><br><strong>" + record.data + "</strong></div><div><span class='muted'>Status</span><br><strong>" + record.status + "</strong></div>" + extraHtml + "</section>" + descritivoHtml + "<section class='box'><strong>Produtos e serviços</strong><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>" + rows + "</tbody></table></section><section class='totals'><div class='total-line'><span>Subtotal</span><strong>" + formatBRL(subtotal) + "</strong></div>" + taxLine + "<div class='total-line grand'><span>Total</span><strong>" + formatBRL(record.total) + "</strong></div></section>";
  const branded = wrapPdfWithBranding(contentHtml, "body{font-family:Arial,sans-serif;color:#111827;margin:40px}header{border-bottom:2px solid #4f46e5;padding-bottom:18px;margin-bottom:24px;display:flex;justify-content:space-between;gap:24px}h1{margin:0;font-size:26px}.muted{color:#6b7280;font-size:13px}.box{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.description-block{white-space:pre-wrap;line-height:1.55;margin-top:10px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f3f4f6;text-align:left;font-size:12px;text-transform:uppercase}th,td{border-bottom:1px solid #e5e7eb;padding:10px}.totals{margin-left:auto;width:320px}.total-line{display:flex;justify-content:space-between;padding:8px 0}.grand{font-size:20px;font-weight:800;border-top:2px solid #111827;margin-top:8px;padding-top:12px}@page{size:A4;margin:14mm}@media print{body{margin:0}}");
  const html = "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>" + title + " " + record.id + "</title><style>" + branded.styles + "</style></head><body class='" + branded.bodyClass + "'>" + branded.body + "</body></html>";
  printHtmlDocument(html, "commercial-pdf-frame", title + " " + record.id);
}

window.generateCommercialPdf = generateCommercialPdf;

function generateContractPdf(id) {
  const contract = ERP_DATA.comercial.contratos.find(function(item) { return item.id === id; });
  if (!contract) return;
  const details = getCommercialContractDetails(contract);
  const comp = getActiveCompany();
  const contratadaNome = comp?.razaoSocial || "D.O.C. Assessoria e Consultoria";
  const contratadaCnpj = comp?.cnpj || "67.873.641/0001-21";
  const objetoItens = String(details.objeto || "")
    .split(/\r?\n/)
    .map(function(line) { return line.trim(); })
    .filter(Boolean);
  const objetoHtml = (objetoItens.length ? objetoItens : ["Prestação de serviços conforme condições acordadas entre as partes."])
    .map(function(item) { return "<li>" + escapeHtml(item) + "</li>"; })
    .join("");
  const partnerRows = [
    ["Nome/Razão Social", contract.parceiro],
    ["CNPJ/CPF", details.documento],
    ["Endereço", details.endereco],
    ["E-mail", details.email],
    ["Telefone", details.telefone],
    ["Representada por", details.representante]
  ].filter(function(row) { return String(row[1] || "").trim(); })
    .map(function(row) { return "<li><strong>" + escapeHtml(row[0]) + ":</strong> " + escapeHtml(row[1]) + "</li>"; })
    .join("");

  const contentHtml = `
    <header class="contract-cover">
      <div>
        <h1>${escapeHtml(contract.titulo || "Contrato de Prestação de Serviços")}</h1>
        <p>Contrato nº ${escapeHtml(contract.id)} · Emissão: ${new Date().toLocaleDateString("pt-BR")}</p>
      </div>
    </header>
    <p>Este Contrato de Prestação de Serviços é celebrado entre as partes abaixo identificadas, que têm entre si justo e contratado o seguinte:</p>
    <section class="parties">
      <div class="party-box">
        <h2>Contratada</h2>
        <ul>
          <li><strong>Razão Social:</strong> ${escapeHtml(contratadaNome)}</li>
          <li><strong>CNPJ:</strong> ${escapeHtml(contratadaCnpj)}</li>
          <li><strong>Técnico responsável:</strong> ${escapeHtml(details.tecnico)}</li>
        </ul>
      </div>
      <div class="party-box">
        <h2>Contratante</h2>
        <ul>${partnerRows || `<li><strong>Nome/Razão Social:</strong> ${escapeHtml(contract.parceiro)}</li>`}</ul>
      </div>
    </section>
    <h2>Cláusula Primeira - Do Objeto</h2>
    <p>O presente contrato tem como objeto a prestação de serviços especializados pela CONTRATADA à CONTRATANTE, compreendendo:</p>
    <ul>${objetoHtml}</ul>
    <h2>Cláusula Segunda - Das Obrigações da Contratada</h2>
    <p>A CONTRATADA compromete-se a prestar os serviços com diligência, qualidade técnica e profissionalismo, mantendo sigilo sobre informações, documentos e dados da CONTRATANTE aos quais tiver acesso.</p>
    <h2>Cláusula Terceira - Das Obrigações da Contratante</h2>
    <p>A CONTRATANTE compromete-se a fornecer informações, documentos e acessos necessários à correta execução dos serviços, bem como efetuar os pagamentos nas condições acordadas.</p>
    <h2>Cláusula Quarta - Da Vigência</h2>
    <p>O contrato terá início em ${escapeHtml(formatDateBR(contract.vigenciaInicio))} e término em ${escapeHtml(formatDateBR(contract.vigenciaFim))}, podendo ser prorrogado mediante acordo formal entre as partes.</p>
    <h2>Cláusula Quinta - Do Valor e Pagamento</h2>
    <p>A CONTRATANTE pagará à CONTRATADA o valor mensal de <strong>${formatBRL(contract.valorMensal)}</strong>, mediante emissão de nota fiscal e/ou boleto bancário.</p>
    <p>O pagamento deverá ocorrer ${escapeHtml(details.pagamento)}. Em caso de atraso, poderá incidir multa de 2% e juros de mora de 1% ao mês.</p>
    <h2>Cláusula Sexta - Da Rescisão</h2>
    <p>Qualquer das partes poderá rescindir o presente contrato mediante aviso prévio, por escrito, com antecedência mínima de 30 (trinta) dias, sem prejuízo das obrigações já vencidas até a data da rescisão.</p>
    <p>Entretanto, caso a rescisão seja promovida <strong>por iniciativa exclusiva da CONTRATANTE</strong>, esta ficará obrigada ao pagamento de <strong>indenização rescisória</strong>, a título de multa compensatória, correspondente a 33% (trinta e três por cento) do valor das mensalidades vincendas até o término da vigência contratual, constituindo-se tal obrigação em ônus exclusivo da CONTRATANTE.</p>
    <h2>Cláusula Sétima - Da Confidencialidade</h2>
    <p>As partes comprometem-se a manter sigilo absoluto sobre informações comerciais, financeiras, técnicas e estratégicas obtidas durante a execução deste contrato.</p>
    <h2>Cláusula Oitava - Da Independência das Partes</h2>
    <p>Este contrato não gera vínculo empregatício, societário, associativo ou de subordinação entre as partes.</p>
    <h2>Cláusula Nona - Do Foro</h2>
    <p>As partes elegem o Foro da ${escapeHtml(details.foro)} para dirimir dúvidas ou litígios decorrentes deste contrato.</p>
    <p class="date-line">Ourinhos, ${new Date().toLocaleDateString("pt-BR")}.</p>
    <section class="signatures">
      <div><span></span><strong>CONTRATADA</strong><br>${escapeHtml(contratadaNome)}<br>${escapeHtml(contratadaCnpj)}</div>
      <div><span></span><strong>CONTRATANTE</strong><br>${escapeHtml(contract.parceiro)}<br>${escapeHtml(details.documento)}</div>
    </section>
    <section class="witnesses">
      <div><span></span><strong>TESTEMUNHA 1</strong><br>Nome:<br>CPF:</div>
      <div><span></span><strong>TESTEMUNHA 2</strong><br>Nome:<br>CPF:</div>
    </section>
  `;
  const branded = wrapPdfWithBranding(contentHtml, `
    body{font-family:Arial,sans-serif;color:#1f2933;margin:28px;font-size:12px;line-height:1.48}
    .contract-cover{border-bottom:2px solid #1b5c72;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;gap:20px}
    h1{font-size:20px;margin:0;color:#123b4a;text-transform:uppercase}
    h2{font-size:12px;color:#123b4a;text-transform:uppercase;border-bottom:1px solid #d8e4e8;padding-bottom:4px;margin:16px 0 7px}
    p{margin:0 0 8px;text-align:justify}.contract-cover p{color:#64748b;text-align:left;margin-top:5px}
    ul{margin:6px 0 10px 18px;padding:0}li{margin-bottom:4px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0 16px}.party-box{border:1px solid #d8e4e8;border-radius:6px;padding:10px 12px;background:#fbfdfe;break-inside:avoid}.party-box h2{border:0;margin-top:0}.date-line{margin-top:22px;text-align:left}.signatures,.witnesses{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:42px;break-inside:avoid}.signatures span,.witnesses span{display:block;border-top:1px solid #1f2933;margin-bottom:7px}.signatures div,.witnesses div{text-align:center;min-height:64px}
    @page{size:A4;margin:14mm}@media print{body{margin:0}.party-box,h2,.signatures,.witnesses{break-inside:avoid}}
  `);
  const html = "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>Contrato " + escapeHtml(contract.id) + "</title><style>" + branded.styles + "</style></head><body class='" + branded.bodyClass + "'>" + branded.body + "</body></html>";
  printHtmlDocument(html, "contract-pdf-frame", "Contrato " + contract.id);
}

window.generateContractPdf = generateContractPdf;

// ============================================================
// CONTRACTS COMMERCIAL MODULE (Novo Contrato Comercial)
// ============================================================
let editingCommercialContractId = null;

function setCommercialContractFormMode(contract) {
  editingCommercialContractId = contract?.id || null;
  const title = document.querySelector('#panel-form-contrato-comercial .panel-title');
  const submitBtn = document.querySelector('#form-novo-contrato-comercial button[type="submit"]');

  if (title) title.textContent = editingCommercialContractId ? 'Editar Contrato Comercial' : 'Novo Contrato Comercial';
  if (submitBtn) submitBtn.innerHTML = editingCommercialContractId ? '<i data-lucide="save"></i> Salvar Alterações' : '<i data-lucide="check"></i> Criar Contrato';
  lucide.createIcons();
}

function resetCommercialContractForm() {
  const form = document.getElementById('form-novo-contrato-comercial');
  form?.reset();
  setCommercialContractFormMode(null);
  populateCommercialPartnerSelect();
}

function collectCommercialContractFormData(existingContract) {
  return {
    id: existingContract?.id || 'CON-' + String(ERP_DATA.comercial.contratos.length + 1).padStart(3, '0'),
    titulo: document.getElementById('contrato-c-titulo').value.trim(),
    tipo: document.getElementById('contrato-c-tipo').value,
    parceiro: document.getElementById('contrato-c-parceiro').value,
    vigenciaInicio: document.getElementById('contrato-c-inicio').value,
    vigenciaFim: document.getElementById('contrato-c-fim').value,
    valorMensal: parseFloat(document.getElementById('contrato-c-valor').value) || 0,
    documentoContratante: document.getElementById('contrato-c-documento')?.value.trim() || '',
    representanteContratante: document.getElementById('contrato-c-representante')?.value.trim() || '',
    enderecoContratante: document.getElementById('contrato-c-endereco')?.value.trim() || '',
    objeto: document.getElementById('contrato-c-objeto')?.value.trim() || 'Prestação de serviços de assessoria administrativa, financeira e apoio em processos de compras, conforme demanda da CONTRATANTE.',
    condicaoPagamento: document.getElementById('contrato-c-pagamento')?.value.trim() || 'até o 5º dia útil de cada mês subsequente ao da prestação dos serviços',
    foro: document.getElementById('contrato-c-foro')?.value.trim() || 'Comarca de Ourinhos, Estado de São Paulo',
    tecnicoResponsavel: document.getElementById('contrato-c-tecnico')?.value.trim() || 'Danilo Jorge Rodrigues da Silva, CPF nº 469.714.768-59',
    status: existingContract?.status || 'Ativo'
  };
}

function fillCommercialContractForm(contract) {
  if (!contract) return;
  const details = getCommercialContractDetails(contract);
  document.getElementById('contrato-c-titulo').value = contract.titulo || '';
  document.getElementById('contrato-c-tipo').value = contract.tipo || 'Cliente';
  populateCommercialPartnerSelect(contract.parceiro);
  document.getElementById('contrato-c-inicio').value = contract.vigenciaInicio || '';
  document.getElementById('contrato-c-fim').value = contract.vigenciaFim || '';
  document.getElementById('contrato-c-valor').value = contract.valorMensal ?? '';
  document.getElementById('contrato-c-documento').value = details.documento || '';
  document.getElementById('contrato-c-representante').value = details.representante || '';
  document.getElementById('contrato-c-endereco').value = details.endereco || '';
  document.getElementById('contrato-c-objeto').value = details.objeto || '';
  document.getElementById('contrato-c-pagamento').value = details.pagamento || '';
  document.getElementById('contrato-c-foro').value = details.foro || '';
  document.getElementById('contrato-c-tecnico').value = details.tecnico || '';
}

function editCommercialContract(id) {
  const contract = ERP_DATA.comercial.contratos.find(item => item.id === id);
  const panel = document.getElementById('panel-form-contrato-comercial');
  if (!contract || !panel) return;

  setCommercialContractFormMode(contract);
  fillCommercialContractForm(contract);
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.editCommercialContract = editCommercialContract;

function initContratosComerciais() {
  const btnNovo = document.getElementById('btn-novo-contrato-comercial');
  const panel = document.getElementById('panel-form-contrato-comercial');
  const btnCancelar = document.getElementById('btn-cancelar-contrato-c');
  const form = document.getElementById('form-novo-contrato-comercial');
  const parceiroSelect = document.getElementById('contrato-c-parceiro');
  const tipoSelect = document.getElementById('contrato-c-tipo');
  const inicioInput = document.getElementById('contrato-c-inicio');

  if (parceiroSelect) {
    populateCommercialPartnerSelect();
    parceiroSelect.addEventListener('change', updateCommercialPartnerFields);
    tipoSelect?.addEventListener('change', () => populateCommercialPartnerSelect(''));
  }

  if (btnNovo && panel) {
    btnNovo.addEventListener('click', () => {
      resetCommercialContractForm();
      if (inicioInput && !inicioInput.value) inicioInput.value = new Date().toISOString().split('T')[0];
      panel.classList.remove('hidden');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (btnCancelar && panel) {
    btnCancelar.addEventListener('click', () => {
      panel.classList.add('hidden');
      resetCommercialContractForm();
    });
  }
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const editingIndex = editingCommercialContractId
        ? ERP_DATA.comercial.contratos.findIndex(item => item.id === editingCommercialContractId)
        : -1;
      const existingContract = editingIndex >= 0 ? ERP_DATA.comercial.contratos[editingIndex] : null;
      const contractData = collectCommercialContractFormData(existingContract);
      if (editingIndex >= 0) {
        ERP_DATA.comercial.contratos[editingIndex] = contractData;
      } else {
        ERP_DATA.comercial.contratos.unshift(contractData);
      }
      saveState();
      panel.classList.add('hidden');
      resetCommercialContractForm();
      renderComercialTables();
      alert('Contrato ' + contractData.id + (editingIndex >= 0 ? ' atualizado com sucesso!' : ' criado com sucesso!'));
    });
  }
}

// 3. CADASTRO CONTROLLER
let editingProductId = null;

function initCadastro() {
  setupBasicCadastroManagement();
  setupProductManagement();
  initEmpresasUsuarios();
  renderCadastroTables();
  renderEmpresasUsuariosTable();
}

const CADASTRO_CONFIG = {
  clientes: {
    tabId: "tab-clientes",
    buttonLabel: "Novo Cliente",
    idPrefix: "CLI",
    title: "Cliente",
    fields: [
      { key: "nome", label: "Nome / Razão Social", required: true },
      { key: "cnpj", label: "CNPJ", required: true, placeholder: "00.000.000/0001-00", lookup: "cnpj" },
      { key: "email", label: "Email", required: true },
      { key: "telefone", label: "Telefone", required: true },
      { key: "cep", label: "CEP", placeholder: "00000-000", lookup: "cep" },
      { key: "endereco", label: "Endereço" },
      { key: "numero", label: "Número" },
      { key: "bairro", label: "Bairro" },
      { key: "cidade", label: "Cidade" },
      { key: "uf", label: "UF" },
      { key: "totalComprado", label: "Total Comprado", type: "number", defaultValue: 0 }
    ]
  },
  fornecedores: {
    tabId: "tab-fornecedores",
    buttonLabel: "Novo Fornecedor",
    idPrefix: "FOR",
    title: "Fornecedor",
    fields: [
      { key: "nome", label: "Razão Social", required: true },
      { key: "cnpj", label: "CNPJ", required: true, placeholder: "00.000.000/0001-00", lookup: "cnpj" },
      { key: "contato", label: "Contato", required: true },
      { key: "telefone", label: "Telefone", required: true },
      { key: "email", label: "Email" },
      { key: "cep", label: "CEP", placeholder: "00000-000", lookup: "cep" },
      { key: "endereco", label: "Endereço" },
      { key: "numero", label: "Número" },
      { key: "bairro", label: "Bairro" },
      { key: "cidade", label: "Cidade" },
      { key: "uf", label: "UF" },
      { key: "qualidade", label: "Qualidade", defaultValue: "Bom" },
      { key: "prazoMedio", label: "Prazo Médio", defaultValue: "7 dias" }
    ]
  },
  colaboradores: {
    tabId: "tab-colaboradores",
    buttonLabel: "Novo Colaborador",
    idPrefix: "COL",
    title: "Colaborador",
    fields: [
      { key: "nome", label: "Nome", required: true },
      { key: "cargo", label: "Cargo", required: true },
      { key: "departamento", label: "Departamento", required: true },
      { key: "salario", label: "Salário Base", type: "number", defaultValue: 0 },
      { key: "admissao", label: "Data Admissão", type: "date", required: true },
      { key: "status", label: "Status", defaultValue: "Ativo" }
    ]
  },
  veiculos: {
    tabId: "tab-veiculos",
    buttonLabel: "Novo Veículo",
    idPrefix: "VEI",
    title: "Veículo",
    fields: [
      { key: "placa", label: "Placa", required: true },
      { key: "marca", label: "Marca", required: true },
      { key: "modelo", label: "Modelo", required: true },
      { key: "ano", label: "Ano", type: "number", required: true },
      { key: "vencimentoLicenciamento", label: "Venc. Licenciamento", type: "date", required: true },
      { key: "status", label: "Status", defaultValue: "Operacional" }
    ]
  }
};

function setupBasicCadastroManagement() {
  Object.entries(CADASTRO_CONFIG).forEach(([kind, config]) => {
    const tab = document.getElementById(config.tabId);
    if (!tab || tab.dataset.basicCadastroSetup === "true") return;
    tab.dataset.basicCadastroSetup = "true";

    const panel = tab.querySelector(".panel");
    const header = panel?.querySelector(".panel-header");
    if (header && !header.querySelector(`[data-cadastro-new="${kind}"]`)) {
      header.insertAdjacentHTML("beforeend", `<button type="button" class="btn btn-primary" data-cadastro-new="${kind}"><i data-lucide="plus"></i> ${config.buttonLabel}</button>`);
    }

    const tableWrapper = tab.querySelector(".table-wrapper");
    if (tableWrapper && !document.getElementById(`form-${kind}`)) {
      tableWrapper.insertAdjacentHTML("beforebegin", cadastroFormHtml(kind, config));
    }

    tab.addEventListener("click", (event) => {
      if (event.target.closest(`[data-cadastro-new="${kind}"]`)) {
        openCadastroForm(kind);
      }
      if (event.target.closest(`[data-cadastro-cancel="${kind}"]`)) {
        closeCadastroForm(kind);
      }
    });

    const form = document.getElementById(`form-${kind}`);
    if (form) {
      setupCadastroAutoFill(kind, config);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        saveCadastroForm(kind);
      });
    }
  });
  lucide.createIcons();
}

function cadastroFormHtml(kind, config) {
  const fields = config.fields.map(field => {
    const type = field.type || "text";
    const value = field.defaultValue !== undefined ? ` value="${field.defaultValue}"` : "";
    const required = field.required ? " required" : "";
    const step = type === "number" ? ' step="0.01" min="0"' : "";
    const placeholder = field.placeholder ? ` placeholder="${field.placeholder}"` : "";
    const lookup = field.lookup ? ` data-lookup="${field.lookup}"` : "";
    return `<div class="form-group"><label>${field.label}</label><input type="${type}" class="form-input" id="${kind}-${field.key}"${value}${required}${step}${placeholder}${lookup}></div>`;
  }).join("");
  return `<form id="form-${kind}" class="cadastro-form hidden"><div class="form-row">${fields}</div><div class="product-form-actions"><button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Salvar ${config.title}</button><button type="button" class="btn btn-secondary" data-cadastro-cancel="${kind}"><i data-lucide="x"></i> Cancelar</button></div></form>`;
}

function setupCadastroAutoFill(kind, config) {
  if (!["clientes", "fornecedores"].includes(kind)) return;
  const form = document.getElementById(`form-${kind}`);
  if (!form || form.dataset.autoFillSetup === "true") return;
  form.dataset.autoFillSetup = "true";

  const cnpjInput = document.getElementById(`${kind}-cnpj`);
  const cepInput = document.getElementById(`${kind}-cep`);

  if (cnpjInput) {
    cnpjInput.addEventListener("blur", () => autofillCadastroByCnpj(kind));
    cnpjInput.addEventListener("input", () => {
      cnpjInput.value = formatCnpjInput(cnpjInput.value);
    });
  }

  if (cepInput) {
    cepInput.addEventListener("blur", () => autofillCadastroByCep(kind));
    cepInput.addEventListener("input", () => {
      cepInput.value = formatCepInput(cepInput.value);
    });
  }
}

async function autofillCadastroByCnpj(kind) {
  const cnpjInput = document.getElementById(`${kind}-cnpj`);
  const cnpj = cleanCnpjValue(cnpjInput?.value);
  if (cnpj.length !== 14) return;

  setCadastroLookupState(kind, true);
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!response.ok) throw new Error("CNPJ não encontrado");
    const data = await response.json();
    fillCadastroFromCnpj(kind, data);
    const cep = cleanCnpjValue(data.cep);
    if (cep.length === 8) {
      await autofillCadastroByCep(kind, cep);
    }
  } catch (error) {
    console.warn("Não foi possível buscar o CNPJ:", error);
    alert("Não foi possível buscar os dados desse CNPJ. Confira o número e tente novamente.");
  } finally {
    setCadastroLookupState(kind, false);
  }
}

async function autofillCadastroByCep(kind, cepOverride) {
  const cepInput = document.getElementById(`${kind}-cep`);
  const cep = cleanCnpjValue(cepOverride || cepInput?.value);
  if (cep.length !== 8) return;

  setCadastroLookupState(kind, true);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error("CEP não encontrado");
    const data = await response.json();
    if (data.erro) throw new Error("CEP não encontrado");
    setCadastroField(kind, "cep", formatCepInput(cep), true);
    setCadastroField(kind, "endereco", data.logradouro, false);
    setCadastroField(kind, "bairro", data.bairro, false);
    setCadastroField(kind, "cidade", data.localidade, false);
    setCadastroField(kind, "uf", data.uf, false);
  } catch (error) {
    console.warn("Não foi possível buscar o CEP:", error);
    alert("Não foi possível buscar os dados desse CEP. Confira o número e tente novamente.");
  } finally {
    setCadastroLookupState(kind, false);
  }
}

function fillCadastroFromCnpj(kind, data) {
  const razaoSocial = data.razao_social || data.nome_fantasia || "";
  setCadastroField(kind, "nome", razaoSocial, true);
  setCadastroField(kind, "contato", data.nome_fantasia || razaoSocial, false);
  setCadastroField(kind, "email", data.email || "", false);
  setCadastroField(kind, "telefone", formatPhoneInput([data.ddd_telefone_1, data.ddd_telefone_2].filter(Boolean)[0] || ""), false);
  setCadastroField(kind, "cep", formatCepInput(data.cep || ""), true);
  setCadastroField(kind, "endereco", buildCnpjStreet(data), false);
  setCadastroField(kind, "numero", data.numero || "", false);
  setCadastroField(kind, "bairro", data.bairro || "", false);
  setCadastroField(kind, "cidade", data.municipio || "", false);
  setCadastroField(kind, "uf", data.uf || "", false);
}

function buildCnpjStreet(data) {
  return [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(" ").trim();
}

function setCadastroField(kind, key, value, overwrite) {
  const input = document.getElementById(`${kind}-${key}`);
  if (!input || value === undefined || value === null || value === "") return;
  if (!overwrite && input.value.trim()) return;
  input.value = value;
}

function setCadastroLookupState(kind, loading) {
  const form = document.getElementById(`form-${kind}`);
  if (!form) return;
  form.querySelectorAll("[data-lookup]").forEach(input => {
    input.disabled = loading;
  });
}

function formatCnpjInput(value) {
  const digits = cleanCnpjValue(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCepInput(value) {
  const digits = cleanCnpjValue(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function formatPhoneInput(value) {
  const digits = cleanCnpjValue(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3").replace(/-$/, "");
  }
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3").replace(/-$/, "");
}

function openCadastroForm(kind) {
  const form = document.getElementById(`form-${kind}`);
  if (!form) return;
  form.classList.remove("hidden");
  const firstInput = form.querySelector("input");
  if (firstInput) firstInput.focus();
}

function closeCadastroForm(kind) {
  const form = document.getElementById(`form-${kind}`);
  if (!form) return;
  form.reset();
  CADASTRO_CONFIG[kind].fields.forEach(field => {
    if (field.defaultValue !== undefined) {
      const input = document.getElementById(`${kind}-${field.key}`);
      if (input) input.value = field.defaultValue;
    }
  });
  form.classList.add("hidden");
}

function saveCadastroForm(kind) {
  const config = CADASTRO_CONFIG[kind];
  const payload = { id: nextCadastroId(kind, config.idPrefix) };
  config.fields.forEach(field => {
    const input = document.getElementById(`${kind}-${field.key}`);
    payload[field.key] = field.type === "number" ? (parseFloat(input.value) || 0) : input.value.trim();
  });
  ERP_DATA.cadastro[kind].unshift(payload);
  saveState();
  closeCadastroForm(kind);
  renderCadastroTables();
  if (kind === "clientes") {
    populateClientSelectors();
    populateCommercialPartnerSelect(payload.nome);
  }
  if (kind === "fornecedores") populateCommercialPartnerSelect(payload.nome);
  if (kind === "colaboradores") reloadColaboradoresSelect();
  if (kind === "veiculos") initFrota();
}

function nextCadastroId(kind, prefix) {
  const used = new Set(ERP_DATA.cadastro[kind].map(item => item.id));
  let counter = ERP_DATA.cadastro[kind].length + 1;
  let id = `${prefix}-${String(counter).padStart(3, "0")}`;
  while (used.has(id)) {
    counter += 1;
    id = `${prefix}-${String(counter).padStart(3, "0")}`;
  }
  return id;
}

function setupProductManagement() {
  const tab = document.getElementById("tab-produtos");
  if (!tab || tab.dataset.productSetup === "true") return;
  tab.dataset.productSetup = "true";

  const panel = tab.querySelector(".panel");
  const header = panel?.querySelector(".panel-header");
  if (header && !document.getElementById("btn-novo-produto")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-primary";
    btn.id = "btn-novo-produto";
    btn.innerHTML = '<i data-lucide="plus"></i> Novo Produto/Serviço';
    header.appendChild(btn);
  }

  const grid = document.getElementById("catalog-produtos-grid");
  if (grid && !document.getElementById("form-produto")) {
    const form = document.createElement("form");
    form.id = "form-produto";
    form.className = "product-form hidden";
    form.innerHTML = '<div class="form-row">' +
      '<div class="form-group"><label>Tipo de Cadastro</label><select class="form-select" id="produto-tipo" required><option value="Produto">Produto</option><option value="Serviço">Serviço</option></select></div>' +
      '<div class="form-group"><label>Nome do Produto/Serviço</label><input type="text" class="form-input" id="produto-nome" required></div>' +
      '<div class="form-group"><label>Categoria</label><input type="text" class="form-input" id="produto-categoria" required></div>' +
      '<div class="form-group"><label>Preço de Venda</label><input type="number" class="form-input" id="produto-preco" min="0" step="0.01" required></div>' +
      '<div class="form-group product-stock-field"><label>Estoque Atual</label><input type="number" class="form-input" id="produto-estoque" min="0" step="1" required></div>' +
      '<div class="form-group product-stock-field"><label>Custo Médio</label><input type="number" class="form-input" id="produto-custo" min="0" step="0.01" required></div>' +
      '<div class="form-group product-stock-field"><label>Validade</label><input type="date" class="form-input" id="produto-validade"></div>' +
      '</div><div class="product-form-actions">' +
      '<button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Salvar Cadastro</button>' +
      '<button type="button" class="btn btn-secondary" id="btn-cancelar-produto"><i data-lucide="x"></i> Cancelar</button>' +
      '</div>';
    const tableWrapper = grid.closest(".table-wrapper");
    (tableWrapper?.parentNode || grid.parentNode).insertBefore(form, tableWrapper || grid);
  }

  tab.addEventListener("click", function(event) {
    const newButton = event.target.closest("#btn-novo-produto");
    if (newButton) { openProductForm(); return; }
    const cancelButton = event.target.closest("#btn-cancelar-produto");
    if (cancelButton) { closeProductForm(); return; }
    const editButton = event.target.closest("[data-product-action='edit']");
    if (editButton) editProduct(editButton.getAttribute("data-id"));
  });

  const form = document.getElementById("form-produto");
  if (form) {
    form.addEventListener("submit", function(event) {
      event.preventDefault();
      saveProductForm();
    });
  }
  const tipoSelect = document.getElementById("produto-tipo");
  if (tipoSelect) tipoSelect.addEventListener("change", syncProductServiceFields);
  lucide.createIcons();
}

function openProductForm(product) {
  const form = document.getElementById("form-produto");
  if (!form) return;
  form.classList.remove("hidden");
  editingProductId = product?.id || null;
  document.getElementById("produto-tipo").value = product?.tipo || "Produto";
  document.getElementById("produto-nome").value = product?.nome || "";
  document.getElementById("produto-categoria").value = product?.categoria || "";
  document.getElementById("produto-preco").value = product?.precoVenda ?? "";
  document.getElementById("produto-estoque").value = product?.estoqueAtual ?? "";
  document.getElementById("produto-custo").value = product?.custoMedio ?? "";
  document.getElementById("produto-validade").value = product?.validade || "";
  syncProductServiceFields();
  document.getElementById("produto-nome").focus();
}

function syncProductServiceFields() {
  const isService = document.getElementById("produto-tipo")?.value === "Serviço";
  document.querySelectorAll(".product-stock-field").forEach(field => field.classList.toggle("hidden", isService));
  ["produto-estoque", "produto-custo"].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.required = !isService;
    if (isService) input.value = "0";
  });
  const validade = document.getElementById("produto-validade");
  if (validade && isService) validade.value = "";
}

function closeProductForm() {
  const form = document.getElementById("form-produto");
  if (!form) return;
  editingProductId = null;
  form.reset();
  form.classList.add("hidden");
}

function editProduct(id) {
  const product = ERP_DATA.cadastro.produtos.find(p => p.id === id);
  if (product) openProductForm(product);
}

function saveProductForm() {
  const isService = document.getElementById("produto-tipo").value === "Serviço";
  const productData = {
    tipo: document.getElementById("produto-tipo").value,
    nome: document.getElementById("produto-nome").value.trim(),
    categoria: document.getElementById("produto-categoria").value.trim(),
    precoVenda: parseFloat(document.getElementById("produto-preco").value) || 0,
    estoqueAtual: isService ? 0 : (parseInt(document.getElementById("produto-estoque").value, 10) || 0),
    custoMedio: isService ? 0 : (parseFloat(document.getElementById("produto-custo").value) || 0),
    validade: isService ? null : (document.getElementById("produto-validade").value || null)
  };
  if (editingProductId) {
    const product = ERP_DATA.cadastro.produtos.find(p => p.id === editingProductId);
    if (product) Object.assign(product, productData, { imagem: null });
  } else {
    ERP_DATA.cadastro.produtos.unshift(Object.assign({ id: nextProductId(), imagem: null }, productData));
  }
  saveState();
  closeProductForm();
  renderCadastroTables();
}

function nextProductId() {
  const used = new Set(ERP_DATA.cadastro.produtos.map(p => p.id));
  let counter = ERP_DATA.cadastro.produtos.length + 1;
  let id = 'PROD-' + String(counter).padStart(3, "0");
  while (used.has(id)) {
    counter += 1;
    id = 'PROD-' + String(counter).padStart(3, "0");
  }
  return id;
}

function renderCadastroTables() {
  // Clientes
  const cliBody = document.getElementById("table-clientes-body");
  if (cliBody) {
    cliBody.innerHTML = ERP_DATA.cadastro.clientes.map(cli => `
      <tr>
        <td><strong>${cli.id}</strong></td>
        <td>${cli.nome}</td>
        <td>${cli.cnpj}</td>
        <td>${cli.email}</td>
        <td>${cli.telefone}</td>
        <td>${formatBRL(cli.totalComprado)}</td>
      </tr>
    `).join('');
  }

  // Fornecedores
  const forBody = document.getElementById("table-fornecedores-body");
  if (forBody) {
    forBody.innerHTML = ERP_DATA.cadastro.fornecedores.map(f => `
      <tr>
        <td><strong>${f.nome}</strong></td>
        <td>${f.cnpj}</td>
        <td>${f.contato}</td>
        <td>${f.telefone}</td>
        <td><span class="badge badge-success">${f.qualidade}</span></td>
        <td>${f.prazoMedio}</td>
      </tr>
    `).join('');
  }

  // Colaboradores
  const colBody = document.getElementById("table-colaboradores-body");
  if (colBody) {
    colBody.innerHTML = ERP_DATA.cadastro.colaboradores.map(col => `
      <tr>
        <td><strong>${col.nome}</strong></td>
        <td>${col.cargo}</td>
        <td>${col.departamento}</td>
        <td>${formatBRL(col.salario)}</td>
        <td>${formatDateBR(col.admissao)}</td>
        <td><span class="badge badge-success">${col.status}</span></td>
      </tr>
    `).join('');
  }

  // Veículos
  const veiBody = document.getElementById("table-veiculos-body");
  if (veiBody) {
    veiBody.innerHTML = ERP_DATA.cadastro.veiculos.map(v => `
      <tr>
        <td><strong>${v.placa}</strong></td>
        <td>${v.marca} ${v.modelo}</td>
        <td>${v.ano}</td>
        <td>${formatDateBR(v.vencimentoLicenciamento)}</td>
        <td><span class="badge ${v.status === 'Operacional' ? 'badge-success' : 'badge-warning'}">${v.status}</span></td>
      </tr>
    `).join('');
  }

  // Produtos e Serviços
  const prodGrid = document.getElementById("catalog-produtos-grid");
  if (prodGrid) {
    prodGrid.innerHTML = ERP_DATA.cadastro.produtos.map(p => `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td>${p.nome}</td>
        <td>${p.categoria}</td>
        <td>${formatBRL(p.precoVenda)}</td>
        <td>${p.tipo === "Serviço" ? "Não se aplica" : formatBRL(p.custoMedio)}</td>
        <td>${p.tipo === "Serviço" ? "Não se aplica" : `${p.estoqueAtual} unid`}</td>
        <td>${p.tipo === "Serviço" ? "Não se aplica" : (p.validade ? formatDateBR(p.validade) : "Sem validade")}</td>
        <td><button type="button" class="btn btn-secondary btn-icon-only" data-product-action="edit" data-id="${p.id}" title="Editar cadastro"><i data-lucide="pencil"></i></button></td>
      </tr>
    `).join('');
    lucide.createIcons();
  }
}

// 4. FISCAL CONTROLLER
function initFiscal() {
  // Contabilidade export button
  const contabBtn = document.getElementById("btn-export-contabilidade");
  if (contabBtn) {
    contabBtn.addEventListener("click", () => {
      alert("Sucesso! Todos os arquivos fiscais e XMLs da competência 06/2026 foram compactados e enviados para o e-mail: contabil@parceiro.com.br.");
    });
  }

  // NF-e API Configuration Form
  const nfeForm = document.getElementById("form-config-nfe");
  if (nfeForm) {
    nfeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const token = document.getElementById("api-nfe-token").value;
      if (!token) {
        alert("Por favor, insira o Token de Integração da NF-e.");
        return;
      }
      const badge = nfeForm.closest(".panel").querySelector(".badge");
      if (badge) {
        badge.className = "badge badge-success";
        badge.innerHTML = '<i data-lucide="wifi"></i> Ativo (Custom API)';
      }
      lucide.createIcons();
      alert("Integração de NF-e configurada e ativada com sucesso!");
    });
  }

  renderFiscalData();
}

function renderFiscalData() {
  const body = document.getElementById("table-fiscal-body");
  if (body) {
    body.innerHTML = ERP_DATA.fiscal.notasEmitidas.map(nf => {
      const isPending = String(nf.status || "").toLowerCase().includes("aguardando");
      const badgeClass = isPending ? "badge-warning" : "badge-success";
      const badgeIcon = isPending ? "clock" : "shield-check";
      const actions = isPending
        ? `<button class="btn btn-secondary" onclick="alert('Configure a integração fiscal para emitir este documento oficialmente.')" title="Integração fiscal pendente"><i data-lucide="clock"></i> Pendente</button>`
        : `<button class="btn btn-secondary btn-icon-only" onclick="baixarXML('${nf.id}', '${nf.xmlFile}')" title="Baixar XML"><i data-lucide="code"></i></button>
          <button class="btn btn-secondary btn-icon-only" onclick="baixarPDFNota('${nf.id}', '${nf.destinatario}', ${nf.valor}, '${nf.tipo}')" title="Visualizar/Imprimir Danfe"><i data-lucide="file-text"></i></button>`;
      return `
        <tr>
          <td><strong>${nf.id}</strong>${nf.origem ? `<span class="muted-block">Pedido ${nf.origem}</span>` : ""}</td>
          <td>${nf.destinatario}</td>
          <td>${nf.tipo}</td>
          <td>${formatBRL(nf.valor)}</td>
          <td><span class="badge ${badgeClass}"><i data-lucide="${badgeIcon}"></i> ${nf.status}</span></td>
          <td style="text-align: right; white-space: nowrap;">${actions}</td>
        </tr>
      `;
    }).join('');
    lucide.createIcons();
  }
}

window.baixarXML = function(id, xmlFilename) {
  const nf = ERP_DATA.fiscal.notasEmitidas.find(item => item.id === id);
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="${xmlFilename.replace('.xml', '')}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>${Math.floor(10000000 + Math.random() * 90000000)}</cNF>
        <natOp>Venda de servico/mercadoria</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${id.replace(/\D/g, '') || '1026'}</nNF>
        <dhEmi>${new Date().toISOString()}</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>${getActiveCompany()?.cnpj || '00000000000000'}</CNPJ>
        <xNome>${getActiveCompany()?.razaoSocial || 'Empresa'}</xNome>
      </emit>
      <dest>
        <xNome>${nf?.destinatario || 'Destinatário'}</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>0001</cProd>
          <xProd>Prestacao de Servicos Gerais / Venda Integrada</xProd>
          <vProd>1.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>1.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;
  
  const blob = new Blob([xmlContent], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = xmlFilename || `${id}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.baixarPDFNota = function(id, dest, valor, tipo) {
  const comp = getActiveCompany();
  const rz = comp ? comp.razaoSocial : 'Empresa';
  const cnpj = comp ? comp.cnpj : '00.000.000/0001-00';
  const contentHtml = `
  <div class="border-box" style="text-align: center; font-size: 14px; font-weight: bold;">
    RECEBEMOS OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO
  </div>
  <table class="header-table">
    <tr>
      <td width="50%">
        <span class="label">EMISSOR</span><br>
        <span class="value">${rz}</span><br>
        CNPJ: ${cnpj}
      </td>
      <td width="25%" style="text-align: center;">
        <strong>DANFE</strong><br>
        Documento Auxiliar da Nota Fiscal Eletrônica
      </td>
      <td width="25%">
        <span class="label">NÚMERO / CONTROLE</span><br>
        <span class="value" style="font-size: 14px;">${id}</span><br>
        SÉRIE: 001
      </td>
    </tr>
    <tr>
      <td>
        <span class="label">DESTINATÁRIO</span><br>
        <span class="value">${dest}</span>
      </td>
      <td>
        <span class="label">DATA EMISSÃO</span><br>
        <span class="value">${new Date().toLocaleDateString('pt-BR')}</span>
      </td>
      <td>
        <span class="label">VALOR TOTAL</span><br>
        <span class="value" style="font-size: 14px; color: green;">${formatBRL(valor)}</span>
      </td>
    </tr>
  </table>
  
  <div class="border-box" style="margin-top: 20px; min-height: 150px;">
    <span class="label">DADOS DOS PRODUTOS / SERVIÇOS</span>
    <table width="100%" style="border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="border-bottom: 1px solid #000;">
          <th align="left">CÓD</th>
          <th align="left">DESCRIÇÃO</th>
          <th align="right">QTD</th>
          <th align="right">UNIT</th>
          <th align="right">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>0001</td>
          <td>PRESTAÇÃO DE SERVIÇOS COMPLEMENTARES E CONTRATUAIS (${tipo})</td>
          <td align="right">1.0</td>
          <td align="right">${formatBRL(valor)}</td>
          <td align="right"><strong>${formatBRL(valor)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <div class="border-box">
    <span class="label">DADOS ADICIONAIS / OBSERVAÇÕES</span><br>
    <span class="value">Emissão Homologada via API Receita Federal / SEFAZ Nacional.</span>
  </div>
  
  <div class="footer">
    DANFE gerado eletronicamente pelo APP ADM ERP.
  </div>`;
  const branded = wrapPdfWithBranding(contentHtml, `
    body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; color: #000; }
    .border-box { border: 2px solid #000; padding: 10px; margin-bottom: 10px; }
    .header-table { width: 100%; border-collapse: collapse; }
    .header-table td { border: 1px solid #000; padding: 6px; }
    .title { font-size: 16px; font-weight: bold; text-align: center; }
    .label { font-size: 9px; text-transform: uppercase; color: #555; }
    .value { font-weight: bold; font-size: 11px; }
    .footer { text-align: center; margin-top: 30px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
  `);
  
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DANFE - ${id}</title>
  <style>${branded.styles}</style>
</head>
<body class="${branded.bodyClass}">
  ${branded.body}
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
};

// 5. FINANCEIRO CONTROLLER
const editingFinanceIds = { pagar: null, receber: null };
let editingFaturamentoId = null;

function initFinanceiro() {
  setupFinancialLaunchers();
  setupManualBilling();
  setupFinanceFilters();
  renderFinanceiroTables();

  // Accounts Payable/Receivable buttons Actions (Mark as Paid/Received)
  window.payBill = (id) => {
    const bill = ERP_DATA.financeiro.contasPagar.find(b => b.id === id);
    if (bill) {
      bill.status = "Pago";
      // Deduct from Balance
      ERP_DATA.financeiro.fluxoCaixa.saldoAtual -= bill.valor;
      saveState();
      renderFinanceiroTables();
      updateDashboardKPIs();
    }
  };

  window.receiveBill = (id) => {
    const bill = ERP_DATA.financeiro.contasReceber.find(b => b.id === id);
    if (bill) {
      bill.status = "Recebido";
      // Add to Balance
      ERP_DATA.financeiro.fluxoCaixa.saldoAtual += bill.valor;
      saveState();
      renderFinanceiroTables();
      updateDashboardKPIs();
    }
  };

  window.editPayableBill = (id) => {
    const bill = ERP_DATA.financeiro.contasPagar.find(b => b.id === id);
    if (!bill) return;
    document.getElementById("pagar-descricao").value = bill.descricao || "";
    document.getElementById("pagar-fornecedor").value = bill.fornecedor || "";
    document.getElementById("pagar-vencimento").value = bill.vencimento || "";
    document.getElementById("pagar-valor").value = bill.valor || 0;
    const months = document.getElementById("pagar-meses");
    if (months) months.value = "1";
    setFinanceEditState("pagar", bill);
  };

  window.deletePayableBill = (id) => {
    const index = ERP_DATA.financeiro.contasPagar.findIndex(b => b.id === id);
    if (index < 0) return;
    const bill = ERP_DATA.financeiro.contasPagar[index];
    if (!confirm("Excluir esta conta a pagar?")) return;
    if (normalizeText(bill.status) === "pago") {
      ERP_DATA.financeiro.fluxoCaixa.saldoAtual += Number(bill.valor) || 0;
    }
    ERP_DATA.financeiro.contasPagar.splice(index, 1);
    if (editingFinanceIds.pagar === id) clearFinanceEditState("pagar");
    saveState();
    renderFinanceiroTables();
    updateDashboardKPIs();
  };

  window.editReceivableBill = (id) => {
    const bill = ERP_DATA.financeiro.contasReceber.find(b => b.id === id);
    if (!bill) return;
    document.getElementById("receber-descricao").value = bill.descricao || "";
    document.getElementById("receber-cliente").value = bill.cliente || "";
    document.getElementById("receber-vencimento").value = bill.vencimento || "";
    document.getElementById("receber-valor").value = bill.valor || 0;
    const months = document.getElementById("receber-meses");
    if (months) months.value = "1";
    setFinanceEditState("receber", bill);
  };

  window.deleteReceivableBill = (id) => {
    const index = ERP_DATA.financeiro.contasReceber.findIndex(b => b.id === id);
    if (index < 0) return;
    const bill = ERP_DATA.financeiro.contasReceber[index];
    if (!confirm("Excluir esta conta a receber?")) return;
    if (normalizeText(bill.status) === "recebido") {
      ERP_DATA.financeiro.fluxoCaixa.saldoAtual -= Number(bill.valor) || 0;
    }
    ERP_DATA.financeiro.contasReceber.splice(index, 1);
    if (editingFinanceIds.receber === id) clearFinanceEditState("receber");
    saveState();
    renderFinanceiroTables();
    updateDashboardKPIs();
  };
}

function setupFinancialLaunchers() {
  bindFinancialForm("pagar", {
    list: ERP_DATA.financeiro.contasPagar,
    prefix: "PAG",
    build: () => ({
      id: nextFinanceId("PAG", ERP_DATA.financeiro.contasPagar),
      descricao: document.getElementById("pagar-descricao").value.trim(),
      fornecedor: document.getElementById("pagar-fornecedor").value.trim(),
      vencimento: document.getElementById("pagar-vencimento").value,
      valor: parseFloat(document.getElementById("pagar-valor").value) || 0,
      status: "A Pagar"
    }),
    repeatMonths: () => parseInt(document.getElementById("pagar-meses")?.value, 10) || 1
  });

  const receberCliente = document.getElementById("receber-cliente");
  if (receberCliente) {
    populateClientSelectors();
  }
  bindFinancialForm("receber", {
    list: ERP_DATA.financeiro.contasReceber,
    prefix: "REC",
    build: () => ({
      id: nextFinanceId("REC", ERP_DATA.financeiro.contasReceber),
      descricao: document.getElementById("receber-descricao").value.trim(),
      cliente: document.getElementById("receber-cliente").value,
      vencimento: document.getElementById("receber-vencimento").value,
      valor: parseFloat(document.getElementById("receber-valor").value) || 0,
      status: "A Receber"
    }),
    repeatMonths: () => parseInt(document.getElementById("receber-meses")?.value, 10) || 1
  });

  bindFinancialForm("fluxo", {
    list: ERP_DATA.financeiro.fluxoCaixa.diario,
    build: () => {
      const tipo = document.getElementById("fluxo-tipo").value;
      const valor = parseFloat(document.getElementById("fluxo-valor").value) || 0;
      return {
        id: nextFinanceId("FLX", ERP_DATA.financeiro.fluxoCaixa.diario),
        data: document.getElementById("fluxo-data").value,
        receita: tipo === "receita" ? valor : 0,
        despesa: tipo === "despesa" ? valor : 0
      };
    },
    afterSave: (item) => {
      ERP_DATA.financeiro.fluxoCaixa.saldoAtual += (item.receita || 0) - (item.despesa || 0);
      renderForecastTable();
      renderCashFlowChart();
      updateDashboardKPIs();
    }
  });
}

function bindFinancialForm(kind, options) {
  const btnNovo = document.getElementById(`btn-novo-${kind}`);
  const btnCancelar = document.getElementById(`btn-cancelar-${kind}`);
  const form = document.getElementById(`form-novo-${kind}`);
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!form) return;
  if (btnNovo && btnNovo.dataset.bound !== "true") {
    btnNovo.dataset.bound = "true";
    btnNovo.addEventListener("click", () => {
      clearFinanceEditState(kind);
      setDefaultFinancialDates(kind);
      form.classList.remove("hidden");
    });
  }
  if (btnCancelar && btnCancelar.dataset.bound !== "true") {
    btnCancelar.dataset.bound = "true";
    btnCancelar.addEventListener("click", () => {
      form.reset();
      clearFinanceEditState(kind);
      form.classList.add("hidden");
    });
  }
  if (form.dataset.bound === "true") return;
  form.dataset.bound = "true";
  form.addEventListener("submit", event => {
    event.preventDefault();
    const item = options.build();
    const editingId = editingFinanceIds[kind];
    if (editingId) {
      const existingItem = options.list.find(financeItem => financeItem.id === editingId);
      if (existingItem) {
        const previousValue = Number(existingItem.valor) || 0;
        const previousStatus = existingItem.status;
        Object.assign(existingItem, item, { id: editingId, status: previousStatus });
        adjustFinanceBalanceAfterEdit(kind, previousValue, Number(existingItem.valor) || 0, previousStatus);
      }
      clearFinanceEditState(kind);
    } else {
      const repeatMonths = Math.max(1, Math.min(120, options.repeatMonths ? options.repeatMonths() : 1));
      const items = buildRepeatedFinancialItems(item, options.prefix, options.list, repeatMonths);
      options.list.unshift(...items);
      if (options.afterSave) items.forEach(savedItem => options.afterSave(savedItem));
    }
    saveState();
    form.reset();
    form.classList.add("hidden");
    renderFinanceiroTables();
    renderForecastTable();
    updateDashboardKPIs();
  });

  form.dataset.defaultSubmitHtml = submitButton?.innerHTML || "";
}

function clearFinanceEditState(kind) {
  if (!(kind in editingFinanceIds)) return;
  editingFinanceIds[kind] = null;
  const form = document.getElementById(`form-novo-${kind}`);
  const submitButton = form?.querySelector('button[type="submit"]');
  if (submitButton && form.dataset.defaultSubmitHtml) {
    submitButton.innerHTML = form.dataset.defaultSubmitHtml;
  }
}

function setFinanceEditState(kind, item) {
  const form = document.getElementById(`form-novo-${kind}`);
  if (!form || !item) return;
  editingFinanceIds[kind] = item.id;
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.innerHTML = `<i data-lucide="save"></i> Salvar Alterações`;
  form.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  lucide.createIcons();
}

function adjustFinanceBalanceAfterEdit(kind, previousValue, currentValue, status) {
  const paidStatus = normalizeText(status);
  if (kind === "pagar" && paidStatus === "pago") {
    ERP_DATA.financeiro.fluxoCaixa.saldoAtual += previousValue - currentValue;
  }
  if (kind === "receber" && paidStatus === "recebido") {
    ERP_DATA.financeiro.fluxoCaixa.saldoAtual += currentValue - previousValue;
  }
}

function buildRepeatedFinancialItems(baseItem, prefix, list, repeatMonths) {
  if (repeatMonths <= 1 || !baseItem.vencimento) return [baseItem];
  const originalDescription = baseItem.descricao || "";
  const usedIds = new Set(list.map(item => item.id));
  return Array.from({ length: repeatMonths }, (_, index) => {
    const item = Object.assign({}, baseItem);
    item.id = nextFinanceId(prefix, list, usedIds);
    usedIds.add(item.id);
    item.vencimento = addMonthsToIsoDate(baseItem.vencimento, index);
    item.descricao = `${originalDescription} (${index + 1}/${repeatMonths})`;
    item.parcela = index + 1;
    item.totalParcelas = repeatMonths;
    return item;
  });
}

function addMonthsToIsoDate(isoDate, monthsToAdd) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1 + monthsToAdd, 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date.toISOString().split("T")[0];
}

function setDefaultFinancialDates(kind) {
  const today = new Date().toISOString().split("T")[0];
  const fields = {
    pagar: ["pagar-vencimento"],
    receber: ["receber-vencimento"],
    fluxo: ["fluxo-data"]
  }[kind] || [];
  fields.forEach(id => {
    const input = document.getElementById(id);
    if (input && !input.value) input.value = today;
  });
}

function setupFinanceFilters() {
  ["pagar", "receber", "faturamento", "fluxo"].forEach(kind => {
    const controls = document.querySelectorAll(`[id^="filter-${kind}-"]`);
    controls.forEach(control => {
      if (control.dataset.financeFilterBound === "true") return;
      control.dataset.financeFilterBound = "true";
      control.addEventListener("change", () => {
        updateFinanceCustomPeriodVisibility(kind);
        if (kind === "fluxo") {
          renderForecastTable();
        } else {
          renderFinanceiroTables();
        }
      });
    });
    updateFinanceCustomPeriodVisibility(kind);
  });
}

function updateFinanceCustomPeriodVisibility(kind) {
  const period = document.getElementById(`filter-${kind}-period`)?.value || "all";
  const wrapper = document.querySelector(`[data-finance-filter="${kind}"]`);
  if (!wrapper) return;
  wrapper.querySelectorAll(".finance-custom-period").forEach(field => {
    field.classList.toggle("hidden", period !== "custom");
  });
}

function getFinanceFilters(kind) {
  return {
    period: document.getElementById(`filter-${kind}-period`)?.value || "all",
    status: document.getElementById(`filter-${kind}-status`)?.value || "all",
    start: document.getElementById(`filter-${kind}-start`)?.value || "",
    end: document.getElementById(`filter-${kind}-end`)?.value || ""
  };
}

function parseFinancialDate(value) {
  if (!value || typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const shortDate = value.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/);
  if (shortDate) {
    const currentYear = new Date().getFullYear();
    return new Date(Number(shortDate[3]) || currentYear, Number(shortDate[2]) - 1, Number(shortDate[1]));
  }
  const monthLabel = value.match(/^([A-Za-zÀ-ÿ]{3})\/(\d{2})$/);
  if (monthLabel) {
    const months = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
    const key = monthLabel[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (key in months) return new Date(2000 + Number(monthLabel[2]), months[key], 1);
  }
  return null;
}

function getFinancialDateValue(item, field) {
  return parseFinancialDate(item?.[field]);
}

function sortByFinancialDateAsc(items, field) {
  return [...items].sort((a, b) => {
    const dateA = getFinancialDateValue(a, field);
    const dateB = getFinancialDateValue(b, field);
    return (dateA ? dateA.getTime() : Number.MAX_SAFE_INTEGER) - (dateB ? dateB.getTime() : Number.MAX_SAFE_INTEGER);
  });
}

function isSameMonth(date, reference) {
  return date && date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

function matchesFinancePeriod(item, dateField, filters) {
  const date = getFinancialDateValue(item, dateField);
  if (filters.period === "all") return true;
  if (!date) return false;
  const today = new Date();
  if (filters.period === "current") return isSameMonth(date, today);
  if (filters.period === "previous") {
    return isSameMonth(date, new Date(today.getFullYear(), today.getMonth() - 1, 1));
  }
  if (filters.period === "custom") {
    const start = parseFinancialDate(filters.start);
    const end = parseFinancialDate(filters.end);
    if (start && date < start) return false;
    if (end && date > end) return false;
  }
  return true;
}

function getFinancialStatusInfo(item) {
  const rawStatus = normalizeText(item?.status || "");
  const dueDate = getFinancialDateValue(item, "vencimento");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPaid = rawStatus === "pago" || rawStatus === "recebido";
  if (isPaid) return { key: "paid", label: item.status || "Pago", badge: "badge-success" };
  if (rawStatus === "atrasado" || (dueDate && dueDate < today)) {
    return { key: "overdue", label: "Vencido", badge: "badge-danger" };
  }
  if (dueDate && dueDate >= today) return { key: "due", label: "A vencer", badge: "badge-warning" };
  return { key: "pending", label: "Pendente", badge: "badge-warning" };
}

function matchesFinanceStatus(item, filters) {
  if (filters.status === "all") return true;
  const info = getFinancialStatusInfo(item);
  if (filters.status === "pending") return info.key !== "paid";
  return info.key === filters.status;
}

function filterFinanceItems(items, kind, dateField) {
  const filters = getFinanceFilters(kind);
  return sortByFinancialDateAsc(items, dateField)
    .filter(item => matchesFinancePeriod(item, dateField, filters))
    .filter(item => matchesFinanceStatus(item, filters));
}

function getCashFlowResult(item) {
  return (Number(item?.receita) || 0) - (Number(item?.despesa) || 0);
}

function filterCashFlowItems(items) {
  const filters = getFinanceFilters("fluxo");
  return sortByFinancialDateAsc(items, "data")
    .filter(item => matchesFinancePeriod(item, "data", filters))
    .filter(item => {
      const result = getCashFlowResult(item);
      if (filters.status === "all") return true;
      if (filters.status === "positive") return result >= 0;
      if (filters.status === "negative") return result < 0;
      return true;
    });
}

function getFinanceEmptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}" style="text-align:center;color:var(--text-muted);padding:2rem;">${message}</td></tr>`;
}

function formatShortDate(isoDate) {
  if (!isoDate) return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

function setupManualBilling() {
  const btnNovo = document.getElementById("btn-novo-faturamento");
  const btnCancelar = document.getElementById("btn-cancelar-faturamento");
  const form = document.getElementById("form-novo-faturamento");
  const clienteSelect = document.getElementById("fat-cliente");
  if (clienteSelect) {
    populateClientSelectors();
  }
  if (btnNovo && form && btnNovo.dataset.bound !== "true") {
    btnNovo.dataset.bound = "true";
    btnNovo.addEventListener("click", () => {
      const today = new Date().toISOString().split("T")[0];
      editingFaturamentoId = null;
      document.getElementById("fat-emissao").value = today;
      document.getElementById("fat-vencimento").value = today;
      document.getElementById("fat-descricao").value = "";
      document.getElementById("fat-valor").value = "";
      form.classList.remove("hidden");
    });
  }
  if (btnCancelar && form && btnCancelar.dataset.bound !== "true") {
    btnCancelar.dataset.bound = "true";
    btnCancelar.addEventListener("click", () => {
      form.reset();
      form.classList.add("hidden");
    });
  }
  if (form && form.dataset.bound !== "true") {
    form.dataset.bound = "true";
    form.addEventListener("submit", event => {
      event.preventDefault();
      const fatData = {
        descricao: document.getElementById("fat-descricao").value.trim(),
        cliente: document.getElementById("fat-cliente").value,
        emissao: document.getElementById("fat-emissao").value,
        vencimento: document.getElementById("fat-vencimento").value,
        valor: parseFloat(document.getElementById("fat-valor").value) || 0
      };
      if (editingFaturamentoId) {
        const fat = ERP_DATA.financeiro.contasReceber.find(item => item.id === editingFaturamentoId);
        if (fat) Object.assign(fat, fatData);
      } else {
        const newFat = {
          id: nextFinanceId("FAT", ERP_DATA.financeiro.contasReceber),
          ...fatData,
        status: "A Receber",
        manualFaturamento: true,
        nfseEmitida: false,
        boletoGerado: false
        };
        ERP_DATA.financeiro.contasReceber.unshift(newFat);
      }
      editingFaturamentoId = null;
      saveState();
      form.reset();
      form.classList.add("hidden");
      renderFinanceiroTables();
    });
  }
}

function nextFinanceId(prefix, list, reservedIds) {
  const used = reservedIds || new Set(list.map(item => item.id));
  let counter = list.length + 1;
  let id = `${prefix}-${String(counter).padStart(3, "0")}`;
  while (used.has(id)) {
    counter += 1;
    id = `${prefix}-${String(counter).padStart(3, "0")}`;
  }
  return id;
}

function renderFinanceiroTables() {
  // Pagar
  const pagarBody = document.getElementById("table-pagar-body");
  if (pagarBody) {
    const pagarItems = filterFinanceItems(ERP_DATA.financeiro.contasPagar, "pagar", "vencimento");
    pagarBody.innerHTML = pagarItems.length ? pagarItems.map(b => {
      const status = getFinancialStatusInfo(b);
      return `
      <tr>
        <td>${b.descricao}</td>
        <td>${b.fornecedor}</td>
        <td>${formatDateBR(b.vencimento)}</td>
        <td>${formatBRL(b.valor)}</td>
        <td><span class="badge ${status.badge}">${status.label}</span></td>
        <td>
          <div class="finance-actions">
            ${b.status !== 'Pago' ? `<button class="btn btn-secondary btn-icon-only" onclick="payBill('${b.id}')" title="Marcar como Pago"><i data-lucide="check"></i></button>` : ''}
            <button class="btn btn-secondary btn-icon-only" onclick="editPayableBill('${b.id}')" title="Editar"><i data-lucide="pencil"></i></button>
            <button class="btn btn-danger btn-icon-only" onclick="deletePayableBill('${b.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>
    `}).join('') : getFinanceEmptyRow(6, "Nenhuma conta a pagar encontrada para os filtros atuais.");
  }

  // Receber
  const receberBody = document.getElementById("table-receber-body");
  if (receberBody) {
    const receberItems = filterFinanceItems(ERP_DATA.financeiro.contasReceber, "receber", "vencimento");
    receberBody.innerHTML = receberItems.length ? receberItems.map(b => {
      const status = getFinancialStatusInfo(b);
      return `
      <tr>
        <td>${b.descricao}</td>
        <td>${b.cliente}</td>
        <td>${formatDateBR(b.vencimento)}</td>
        <td>${formatBRL(b.valor)}</td>
        <td><span class="badge ${status.badge}">${status.label}</span></td>
        <td>
          <div class="finance-actions">
            ${b.status !== 'Recebido' ? `<button class="btn btn-secondary btn-icon-only" onclick="receiveBill('${b.id}')" title="Receber Valor"><i data-lucide="arrow-down-left"></i></button>` : ''}
            <button class="btn btn-secondary btn-icon-only" onclick="editReceivableBill('${b.id}')" title="Editar"><i data-lucide="pencil"></i></button>
            <button class="btn btn-danger btn-icon-only" onclick="deleteReceivableBill('${b.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>
    `}).join('') : getFinanceEmptyRow(6, "Nenhuma conta a receber encontrada para os filtros atuais.");
  }

  // Faturamento
  const fatBody = document.getElementById("table-faturamento-body");
  if (fatBody) {
    const allFaturas = ERP_DATA.financeiro.contasReceber
      .filter(r => r.contratoId || r.manualFaturamento || r.descricao?.startsWith('Faturamento'))
      .map(f => ({ id: f.id, descricao: f.descricao || '', cliente: f.cliente, emissao: f.emissao || new Date().toISOString().split('T')[0], vencimento: f.vencimento, valor: f.valor, status: f.status, nfseEmitida: f.nfseEmitida || false, boletoGerado: f.boletoGerado || false, recId: f.id }));
    const filteredFaturas = filterFinanceItems(allFaturas, "faturamento", "vencimento");

    if (!filteredFaturas.length) {
      fatBody.innerHTML = getFinanceEmptyRow(9, "Nenhuma fatura encontrada para os filtros atuais.");
    } else {
      fatBody.innerHTML = filteredFaturas.map(fat => {
        const status = getFinancialStatusInfo(fat);
        return `
        <tr>
          <td><strong>${fat.id}</strong></td>
          <td>${fat.cliente}</td>
          <td>${formatDateBR(fat.emissao)}</td>
          <td>${formatDateBR(fat.vencimento)}</td>
          <td><strong>${formatBRL(fat.valor)}</strong></td>
          <td><span class="badge ${status.badge}">${status.label}</span></td>
          <td>
            <button class="btn btn-secondary" style="font-size:0.78rem;padding:0.3rem 0.75rem;" onclick="abrirEmissorNacional()"><i data-lucide="external-link"></i> Abrir Emissor</button>
          </td>
          <td>
            <button class="btn btn-primary" style="font-size:0.78rem;padding:0.3rem 0.75rem;" onclick="gerarBoletoPdf('${fat.recId}', '${fat.id}')"><i data-lucide="file-text"></i> Boleto PDF</button>
          </td>
          <td>
            <div class="commercial-actions">
              <button class="btn btn-secondary btn-icon-only" onclick="editarFaturamento('${fat.recId}')" title="Editar faturamento"><i data-lucide="pencil"></i></button>
              <button class="btn btn-danger btn-icon-only" onclick="excluirFaturamento('${fat.recId}')" title="Excluir faturamento"><i data-lucide="trash-2"></i></button>
            </div>
          </td>
        </tr>
      `}).join('');
    }
  }

  renderCashFlowTable();

  lucide.createIcons();
}

function renderCashFlowTable() {
  const body = document.getElementById("finance-cashflow-table-body");
  if (!body) return;
  const items = filterCashFlowItems(ERP_DATA.financeiro.fluxoCaixa.diario);
  body.innerHTML = items.length ? items.map(item => {
    const result = getCashFlowResult(item);
    const typeLabel = result >= 0 ? "Entrada" : "Saída";
    const typeBadge = result >= 0 ? "badge-success" : "badge-danger";
    return `
      <tr>
        <td><strong>${formatDateBR(item.data)}</strong></td>
        <td><span class="badge ${typeBadge}">${typeLabel}</span></td>
        <td>${formatBRL(item.receita || 0)}</td>
        <td>${formatBRL(item.despesa || 0)}</td>
        <td><strong>${formatBRL(result)}</strong></td>
      </tr>
    `;
  }).join("") : getFinanceEmptyRow(5, "Nenhum lançamento de fluxo encontrado para os filtros atuais.");
}

// ============================================================
// NFS-E EXTERNA E BOLETO PDF
// ============================================================
window.abrirEmissorNacional = function() {
  window.open("https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional", "_blank", "noopener");
};

window.editarFaturamento = function(id) {
  const fat = ERP_DATA.financeiro.contasReceber.find(item => item.id === id);
  const form = document.getElementById("form-novo-faturamento");
  if (!fat || !form) return;
  editingFaturamentoId = id;
  document.getElementById("fat-cliente").value = fat.cliente || "";
  document.getElementById("fat-descricao").value = fat.descricao || "";
  document.getElementById("fat-emissao").value = fat.emissao || new Date().toISOString().split("T")[0];
  document.getElementById("fat-vencimento").value = fat.vencimento || "";
  document.getElementById("fat-valor").value = fat.valor || 0;
  form.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.excluirFaturamento = function(id) {
  const index = ERP_DATA.financeiro.contasReceber.findIndex(item => item.id === id);
  if (index < 0) return;
  if (!confirm("Excluir este faturamento?")) return;
  ERP_DATA.financeiro.contasReceber.splice(index, 1);
  saveState();
  renderFinanceiroTables();
};

window.gerarBoletoPdf = function(recId, fallbackFatId) {
  const fat = ERP_DATA.financeiro.contasReceber.find(item => item.id === recId);
  if (!fat) return;
  const comp = getActiveCompany();
  const pixKey = comp ? comp.pixKey : 'chave-pix-nao-configurada';
  const razaoSocial = comp ? comp.razaoSocial : 'Empresa';
  const cnpj = comp ? comp.cnpj : '00.000.000/0001-00';
  const today = new Date();
  const emissao = fat.emissao || today.toISOString().split("T")[0];
  const vencimento = fat.vencimento || emissao;
  const emissaoBR = formatDateBR(emissao);
  const vencimentoBR = formatDateBR(vencimento);
  const linhaDigitavel = "00190.00009 00000.000000 00000.000000 1 " + String(Math.round((fat.valor || 0) * 100)).padStart(10, "0");
  const pixPayload = buildPixPayload({
    pixKey,
    merchantName: razaoSocial,
    merchantCity: "BRASIL",
    amount: fat.valor || 0,
    txid: (fat.id || fallbackFatId || "FAT").replace(/[^A-Za-z0-9]/g, "").slice(0, 25)
  });
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=" + encodeURIComponent(pixPayload);
  const contentHtml = `
  <section class="doc">
    <div class="top">
      <div>
        <h1>Boleto de Cobrança</h1>
        <div>${fat.id || fallbackFatId}</div>
      </div>
      <div style="text-align:right">
        <div class="muted">Beneficiário</div>
        <strong>${razaoSocial}</strong><br>
        CNPJ: ${cnpj}
      </div>
    </div>
    <div class="grid">
      <div class="box"><div class="muted">Pagador</div><strong>${fat.cliente}</strong></div>
      <div class="box"><div class="muted">Valor</div><span class="amount">${formatBRL(fat.valor || 0)}</span></div>
      <div class="box"><div class="muted">Emissão</div><strong>${emissaoBR}</strong></div>
      <div class="box"><div class="muted">Vencimento</div><strong>${vencimentoBR}</strong></div>
      <div class="box"><div class="muted">Descrição</div><strong>${fat.descricao || "Faturamento"}</strong></div>
      <div class="box"><div class="muted">Chave Pix</div><strong>${pixKey}</strong></div>
    </div>
    <div class="pix">
      <div>
        <div class="muted">QR Code Pix</div>
        <img src="${qrUrl}" alt="QR Code Pix">
      </div>
      <div>
        <strong>Pagamento via Pix</strong>
        <p>Escaneie o QR Code no aplicativo do banco ou use o Pix copia e cola abaixo.</p>
        <div class="copy">${pixPayload}</div>
      </div>
    </div>
    <div class="barcode">${linhaDigitavel}</div>
    <div class="bars">${Array.from({ length: 42 }, (_, i) => `<span style="width:${(i % 4) + 2}px"></span>`).join("")}</div>
    <div class="footer">Documento gerado pelo APP ADM para impressão/PDF. Para cobrança bancária registrada, envie os dados ao banco/integrador responsável.</div>
  </section>`;
  const branded = wrapPdfWithBranding(contentHtml, `
    body { font-family: Arial, sans-serif; color: #111827; margin: 20px; }
    .doc { max-width: 820px; margin: 0 auto; border: 1px solid #111827; padding: 14px; }
    .top { display: flex; justify-content: space-between; gap: 18px; border-bottom: 2px solid #111827; padding-bottom: 10px; }
    h1 { margin: 0; font-size: 20px; }
    .muted { color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 12px 0; }
    .box { border: 1px solid #d1d5db; padding: 8px; min-height: 42px; }
    .pix { display: grid; grid-template-columns: 150px 1fr; gap: 12px; align-items: center; border: 2px solid #111827; padding: 10px; margin-top: 12px; }
    .pix img { width: 132px; height: 132px; display: block; }
    .pix p { margin: 6px 0; }
    .copy { word-break: break-all; font-family: "Courier New", monospace; font-size: 9px; background: #f3f4f6; border: 1px solid #d1d5db; padding: 7px; margin-top: 6px; }
    .amount { font-size: 21px; font-weight: 800; }
    .barcode { margin-top: 12px; border: 1px solid #111827; padding: 10px; font-family: "Courier New", monospace; font-size: 16px; letter-spacing: 1px; text-align: center; }
    .bars { display: flex; height: 38px; gap: 3px; align-items: stretch; justify-content: center; margin-top: 8px; }
    .bars span { background: #111827; display: block; }
    .footer { margin-top: 12px; font-size: 10px; color: #374151; border-top: 1px dashed #9ca3af; padding-top: 8px; }
    @page { size: A4; margin: 8mm; }
    @media print { body { margin: 0; } .doc { border: 0; } }
  `);
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Boleto ${fat.id || fallbackFatId}</title>
  <style>${branded.styles}</style>
</head>
<body class="${branded.bodyClass}">
  ${branded.body}
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  fat.boletoGerado = true;
  saveState();
  renderFinanceiroTables();
};

function buildPixPayload({ pixKey, merchantName, merchantCity, amount, txid }) {
  const merchantAccount = emv("00", "BR.GOV.BCB.PIX") + emv("01", String(pixKey || ""));
  const payloadWithoutCrc =
    emv("00", "01") +
    emv("26", merchantAccount) +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", Number(amount || 0).toFixed(2)) +
    emv("58", "BR") +
    emv("59", sanitizePixText(merchantName || "EMPRESA").slice(0, 25)) +
    emv("60", sanitizePixText(merchantCity || "BRASIL").slice(0, 15)) +
    emv("62", emv("05", sanitizePixText(txid || "FAT").slice(0, 25))) +
    "6304";
  return payloadWithoutCrc + crc16Pix(payloadWithoutCrc);
}

function emv(id, value) {
  const text = String(value || "");
  return id + String(text.length).padStart(2, "0") + text;
}

function sanitizePixText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, "")
    .trim()
    .toUpperCase();
}

function crc16Pix(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function renderForecastChart() { renderForecastTable(); }

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date) {
  const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${labels[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
}

function isFinancialSettled(item) {
  const status = normalizeText(item?.status || "");
  return status === "pago" || status === "recebido";
}

function getProjectedAmountForMonth(items, monthStart, monthEnd, valueField, currentMonthStart) {
  return items.reduce((sum, item) => {
    if (isFinancialSettled(item)) return sum;
    const date = getFinancialDateValue(item, "vencimento");
    if (!date) return sum;
    const belongsToMonth = date >= monthStart && date <= monthEnd;
    const overdueCarriedToCurrentMonth = getMonthKey(monthStart) === getMonthKey(currentMonthStart) && date < currentMonthStart;
    return belongsToMonth || overdueCarriedToCurrentMonth ? sum + (Number(item[valueField]) || 0) : sum;
  }, 0);
}

function getForecastRows() {
  const cenario = document.getElementById("select-cenario")?.value || "realista";
  let multiplier = 1.0;
  if (cenario === "conservador") multiplier = 0.85;
  if (cenario === "otimista") multiplier = 1.2;
  const today = new Date();
  const currentMonthStart = getMonthStart(today);
  let saldo = ERP_DATA.financeiro.fluxoCaixa.saldoAtual || 0;
  return Array.from({ length: 6 }, (_, index) => {
    const monthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + index, 1);
    const monthEnd = getMonthEnd(monthStart);
    const receitas = getProjectedAmountForMonth(ERP_DATA.financeiro.contasReceber, monthStart, monthEnd, "valor", currentMonthStart) * multiplier;
    const despesasFixas = getProjectedAmountForMonth(ERP_DATA.financeiro.contasPagar, monthStart, monthEnd, "valor", currentMonthStart);
    const resultado = receitas - despesasFixas;
    saldo += resultado;
    return { mes: getMonthLabel(monthStart), data: monthStart.toISOString().split("T")[0], receitas, despesas: despesasFixas, resultado, saldo, cenario };
  });
}

function filterForecastRows(rows) {
  const filters = getFinanceFilters("fluxo");
  return sortByFinancialDateAsc(rows, "data")
    .filter(row => matchesFinancePeriod(row, "data", filters))
    .filter(row => {
      if (filters.status === "all") return true;
      if (filters.status === "positive") return row.resultado >= 0;
      if (filters.status === "negative") return row.resultado < 0;
      return true;
    });
}

function renderForecastTable() {
  const body = document.getElementById("finance-forecast-table-body");
  if (!body) return;
  renderCashFlowTable();
  const rows = filterForecastRows(getForecastRows());
  body.innerHTML = rows.length ? rows.map(row => `
    <tr><td><strong>${row.mes}</strong></td><td>${formatBRL(row.receitas)}</td><td>${formatBRL(row.despesas)}</td><td><span class="badge ${row.resultado >= 0 ? "badge-success" : "badge-danger"}">${formatBRL(row.resultado)}</span></td><td><strong>${formatBRL(row.saldo)}</strong></td><td><span class="badge badge-primary">${row.cenario}</span></td></tr>
  `).join("") : getFinanceEmptyRow(6, "Nenhuma projeção encontrada para os filtros atuais.");
  const select = document.getElementById("select-cenario");
  if (select && select.dataset.forecastBound !== "true") {
    select.dataset.forecastBound = "true";
    select.addEventListener("change", renderForecastTable);
  }
}

// 6. RECURSOS HUMANOS (RH) CONTROLLER
function initRH() {
  const colSelect = document.getElementById("folha-colaborador");
  const salarioInput = document.getElementById("folha-salario-base");
  const horasInput = document.getElementById("folha-horas-extras");
  const benefInput = document.getElementById("folha-beneficios");
  
  const reloadColaboradoresSelect = () => {
    if (colSelect) {
      colSelect.innerHTML = ERP_DATA.cadastro.colaboradores.map(c => `
        <option value="${c.id}">${c.nome}</option>
      `).join('');
    }
  };

  if (colSelect) {
    reloadColaboradoresSelect();

    const updateSalarioBase = () => {
      const selectedCol = ERP_DATA.cadastro.colaboradores.find(c => c.id === colSelect.value);
      if (selectedCol) {
        salarioInput.value = selectedCol.salario;
      }
      calculatePayroll();
    };

    colSelect.addEventListener("change", updateSalarioBase);
    updateSalarioBase();
  }

  function calculatePayroll() {
    const base = parseFloat(salarioInput.value) || 0;
    const extra = parseFloat(horasInput.value) || 0;
    const benef = parseFloat(benefInput.value) || 0;

    // Fast calculation: 11% INSS, 7.5% IRPF (simple model)
    const gross = base + extra;
    const taxes = gross * 0.185;
    const net = gross - taxes + benef;

    document.getElementById("folha-impostos").textContent = `- ${formatBRL(taxes)}`;
    document.getElementById("folha-liquido").textContent = formatBRL(net);

    return { gross, taxes, net };
  }

  if (horasInput && benefInput) {
    [horasInput, benefInput].forEach(inp => {
      inp.addEventListener("input", calculatePayroll);
    });
  }

  const form = document.getElementById("form-folha-rh");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const col = ERP_DATA.cadastro.colaboradores.find(c => c.id === colSelect.value);
      const results = calculatePayroll();

      alert(`Holerite gerado com sucesso para ${col.nome}! Líquido: ${formatBRL(results.net)}`);
      
      const tbody = document.getElementById("table-comprovantes-rh-body");
      if (tbody) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${col.nome}</strong></td>
          <td>${formatBRL(col.salario)}</td>
          <td><strong style="color: var(--color-success);">${formatBRL(results.net)}</strong></td>
          <td>06/2026</td>
          <td><span class="badge badge-success"><i data-lucide="printer"></i> PDF</span></td>
        `;
        tbody.prepend(tr);
        lucide.createIcons();
      }
      form.reset();
      calculatePayroll();
    });
  }

  // Contract form dynamic toggle logic
  const contractFormPanel = document.getElementById("panel-form-contrato");
  const btnNewContract = document.getElementById("btn-novo-contrato");
  const btnCancelContract = document.getElementById("btn-cancelar-contrato");
  
  if (btnNewContract && contractFormPanel) {
    btnNewContract.addEventListener("click", () => {
      contractFormPanel.classList.remove("hidden");
      contractFormPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (btnCancelContract && contractFormPanel) {
    btnCancelContract.addEventListener("click", () => {
      contractFormPanel.classList.add("hidden");
      document.getElementById("form-novo-contrato")?.reset();
    });
  }

  const contractTypeSelect = document.getElementById("contrato-tipo");
  if (contractTypeSelect) {
    contractTypeSelect.addEventListener("change", () => {
      const type = contractTypeSelect.value;
      const cltFields = document.querySelector(".clt-field");
      const meiFields = document.querySelector(".mei-field");
      const autonomoFields = document.querySelector(".autonomo-field");

      cltFields?.classList.add("hidden");
      meiFields?.classList.add("hidden");
      autonomoFields?.classList.add("hidden");

      if (type === "CLT") {
        cltFields?.classList.remove("hidden");
      } else if (type === "MEI") {
        meiFields?.classList.remove("hidden");
      } else if (type === "Autônomo") {
        autonomoFields?.classList.remove("hidden");
      }
    });
  }

  // Submit new contract
  const newContractForm = document.getElementById("form-novo-contrato");
  if (newContractForm) {
    newContractForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const colName = document.getElementById("contrato-colaborador").value.trim();
      const type = document.getElementById("contrato-tipo").value;
      const start = document.getElementById("contrato-inicio").value;
      const end = document.getElementById("contrato-termino").value;

      let baseSalary = 0;
      let cargo = "Prestador";

      if (type === "CLT") {
        baseSalary = parseFloat(document.getElementById("contrato-clt-salario").value) || 0;
        cargo = document.getElementById("contrato-clt-cargo").value || "Analista";
      } else if (type === "MEI") {
        baseSalary = parseFloat(document.getElementById("contrato-mei-valor").value) || 0;
        cargo = "Prestador MEI";
      } else if (type === "Autônomo") {
        baseSalary = parseFloat(document.getElementById("contrato-autonomo-valor").value) || 0;
        cargo = "Prestador Autônomo";
      }

      // 1. Save Contract
      const newContract = {
        id: `CT-${String(ERP_DATA.rh.contratosTrabalho.length + 1).padStart(3, '0')}`,
        colaborador: colName,
        tipo: type,
        inicio: start,
        termino: end,
        status: "Ativo"
      };
      ERP_DATA.rh.contratosTrabalho.unshift(newContract);

      // 2. Save Colaborador to Cadastro database (if not exists)
      const newCol = {
        id: `COL-${String(ERP_DATA.cadastro.colaboradores.length + 1).padStart(3, '0')}`,
        nome: colName,
        cargo: cargo,
        departamento: type === "CLT" ? "Operacional" : "Externo",
        salario: baseSalary,
        admissao: start,
        status: "Ativo"
      };
      ERP_DATA.cadastro.colaboradores.unshift(newCol);

      saveState();
      renderRHTables();
      renderCadastroTables();
      reloadColaboradoresSelect();
      
      newContractForm.reset();
      contractFormPanel.classList.add("hidden");
      alert(`Contrato ${newContract.id} criado com sucesso para ${colName}!`);
    });
  }

  renderRHTables();
}

function renderRHTables() {
  const contrBody = document.getElementById("table-rh-contratos-body");
  if (contrBody) {
    contrBody.innerHTML = ERP_DATA.rh.contratosTrabalho.map(ct => `
      <tr>
        <td><strong>${ct.id}</strong></td>
        <td>${ct.colaborador}</td>
        <td>${ct.tipo}</td>
        <td>${ct.inicio}</td>
        <td>${ct.termino}</td>
        <td><span class="badge badge-success">${ct.status}</span></td>
      </tr>
    `).join('');
  }
}

// 7. FROTA VEICULAR CONTROLLER
function initFrota() {
  bindFrotaLaunchers();
  refreshFrotaVehicleSelect();

  const form = document.getElementById("form-frota-abastecimento");
  if (form && form.dataset.bound !== "true") {
    form.dataset.bound = "true";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const selectVeiculo = document.getElementById("aba-veiculo");
      const veiculo = selectVeiculo?.value || ensureFrotaVehicle();
      if (!veiculo) return;
      const comb = document.getElementById("aba-combustivel").value;
      const litros = parseFloat(document.getElementById("aba-litros").value);
      const custo = parseFloat(document.getElementById("aba-custo").value);

      const newRefuel = {
        id: nextFrotaId("ABA", ERP_DATA.frota.abastecimentos),
        veiculo: veiculo,
        data: new Date().toISOString().split('T')[0],
        combustivel: comb,
        litros: litros,
        valorTotal: custo
      };

      ERP_DATA.frota.abastecimentos.unshift(newRefuel);
      saveState();
      renderFrotaTables();
      form.reset();
      alert("Abastecimento registrado!");
    });
  }

  renderFrotaTables();
}

function nextFrotaId(prefix, list) {
  const used = new Set(list.map(item => item.id));
  let counter = list.length + 1;
  let id = `${prefix}-${String(counter).padStart(3, "0")}`;
  while (used.has(id)) {
    counter += 1;
    id = `${prefix}-${String(counter).padStart(3, "0")}`;
  }
  return id;
}

function normalizePlate(value) {
  return String(value || "").trim().toUpperCase();
}

function refreshFrotaVehicleSelect(selectedPlate) {
  const selectVeiculo = document.getElementById("aba-veiculo");
  if (!selectVeiculo) return;
  selectVeiculo.innerHTML = ERP_DATA.cadastro.veiculos.length
    ? ERP_DATA.cadastro.veiculos.map(v => `<option value="${v.placa}">${v.marca} ${v.modelo} (${v.placa})</option>`).join('')
    : '<option value="">Cadastre um veículo primeiro</option>';
  if (selectedPlate) selectVeiculo.value = selectedPlate;
}

function ensureFrotaVehicle(defaultPlate) {
  const placa = normalizePlate(promptRequired("Placa do veículo:", defaultPlate || ERP_DATA.cadastro.veiculos[0]?.placa || ""));
  if (!placa) return "";
  let veiculo = ERP_DATA.cadastro.veiculos.find(v => normalizePlate(v.placa) === placa);
  if (!veiculo) {
    const marca = promptRequired("Marca:", "Marca") || "Marca";
    const modelo = promptRequired("Modelo:", "Modelo") || "Modelo";
    const ano = parseInt(promptRequired("Ano:", String(new Date().getFullYear())), 10) || new Date().getFullYear();
    veiculo = {
      id: nextFrotaId("VEI", ERP_DATA.cadastro.veiculos),
      placa,
      marca,
      modelo,
      ano,
      status: "Operacional",
      vencimentoLicenciamento: new Date().toISOString().split("T")[0]
    };
    ERP_DATA.cadastro.veiculos.unshift(veiculo);
  }
  refreshFrotaVehicleSelect(placa);
  return placa;
}

function bindFrotaLaunchers() {
  document.querySelectorAll("[data-frota-new]").forEach(btn => {
    if (btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";
    btn.addEventListener("click", () => createFrotaLancamento(btn.dataset.frotaNew));
  });
}
function promptRequired(label, fallback) {
  const value = prompt(label, fallback || "");
  return value === null ? "" : value.trim();
}
function createFrotaLancamento(kind) {
  if (kind === "documentacao") {
    const placa = ensureFrotaVehicle();
    if (!placa) return;
    const veiculo = ERP_DATA.cadastro.veiculos.find(v => normalizePlate(v.placa) === placa);
    const vencimento = promptRequired("Novo vencimento do licenciamento (AAAA-MM-DD):", new Date().toISOString().split("T")[0]);
    const status = promptRequired("Situação geral:", "Operacional") || "Operacional";
    if (veiculo) {
      veiculo.vencimentoLicenciamento = vencimento || veiculo.vencimentoLicenciamento;
      veiculo.status = status;
      saveState();
      refreshFrotaVehicleSelect(placa);
      renderCadastroTables();
      renderFrotaTables();
      alert("Lançamento de documentação registrado!");
    }
    return;
  }
  if (kind === "manutencao") {
    const veiculo = ensureFrotaVehicle();
    if (!veiculo) return;
    ERP_DATA.frota.manutencoes.unshift({ id: nextFrotaId("MAN", ERP_DATA.frota.manutencoes), veiculo, servico: promptRequired("Serviço realizado/agendado:", "Revisão preventiva") || "Revisão preventiva", oficina: promptRequired("Oficina:", "Oficina credenciada") || "Oficina credenciada", data: promptRequired("Data do serviço (AAAA-MM-DD):", new Date().toISOString().split("T")[0]) || new Date().toISOString().split("T")[0], custo: parseFloat(promptRequired("Custo (R$):", "0")) || 0, status: promptRequired("Status:", "Agendado") || "Agendado" });
  }
  if (kind === "abastecimento") { const form = document.getElementById("form-frota-abastecimento"); if (form) { form.scrollIntoView({ behavior: "smooth", block: "center" }); return; } }
  if (kind === "multa") {
    const veiculo = ensureFrotaVehicle();
    if (!veiculo) return;
    ERP_DATA.frota.multas.unshift({ id: nextFrotaId("MUL", ERP_DATA.frota.multas), veiculo, infracao: promptRequired("Infração:", "Infração de trânsito") || "Infração de trânsito", local: promptRequired("Localidade:", "Não informada") || "Não informada", data: promptRequired("Data (AAAA-MM-DD):", new Date().toISOString().split("T")[0]) || new Date().toISOString().split("T")[0], valor: parseFloat(promptRequired("Valor (R$):", "0")) || 0, status: promptRequired("Status de pagamento:", "Aguardando Pagamento") || "Aguardando Pagamento" });
  }
  saveState();
  refreshFrotaVehicleSelect();
  renderCadastroTables();
  renderFrotaTables();
  alert("Novo lançamento registrado!");
}
function renderFrotaTables() {
  const docBody = document.getElementById("table-frota-doc-body");
  if (docBody) {
    docBody.innerHTML = ERP_DATA.cadastro.veiculos.map(v => `
      <tr>
        <td><strong>${v.placa}</strong></td>
        <td>${v.marca} ${v.modelo}</td>
        <td>${formatDateBR(v.vencimentoLicenciamento)}</td>
        <td><span class="badge badge-success">Vendido / Vigente</span></td>
        <td><span class="badge badge-success">Pago</span></td>
        <td><span class="badge ${v.status === 'Operacional' ? 'badge-success' : 'badge-warning'}">${v.status}</span></td>
      </tr>
    `).join('');
  }

  const manBody = document.getElementById("table-frota-manutencao-body");
  if (manBody) {
    manBody.innerHTML = ERP_DATA.frota.manutencoes.map(m => `
      <tr>
        <td><strong>${m.id}</strong></td>
        <td>${m.veiculo}</td>
        <td>${m.servico}</td>
        <td>${m.oficina}</td>
        <td>${m.data}</td>
        <td>${formatBRL(m.custo)}</td>
        <td><span class="badge ${m.status === 'Concluído' ? 'badge-success' : 'badge-warning'}">${m.status}</span></td>
      </tr>
    `).join('');
  }

  const abaBody = document.getElementById("table-frota-abastecimentos-body");
  if (abaBody) {
    abaBody.innerHTML = ERP_DATA.frota.abastecimentos.map(ab => `
      <tr>
        <td><strong>${ab.veiculo}</strong></td>
        <td>${ab.data}</td>
        <td>${ab.combustivel}</td>
        <td>${ab.litros} L</td>
        <td>${formatBRL(ab.valorTotal)}</td>
      </tr>
    `).join('');
  }

  const mulBody = document.getElementById("table-frota-multas-body");
  if (mulBody) {
    mulBody.innerHTML = ERP_DATA.frota.multas.map(mu => `
      <tr>
        <td><strong>${mu.id}</strong></td>
        <td>${mu.veiculo}</td>
        <td>${mu.infracao}</td>
        <td>${mu.local}</td>
        <td>${mu.data}</td>
        <td>${formatBRL(mu.valor)}</td>
        <td><span class="badge badge-warning">${mu.status}</span></td>
      </tr>
    `).join('');
  }
}

// 8. ESTOQUE CONTROLLER
function initEstoque() {
  const movProdSelect = document.getElementById("mov-produto");
  if (movProdSelect) {
    movProdSelect.innerHTML = ERP_DATA.cadastro.produtos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  }

  const form = document.getElementById("form-estoque-mov");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const prodId = movProdSelect.value;
      const tipo = document.getElementById("mov-tipo").value;
      const qty = parseInt(document.getElementById("mov-quantidade").value);

      const targetProd = ERP_DATA.cadastro.produtos.find(p => p.id === prodId);
      if (targetProd) {
        if (tipo === 'entrada') {
          targetProd.estoqueAtual += qty;
        } else {
          if (targetProd.estoqueAtual < qty) {
            alert("Operação negada: Quantidade de saída excede estoque atual.");
            return;
          }
          targetProd.estoqueAtual -= qty;
        }
        saveState();
        renderEstoqueTables();
        renderCadastroTables(); // Sync with product list
        form.reset();
        alert("Estoque movimentado com sucesso!");
      }
    });
  }

  renderEstoqueTables();
}

function renderEstoqueTables() {
  const movBody = document.getElementById("table-estoque-mov-body");
  if (movBody) {
    movBody.innerHTML = ERP_DATA.cadastro.produtos.map(p => `
      <tr>
        <td><strong>${p.nome}</strong></td>
        <td>${p.categoria}</td>
        <td>${formatBRL(p.precoVenda)}</td>
        <td><strong style="color: ${p.estoqueAtual < 10 ? 'var(--color-danger)' : 'var(--text-primary)'}">${p.estoqueAtual} unid</strong></td>
        <td>${p.estoqueAtual < 10 ? `<span class="badge badge-danger">Crítico</span>` : `<span class="badge badge-success">Estável</span>`}</td>
      </tr>
    `).join('');
  }

  const custosBody = document.getElementById("table-estoque-custos-body");
  if (custosBody) {
    custosBody.innerHTML = ERP_DATA.cadastro.produtos.map(p => {
      const margin = p.precoVenda - p.custoMedio;
      const marginPerc = ((margin / p.precoVenda) * 100).toFixed(1);
      const totalValuation = p.estoqueAtual * p.custoMedio;
      return `
        <tr>
          <td><strong>${p.nome}</strong></td>
          <td>${formatBRL(p.precoVenda)}</td>
          <td>${formatBRL(p.custoMedio)}</td>
          <td style="color: var(--color-success); font-weight: 700;">+ ${formatBRL(margin)}</td>
          <td>${marginPerc}%</td>
          <td>${formatBRL(totalValuation)}</td>
        </tr>
      `;
    }).join('');
  }

  const valList = document.getElementById("estoque-validades-list");
  if (valList) {
    const expiredList = ERP_DATA.cadastro.produtos.filter(p => p.validade);
    valList.innerHTML = expiredList.map(p => `
      <div class="expiry-alert-item">
        <div>
          <strong>${p.nome}</strong> - Categoria: ${p.categoria}
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Estoque: ${p.estoqueAtual} unidades</div>
        </div>
        <div style="text-align: right;">
          <span class="badge badge-danger" style="margin-bottom: 0.25rem;">Vencimento: ${formatDateBR(p.validade)}</span>
          <div style="font-size: 0.75rem; color: var(--color-danger); font-weight: bold;">Lote sob observação</div>
        </div>
      </div>
    `).join('');
  }
}

// 9. ADMINISTRATIVO CONTROLLER
function initAdministrativo() {
  const uploadBtn = document.getElementById("btn-novo-doc");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      const name = prompt("Nome do Documento / Certidão:");
      if (!name) return;
      const category = prompt("Categoria (Alvarás, Certidões, Contratos, Fiscais):") || "Diversos";

      const newDoc = {
        id: `DOC-00${ERP_DATA.administrativo.documentos.length + 1}`,
        nome: name,
        categoria: category,
        emissao: new Date().toISOString().split('T')[0],
        vencimento: "2027-06-30",
        status: "Válido"
      };

      ERP_DATA.administrativo.documentos.push(newDoc);
      saveState();
      renderAdministrativoDocs();
      renderConsolidadoGeral();
    });
  }

  const pdfBtn = document.getElementById("btn-export-pdf");
  if (pdfBtn && pdfBtn.dataset.bound !== "true") {
    pdfBtn.dataset.bound = "true";
    pdfBtn.addEventListener("click", generateConsolidadoPdf);
  }

  renderAdministrativoDocs();
  renderConsolidadoGeral();
}

function generateConsolidadoPdf() {
  const faturamentoTotal = ERP_DATA.fiscal.notasEmitidas.reduce((sum, nf) => sum + (nf.valor || 0), 0);
  const despesaTotal = ERP_DATA.financeiro.contasPagar.reduce((sum, cp) => sum + (cp.valor || 0), 0);
  const totalVeiculos = ERP_DATA.cadastro.veiculos.length;
  const veiculosOperacionais = ERP_DATA.cadastro.veiculos.filter(v => v.status === 'Operacional').length;
  const frotaPercent = totalVeiculos > 0 ? Math.round((veiculosOperacionais / totalVeiculos) * 100) : 0;
  const estoqueImobilizado = ERP_DATA.cadastro.produtos.reduce((sum, p) => sum + ((p.estoqueAtual || 0) * (p.custoMedio || 0)), 0);
  const documentosVencidos = ERP_DATA.administrativo.documentos.filter(d => new Date(d.vencimento) < new Date()).length;
  const proximosVencimentos = ERP_DATA.administrativo.documentos.filter(d => {
    const diff = Math.ceil((new Date(d.vencimento) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 60;
  }).length;
  const rows = [
    ["Desempenho Comercial", formatBRL(faturamentoTotal), "Notas fiscais emitidas"],
    ["Despesa Corrente Operacional", formatBRL(despesaTotal), "Contas a pagar registradas"],
    ["Frota Status", `${frotaPercent}% operacionais`, `${veiculosOperacionais}/${totalVeiculos} veículos operacionais`],
    ["Estoque Global", formatBRL(estoqueImobilizado), "Valor imobilizado em insumos"],
    ["Documentos vencidos", String(documentosVencidos), "Pendências administrativas"],
    ["Próximos vencimentos", String(proximosVencimentos), "Documentos vencendo em até 60 dias"]
  ].map(row => `<tr><td>${escapeHtml(row[0])}</td><td><strong>${escapeHtml(row[1])}</strong></td><td>${escapeHtml(row[2])}</td></tr>`).join("");
  const contentHtml = `
    <header>
      <div><h1>Relatório Consolidado Geral</h1><div class="muted">Emitido em ${new Date().toLocaleString("pt-BR")}</div></div>
      <strong>APP ADM</strong>
    </header>
    <section class="box">
      <table>
        <thead><tr><th>Indicador</th><th>Resultado</th><th>Observação</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
  const branded = wrapPdfWithBranding(contentHtml, "body{font-family:Arial,sans-serif;color:#111827;margin:32px}header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:18px}h1{font-size:24px;margin:0}.muted{color:#64748b;font-size:12px}.box{border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f3f4f6;text-align:left;text-transform:uppercase;font-size:11px}th,td{border-bottom:1px solid #e5e7eb;padding:10px;vertical-align:top}@page{size:A4;margin:14mm}@media print{body{margin:0}}");
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Consolidado Geral</title><style>${branded.styles}</style></head><body class="${branded.bodyClass}">${branded.body}</body></html>`;
  printHtmlDocument(html, "consolidado-pdf-frame", "Relatório Consolidado Geral");
}

function renderConsolidadoGeral() {
  const valoresEl = document.getElementById('consolidado-valores-dinamicos');
  const confEl = document.getElementById('consolidado-conformidade-dinamico');
  if (!valoresEl || !confEl) return;

  // 1. Calculate dynamic values from ERP_DATA
  const faturamentoTotal = ERP_DATA.fiscal.notasEmitidas.reduce((sum, nf) => sum + (nf.valor || 0), 0);
  const despesaTotal = ERP_DATA.financeiro.contasPagar.reduce((sum, cp) => sum + (cp.valor || 0), 0);
  
  const totalVeiculos = ERP_DATA.cadastro.veiculos.length;
  const veiculosOperacionais = ERP_DATA.cadastro.veiculos.filter(v => v.status === 'Operacional').length;
  const frotaPercent = totalVeiculos > 0 ? Math.round((veiculosOperacionais / totalVeiculos) * 100) : 0;
  
  const estoqueImobilizado = ERP_DATA.cadastro.produtos.reduce((sum, p) => sum + ((p.estoqueAtual || 0) * (p.custoMedio || 0)), 0);

  valoresEl.innerHTML = `
    <div>
      <strong>Desempenho Comercial:</strong> ${formatBRL(faturamentoTotal)} faturados
    </div>
    <div>
      <strong>Despesa Corrente Operacional:</strong> ${formatBRL(despesaTotal)}
    </div>
    <div>
      <strong>Frota Status:</strong> ${totalVeiculos > 0 ? `${frotaPercent}% dos veículos operacionais` : 'Sem veículos cadastrados'}
    </div>
    <div>
      <strong>Estoque Global:</strong> ${formatBRL(estoqueImobilizado)} imobilizados em insumos
    </div>
  `;

  // 2. Generate Compliance list
  const hasLicencaAmbiental = ERP_DATA.administrativo.documentos.some(d => d.nome.toLowerCase().includes('ambiental'));
  
  let confHtml = `
    <li style="display: flex; gap: 0.5rem; align-items: center; color: var(--color-success);">
      <i data-lucide="check-circle-2"></i> Certidões Federais atualizadas
    </li>
    <li style="display: flex; gap: 0.5rem; align-items: center; color: var(--color-success);">
      <i data-lucide="check-circle-2"></i> Encargos trabalhistas recolhidos
    </li>
  `;

  if (hasLicencaAmbiental) {
    confHtml += `
      <li style="display: flex; gap: 0.5rem; align-items: center; color: var(--color-success);">
        <i data-lucide="check-circle-2"></i> Licença Ambiental em conformidade
      </li>
    `;
  } else {
    confHtml += `
      <li style="display: flex; gap: 0.5rem; align-items: center; color: var(--text-muted);">
        <i data-lucide="minus"></i> Nenhuma licença ambiental pendente
      </li>
    `;
  }

  confEl.innerHTML = confHtml;
  lucide.createIcons();
}

function renderAdministrativoDocs() {
  const grid = document.getElementById("adm-docs-grid");
  if (grid) {
    grid.innerHTML = ERP_DATA.administrativo.documentos.map(doc => `
      <div class="doc-card">
        <div class="doc-icon"><i data-lucide="file-check"></i></div>
        <div>
          <h4 style="font-size: 0.9rem; font-weight: 800; margin-bottom: 0.2rem;">${doc.nome}</h4>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${doc.categoria}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
          <span>Vencimento:</span>
          <strong>${formatDateBR(doc.vencimento)}</strong>
        </div>
        <span class="badge ${doc.status === 'Válido' ? 'badge-success' : 'badge-warning'}" style="align-self: flex-start; margin-top: 0.25rem;">${doc.status}</span>
      </div>
    `).join('');
    lucide.createIcons();
  }
}


// 10. RELATÓRIOS CONTROLLER
function initRelatorios() {
  const btn = document.getElementById("btn-atualizar-relatorios");
  if (btn && btn.dataset.bound !== "true") { btn.dataset.bound = "true"; btn.addEventListener("click", renderRelatorios); }
  renderRelatorios();
}
function sumBy(list, key) { return (list || []).reduce((sum, item) => sum + (Number(item[key]) || 0), 0); }
function renderRelatorios() {
  const kpis = document.getElementById("relatorios-kpis");
  const table = document.getElementById("relatorios-table-body");
  const details = document.getElementById("relatorios-detalhes");
  if (!kpis || !table || !details || !ERP_DATA) return;
  const receitaComercial = sumBy(ERP_DATA.comercial.orcamentos, "total") + sumBy(ERP_DATA.comercial.pedidos, "total");
  const receber = sumBy(ERP_DATA.financeiro.contasReceber, "valor");
  const pagar = sumBy(ERP_DATA.financeiro.contasPagar, "valor");
  const estoque = ERP_DATA.cadastro.produtos.reduce((sum, p) => sum + ((p.estoqueAtual || 0) * (p.custoMedio || 0)), 0);
  const frotaCusto = sumBy(ERP_DATA.frota.manutencoes, "custo") + sumBy(ERP_DATA.frota.abastecimentos, "valorTotal") + sumBy(ERP_DATA.frota.multas, "valor");
  kpis.innerHTML = [["Comercial", ERP_DATA.comercial.contratos.length + " contratos", formatBRL(receitaComercial)], ["Financeiro", ERP_DATA.financeiro.contasReceber.length + " a receber", formatBRL(receber - pagar)], ["Cadastros", ERP_DATA.cadastro.clientes.length + " clientes", ERP_DATA.cadastro.produtos.length + " itens"], ["Frota", ERP_DATA.cadastro.veiculos.length + " veículos", formatBRL(frotaCusto)], ["Documentos", ERP_DATA.administrativo.documentos.length + " arquivos", ERP_DATA.fiscal.notasEmitidas.length + " notas"], ["Estoque", ERP_DATA.cadastro.produtos.length + " produtos/serviços", formatBRL(estoque)]].map(item => `<div class="report-kpi"><span>${item[0]}</span><strong>${item[1]}</strong><em>${item[2]}</em></div>`).join("");
  const rows = [["Comercial", "Orçamentos", ERP_DATA.comercial.orcamentos.length, formatBRL(sumBy(ERP_DATA.comercial.orcamentos, "total"))], ["Comercial", "Pedidos", ERP_DATA.comercial.pedidos.length, formatBRL(sumBy(ERP_DATA.comercial.pedidos, "total"))], ["Comercial", "Contratos", ERP_DATA.comercial.contratos.length, formatBRL(sumBy(ERP_DATA.comercial.contratos, "valorMensal")) + " / mês"], ["Base de Cadastro", "Clientes", ERP_DATA.cadastro.clientes.length, formatBRL(sumBy(ERP_DATA.cadastro.clientes, "totalComprado"))], ["Base de Cadastro", "Fornecedores", ERP_DATA.cadastro.fornecedores.length, "Credenciados"], ["Base de Cadastro", "Colaboradores", ERP_DATA.cadastro.colaboradores.length, formatBRL(sumBy(ERP_DATA.cadastro.colaboradores, "salario")) + " folha base"], ["Fiscal", "Notas emitidas", ERP_DATA.fiscal.notasEmitidas.length, formatBRL(sumBy(ERP_DATA.fiscal.notasEmitidas, "valor"))], ["Financeiro", "Contas a receber", ERP_DATA.financeiro.contasReceber.length, formatBRL(receber)], ["Financeiro", "Contas a pagar", ERP_DATA.financeiro.contasPagar.length, formatBRL(pagar)], ["Frota", "Veículos", ERP_DATA.cadastro.veiculos.length, ERP_DATA.cadastro.veiculos.filter(v => v.status === "Operacional").length + " operacionais"], ["Estoque", "Valor em estoque", ERP_DATA.cadastro.produtos.length, formatBRL(estoque)], ["Administrativo", "Documentos", ERP_DATA.administrativo.documentos.length, ERP_DATA.administrativo.documentos.filter(d => d.status === "Válido").length + " válidos"]];
  table.innerHTML = rows.map(row => `<tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td></tr>`).join("");
  const detailGroups = [["Contratos", ERP_DATA.comercial.contratos.map(c => `${c.id} - ${c.titulo} - ${c.parceiro} - ${formatBRL(c.valorMensal)}`)], ["Produtos e Serviços", ERP_DATA.cadastro.produtos.map(p => `${p.id} - ${p.nome} - ${p.categoria} - ${formatBRL(p.precoVenda)}`)], ["Financeiro", [...ERP_DATA.financeiro.contasReceber.map(r => `${r.id} - Receber - ${r.cliente} - ${formatBRL(r.valor)}`), ...ERP_DATA.financeiro.contasPagar.map(p => `${p.id} - Pagar - ${p.fornecedor} - ${formatBRL(p.valor)}`)]], ["Frota", [...ERP_DATA.frota.manutencoes.map(m => `${m.id} - ${m.veiculo} - ${m.servico}`), ...ERP_DATA.frota.multas.map(m => `${m.id} - ${m.veiculo} - ${m.infracao}`)]], ["Documentos e Fiscal", [...ERP_DATA.administrativo.documentos.map(d => `${d.id} - ${d.nome} - ${d.status}`), ...ERP_DATA.fiscal.notasEmitidas.map(n => `${n.id} - ${n.destinatario} - ${formatBRL(n.valor)}`)]]];
  details.innerHTML = detailGroups.map(group => `<section class="report-section"><h4>${group[0]}</h4>${group[1].length ? `<ul>${group[1].map(item => `<li>${item}</li>`).join("")}</ul>` : `<p>Nenhuma informação cadastrada.</p>`}</section>`).join("");
  lucide.createIcons();
}
// ============================================================
// MODAL MODULE
// ============================================================
function initModal() {
  const overlay = document.getElementById('modal-financeiro');
  const closeBtn = document.getElementById('btn-close-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

function openModal(title, bodyHtml) {
  const overlay = document.getElementById('modal-financeiro');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body-content');
  if (!overlay || !titleEl || !bodyEl) return;
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  overlay.classList.remove('hidden');
  lucide.createIcons();
}

function closeModal() {
  const overlay = document.getElementById('modal-financeiro');
  if (overlay) overlay.classList.add('hidden');
}

// ============================================================
// EMPRESAS & USUÁRIOS MODULE
// ============================================================
function initEmpresasUsuarios() {
  const formEmpresa = document.getElementById('form-cadastro-empresa');
  const formUsuario = document.getElementById('form-cadastro-usuario');

  // Pre-fill forms with active company details
  const comp = getActiveCompany();
  if (comp) {
    const nomeEl = document.getElementById('empresa-nome');
    const cnpjEl = document.getElementById('empresa-cnpj');
    const pixEl = document.getElementById('empresa-pix');
    if (nomeEl) nomeEl.value = comp.razaoSocial || '';
    if (cnpjEl) cnpjEl.value = comp.cnpj || '';
    if (pixEl) pixEl.value = comp.pixKey || '';

    // Bind values to readonly UI inputs
    const userReadonly = document.getElementById('usuario-empresa-readonly');
    const userSelectVal = document.getElementById('usuario-empresa-select');
    if (userReadonly) userReadonly.value = `${comp.razaoSocial} (${comp.cnpj})`;
    if (userSelectVal) userSelectVal.value = comp.cnpj;
  }

  if (formEmpresa) {
    formEmpresa.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('empresa-nome').value.trim();
      const pix = document.getElementById('empresa-pix').value.trim();

      const currentComp = getActiveCompany();
      if (currentComp) {
        currentComp.razaoSocial = nome;
        currentComp.pixKey = pix;
        saveState();
        renderEmpresasUsuariosTable();
        initSidebarSession(); // Refresh profile name
        alert('Cadastro da empresa atualizado com sucesso!');
      }
    });
  }

  if (formUsuario) {
    formUsuario.addEventListener('submit', (e) => {
      e.preventDefault();
      const cnpj = document.getElementById('usuario-empresa-select').value;
      const username = document.getElementById('usuario-nome').value.trim();
      const password = document.getElementById('usuario-senha').value.trim();

      if (password.length !== 6 || !/^\d{6}$/.test(password)) {
        alert('A senha deve conter exatamente 6 dígitos numéricos!');
        return;
      }
      if (GLOBAL_STATE.users.find(u => u.username === username && u.cnpj === cnpj)) {
        alert('Usuário "' + username + '" já existe para esta empresa!');
        return;
      }

      GLOBAL_STATE.users.push({ username, password, cnpj });
      saveState();
      formUsuario.reset();
      
      // Keep hidden input populated
      const currentComp = getActiveCompany();
      if (currentComp) {
        document.getElementById('usuario-empresa-select').value = currentComp.cnpj;
      }

      renderEmpresasUsuariosTable();
      alert('Usuário "' + username + '" criado com sucesso!\nCNPJ: ' + cnpj + '\nSenha: ●●●●●●');
    });
  }
}

function renderEmpresasUsuariosTable() {
  const body = document.getElementById('table-empresas-usuarios-body');
  if (!body) return;

  // Filter to show ONLY the logged-in company details and its users
  const comp = getActiveCompany();
  if (!comp) {
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Nenhuma empresa ativa na sessão.</td></tr>';
    return;
  }

  const users = GLOBAL_STATE.users.filter(u => u.cnpj === comp.cnpj);
  const userList = users.length
    ? users.map(u => `<span class="badge badge-primary" style="margin-right:0.25rem;">${u.username}</span>`).join('')
    : '<span style="color:var(--text-muted);font-size:0.8rem;">Nenhum usuário cadastrado</span>';

  body.innerHTML = `<tr>
    <td><strong>${comp.razaoSocial}</strong></td>
    <td><code style="font-size:0.8rem;">${comp.cnpj}</code></td>
    <td><code style="font-size:0.8rem;color:var(--color-secondary);">${comp.pixKey || 'Não configurada'}</code></td>
    <td>${userList}</td>
  </tr>`;
  
  lucide.createIcons();
}








