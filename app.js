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
  initModal();
  lucide.createIcons();

  // Custom Global Search
  const searchInput = document.getElementById("global-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const val = e.target.value.toLowerCase();
      console.log("Global search: ", val);
    });
  }
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

// Router logic (SPA View switcher)
function initRouter() {
  const navItems = document.querySelectorAll(".nav-item");
  const viewContents = document.querySelectorAll(".view-content");
  const titleEl = document.getElementById("current-view-title");
  const subtitleEl = document.getElementById("current-view-subtitle");

  const viewInfo = {
    dashboard: { title: "Dashboard Geral", sub: "Painel administrativo de controle de operações integradas" },
    comercial: { title: "Gestão Comercial", sub: "Propostas comerciais, pedidos ativos e contratos ativos" },
    cadastro: { title: "Base de Cadastros", sub: "Controle central de clientes, fornecedores, pessoal, frotas e itens de portfólio" },
    fiscal: { title: "Faturamento & Fiscal", sub: "Emissão de notas fiscais oficiais de produtos/serviços e relatórios de contabilidade" },
    financeiro: { title: "Painel Financeiro", sub: "Fluxo de caixa, relatórios de previsões financeiras e contas a pagar/receber" },
    rh: { title: "Recursos Humanos (RH)", sub: "Quadros funcionais, contratos corporativos e emissão de holerites" },
    frota: { title: "Gestão de Frotas", sub: "Controle de despesas, manutenção, documentações obrigatórias e consumo" },
    estoque: { title: "Estoque & Logística", sub: "Balanço físico, custos e prazos de validade de insumos" },
    administrativo: { title: "Área Administrativa", sub: "Arquivos corporativos, alvarás reguladores e relatórios consolidados" }
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
        renderCashFlowChart();
        renderDashboardNotifications();
      } else if (viewId === 'financeiro') {
        renderForecastChart();
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
  renderCashFlowChart();
  renderDashboardNotifications();
  updateDashboardKPIs();
}

function updateDashboardKPIs() {
  // Update dashboard KPI numbers dynamically based on actual state
  const totalReceitas = ERP_DATA.financeiro.fluxoCaixa.saldoAtual;
  const activeOrdersCount = ERP_DATA.comercial.pedidos.filter(p => p.status !== "Entregue").length;
  const vehiclesActiveCount = ERP_DATA.cadastro.veiculos.length;

  // Calculate alerts dynamically
  let alertCount = 0;
  const today = new Date();
  
  // Expiry alerts for products
  ERP_DATA.cadastro.produtos.forEach(p => {
    if (p.validade) {
      const expDate = new Date(p.validade);
      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) alertCount++;
    }
  });

  // Expiry alerts for official documents
  ERP_DATA.administrativo.documentos.forEach(d => {
    if (d.vencimento) {
      const expDate = new Date(d.vencimento);
      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) alertCount++;
    }
  });

  const kpiReceita = document.getElementById("kpi-receita");
  const kpiVendas = document.getElementById("kpi-vendas");
  const kpiFrota = document.getElementById("kpi-frota");
  const kpiAlertas = document.getElementById("kpi-alertas");

  if (kpiReceita) kpiReceita.textContent = formatBRL(totalReceitas);
  if (kpiVendas) kpiVendas.textContent = `${activeOrdersCount} Pedidos`;
  if (kpiFrota) kpiFrota.textContent = `${vehiclesActiveCount} Veículos`;
  if (kpiAlertas) kpiAlertas.textContent = `${alertCount} Pendentes`;
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
  const totalLabel = kind === "orcamento" ? "VALOR FINAL" : "TOTAL DO PEDIDO";
  const buttonLabel = kind === "orcamento" ? "Salvar Orçamento" : "Salvar Pedido";
  const icon = kind === "orcamento" ? "check-circle" : "shopping-bag";
  return clientFields +
    "<div class='line-item-box'><div class='line-item-title'>Produtos e serviços</div><div class='line-item-entry'>" +
    "<div class='form-group'><label>Tipo</label><select class='form-select' id='" + prefix + "-item-tipo'><option value='Produto'>Produto</option><option value='Serviço'>Serviço</option></select></div>" +
    "<div class='form-group line-item-grow'><label>Produto/Serviço</label><select class='form-select' id='" + prefix + "-item-produto'></select></div>" +
    "<div class='form-group'><label>Quantidade</label><input type='number' class='form-input' id='" + prefix + "-item-quantidade' min='0.01' step='0.01' value='1'></div>" +
    "<div class='form-group'><label>Valor Unitário</label><input type='number' class='form-input' id='" + prefix + "-item-valor' min='0' step='0.01' value='0'></div>" +
    "<button type='button' class='btn btn-secondary line-item-add' id='btn-add-" + prefix + "-item' title='Adicionar item'><i data-lucide='plus'></i></button></div>" +
    "<div class='table-wrapper line-items-table'><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th><th></th></tr></thead><tbody id='" + prefix + "-itens-body'></tbody></table></div></div>" +
    "<div class='commercial-summary'><div class='commercial-total'><span>" + totalLabel + "</span><strong id='" + prefix + "-resultado-val'>R$ 0,00</strong></div><button type='submit' class='btn btn-primary'><i data-lucide='" + icon + "'></i> " + buttonLabel + "</button></div>";
}

function populateClientSelectors() {
  const options = ERP_DATA.cadastro.clientes.map(function(c) { return "<option value='" + c.nome + "'>" + c.nome + "</option>"; }).join("");
  ["orc-cliente", "ped-cliente", "fiscal-destinatario"].forEach(function(id) {
    const select = document.getElementById(id);
    if (!select) return;
    const placeholder = id === "fiscal-destinatario" ? "" : "<option value=''>Selecione o Cliente</option>";
    select.innerHTML = placeholder + options;
  });
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
      return "<tr><td><strong>" + con.titulo + "</strong></td><td>" + con.tipo + "</td><td>" + con.parceiro + "</td><td>" + formatDateBR(con.vigenciaInicio) + "</td><td>" + formatDateBR(con.vigenciaFim) + "</td><td>" + formatBRL(con.valorMensal) + "</td><td><span class='badge badge-success'><i data-lucide='check'></i> Digital</span></td><td><span class='badge " + badge + "'>" + con.status + "</span></td><td><button class='btn btn-primary' style='font-size:0.78rem;padding:0.3rem 0.75rem;' onclick=\"faturarContrato('" + con.id + "')\" title='Gerar fatura deste contrato'><i data-lucide='receipt-text'></i> Faturar</button></td></tr>";
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
  const primaryAction = kind === "orcamento" ? "generate-order" : "generate-invoice";
  const primaryTitle = kind === "orcamento" ? "Gerar pedido" : "Gerar nota fiscal";
  const primaryIcon = kind === "orcamento" ? "shopping-bag" : "receipt-text";
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
  if (action === "generate-invoice") generateInvoiceFromOrder(id);
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
  const newPed = {
    id: nextCommercialUpgradeId("PED", ERP_DATA.comercial.pedidos),
    cliente: orc.cliente,
    data: new Date().toISOString().split("T")[0],
    itens: cloneCommercialItems(normalizeCommercialUpgradeItems(orc, "Orçamento")),
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
  alert("Pedido " + newPed.id + " gerado a partir do orçamento " + orc.id + ".");
}

function generateInvoiceFromOrder(id) {
  const ped = getCommercialRecord("pedido", id);
  if (!ped) return;
  const nf = {
    id: "NF-" + String(1026 + ERP_DATA.fiscal.notasEmitidas.length).padStart(4, "0"),
    destinatario: ped.cliente,
    tipo: "NFe",
    valor: ped.total,
    emissao: new Date().toISOString(),
    status: "Autorizada (SEFAZ)",
    xmlFile: "NFe" + Date.now() + ".xml",
    origem: ped.id
  };
  ERP_DATA.fiscal.notasEmitidas.unshift(nf);
  ped.status = "Preparando";
  saveState();
  renderComercialTables();
  renderFiscalData();
  alert("Nota fiscal " + nf.id + " gerada para o pedido " + ped.id + ".");
}

function futureDateIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
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
  const taxLine = "";
  const html = "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>" + title + " " + record.id + "</title><style>body{font-family:Arial,sans-serif;color:#111827;margin:40px}header{border-bottom:2px solid #4f46e5;padding-bottom:18px;margin-bottom:24px;display:flex;justify-content:space-between;gap:24px}h1{margin:0;font-size:26px}.muted{color:#6b7280;font-size:13px}.box{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f3f4f6;text-align:left;font-size:12px;text-transform:uppercase}th,td{border-bottom:1px solid #e5e7eb;padding:10px}.totals{margin-left:auto;width:320px}.total-line{display:flex;justify-content:space-between;padding:8px 0}.grand{font-size:20px;font-weight:800;border-top:2px solid #111827;margin-top:8px;padding-top:12px}@page{size:A4;margin:14mm}@media print{body{margin:0}}</style></head><body><header><div><h1>" + title + "</h1><div class='muted'>APP ADM - Sistema Integrado de Gestão ERP</div></div><div><strong>" + record.id + "</strong><br><span class='muted'>Emissão: " + new Date().toLocaleDateString("pt-BR") + "</span></div></header><section class='box grid'><div><span class='muted'>Cliente</span><br><strong>" + record.cliente + "</strong></div><div><span class='muted'>Data do registro</span><br><strong>" + record.data + "</strong></div><div><span class='muted'>Status</span><br><strong>" + record.status + "</strong></div>" + extraHtml + "</section><section class='box'><strong>Produtos e serviços</strong><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>" + rows + "</tbody></table></section><section class='totals'><div class='total-line'><span>Subtotal</span><strong>" + formatBRL(subtotal) + "</strong></div>" + taxLine + "<div class='total-line grand'><span>Total</span><strong>" + formatBRL(record.total) + "</strong></div></section></body></html>";
  const oldFrame = document.getElementById("commercial-pdf-frame");
  if (oldFrame) oldFrame.remove();
  const frame = document.createElement("iframe");
  frame.id = "commercial-pdf-frame";
  frame.title = title + " " + record.id;
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
  frame.onload = function() {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  };
  setTimeout(function() {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }, 250);
}

window.generateCommercialPdf = generateCommercialPdf;

// ============================================================
// CONTRACTS COMMERCIAL MODULE (Novo Contrato Comercial)
// ============================================================
function initContratosComerciais() {
  const btnNovo = document.getElementById('btn-novo-contrato-comercial');
  const panel = document.getElementById('panel-form-contrato-comercial');
  const btnCancelar = document.getElementById('btn-cancelar-contrato-c');
  const form = document.getElementById('form-novo-contrato-comercial');
  const parceiroSelect = document.getElementById('contrato-c-parceiro');
  const inicioInput = document.getElementById('contrato-c-inicio');

  if (parceiroSelect) {
    const allParceiros = [
      ...ERP_DATA.cadastro.clientes.map(c => ({ nome: c.nome, tipo: 'Cliente' })),
      ...ERP_DATA.cadastro.fornecedores.map(f => ({ nome: f.nome, tipo: 'Fornecedor' }))
    ];
    parceiroSelect.innerHTML = allParceiros.map(p => `<option value="${p.nome}">${p.nome} (${p.tipo})</option>`).join('');
  }

  if (btnNovo && panel) {
    btnNovo.addEventListener('click', () => {
      if (inicioInput && !inicioInput.value) inicioInput.value = new Date().toISOString().split('T')[0];
      panel.classList.remove('hidden');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (btnCancelar && panel) {
    btnCancelar.addEventListener('click', () => {
      panel.classList.add('hidden');
      form?.reset();
    });
  }
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const newContract = {
        id: 'CON-' + String(ERP_DATA.comercial.contratos.length + 1).padStart(3, '0'),
        titulo: document.getElementById('contrato-c-titulo').value.trim(),
        tipo: document.getElementById('contrato-c-tipo').value,
        parceiro: document.getElementById('contrato-c-parceiro').value,
        vigenciaInicio: document.getElementById('contrato-c-inicio').value,
        vigenciaFim: document.getElementById('contrato-c-fim').value,
        valorMensal: parseFloat(document.getElementById('contrato-c-valor').value) || 0,
        status: 'Ativo'
      };
      ERP_DATA.comercial.contratos.unshift(newContract);
      saveState();
      panel.classList.add('hidden');
      form.reset();
      renderComercialTables();
      alert('Contrato ' + newContract.id + ' criado com sucesso!');
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
      { key: "cnpj", label: "CNPJ", required: true },
      { key: "email", label: "Email", required: true },
      { key: "telefone", label: "Telefone", required: true },
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
      { key: "cnpj", label: "CNPJ", required: true },
      { key: "contato", label: "Contato", required: true },
      { key: "telefone", label: "Telefone", required: true },
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
    return `<div class="form-group"><label>${field.label}</label><input type="${type}" class="form-input" id="${kind}-${field.key}"${value}${required}${step}></div>`;
  }).join("");
  return `<form id="form-${kind}" class="cadastro-form hidden"><div class="form-row">${fields}</div><div class="product-form-actions"><button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Salvar ${config.title}</button><button type="button" class="btn btn-secondary" data-cadastro-cancel="${kind}"><i data-lucide="x"></i> Cancelar</button></div></form>`;
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
  if (kind === "clientes") populateClientSelectors();
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
    grid.parentNode.insertBefore(form, grid);
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
    prodGrid.innerHTML = ERP_DATA.cadastro.produtos.map(p =>
      '<div class="product-list-row">' +
        '<div><strong>' + p.nome + '</strong><span>' + (p.tipo || 'Produto') + ' • ' + p.categoria + '</span></div>' +
        '<div><span>Preço</span><strong>' + formatBRL(p.precoVenda) + '</strong></div>' +
        '<div><span>Estoque</span><strong>' + ((p.tipo === 'Serviço') ? 'Não se aplica' : (p.estoqueAtual + ' unid')) + '</strong></div>' +
          '<div><span>Validade</span><strong>' + ((p.tipo === 'Serviço') ? 'Não se aplica' : (p.validade ? formatDateBR(p.validade) : 'Sem validade')) + '</strong></div>' +
        '<button type="button" class="btn btn-secondary btn-icon-only" data-product-action="edit" data-id="' + p.id + '" title="Editar cadastro"><i data-lucide="pencil"></i></button>' +
      '</div>'
    ).join('');
    lucide.createIcons();
  }
}

// 4. FISCAL CONTROLLER
function initFiscal() {
  const form = document.getElementById("form-emissao-fiscal");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const tipo = document.getElementById("fiscal-tipo").value;
      const dest = document.getElementById("fiscal-destinatario").value;
      const val = parseFloat(document.getElementById("fiscal-valor").value);

      const submitBtn = form.querySelector("button[type='submit']");
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;

      let message = "Registrando simulação fiscal...";
      if (tipo === "NFs") {
        message = "Registrando simulação NFS-e...";
      } else if (tipo === "NFe") {
        message = "Registrando simulação NF-e...";
      }

      submitBtn.innerHTML = `<i data-lucide="refresh-cw" class="animate-spin" style="width: 16px; height: 16px; display: inline-block;"></i> ${message}`;
      lucide.createIcons();

      setTimeout(() => {
        const newNF = {
          id: `NF-${1026 + ERP_DATA.fiscal.notasEmitidas.length}`,
          destinatario: dest,
          tipo: tipo,
          valor: val,
          emissao: new Date().toISOString(),
          status: "Simulada (integração pendente)",
          xmlFile: `NF352606${Math.floor(1000000000 + Math.random() * 9000000000)}.xml`
        };

        ERP_DATA.fiscal.notasEmitidas.unshift(newNF);
        saveState();
        renderFiscalData();
        form.reset();

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        lucide.createIcons();

        alert(`Pré-registro fiscal ${newNF.id} salvo com sucesso.\n\nA autorização oficial será liberada quando a integração fiscal estiver configurada.`);
      }, 1500);
    });
  }

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
    body.innerHTML = ERP_DATA.fiscal.notasEmitidas.map(nf => `
      <tr>
        <td><strong>${nf.id}</strong></td>
        <td>${nf.destinatario}</td>
        <td>${nf.tipo}</td>
        <td>${formatBRL(nf.valor)}</td>
        <td><span class="badge badge-success"><i data-lucide="shield-check"></i> ${nf.status}</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-icon-only" onclick="baixarXML('${nf.id}', '${nf.xmlFile}')" title="Baixar XML"><i data-lucide="code"></i></button>
          <button class="btn btn-secondary btn-icon-only" onclick="baixarPDFNota('${nf.id}', '${nf.destinatario}', ${nf.valor}, '${nf.tipo}')" title="Visualizar/Imprimir Danfe"><i data-lucide="file-text"></i></button>
        </td>
      </tr>
    `).join('');
    lucide.createIcons();
  }
}

window.baixarXML = function(id, xmlFilename) {
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
        <xNome>${document.getElementById("fiscal-destinatario")?.value || 'Destinatário'}</xNome>
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
  
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DANFE - ${id}</title>
  <style>
    body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; color: #000; }
    .border-box { border: 2px solid #000; padding: 10px; margin-bottom: 10px; }
    .header-table { width: 100%; border-collapse: collapse; }
    .header-table td { border: 1px solid #000; padding: 6px; }
    .title { font-size: 16px; font-weight: bold; text-align: center; }
    .label { font-size: 9px; text-transform: uppercase; color: #555; }
    .value { font-weight: bold; font-size: 11px; }
    .footer { text-align: center; margin-top: 30px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
  </style>
</head>
<body>
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
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
};

// 5. FINANCEIRO CONTROLLER
let editingFaturamentoId = null;

function initFinanceiro() {
  setupFinancialLaunchers();
  setupManualBilling();
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
    })
  });

  const receberCliente = document.getElementById("receber-cliente");
  if (receberCliente) {
    receberCliente.innerHTML = ERP_DATA.cadastro.clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("");
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
    })
  });

  bindFinancialForm("fluxo", {
    list: ERP_DATA.financeiro.fluxoCaixa.diario,
    build: () => {
      const tipo = document.getElementById("fluxo-tipo").value;
      const valor = parseFloat(document.getElementById("fluxo-valor").value) || 0;
      return {
        data: formatShortDate(document.getElementById("fluxo-data").value),
        receita: tipo === "receita" ? valor : 0,
        despesa: tipo === "despesa" ? valor : 0
      };
    },
    afterSave: (item) => {
      ERP_DATA.financeiro.fluxoCaixa.saldoAtual += (item.receita || 0) - (item.despesa || 0);
      renderForecastChart();
      renderCashFlowChart();
      updateDashboardKPIs();
    }
  });
}

function bindFinancialForm(kind, options) {
  const btnNovo = document.getElementById(`btn-novo-${kind}`);
  const btnCancelar = document.getElementById(`btn-cancelar-${kind}`);
  const form = document.getElementById(`form-novo-${kind}`);
  if (!form) return;
  if (btnNovo && btnNovo.dataset.bound !== "true") {
    btnNovo.dataset.bound = "true";
    btnNovo.addEventListener("click", () => {
      setDefaultFinancialDates(kind);
      form.classList.remove("hidden");
    });
  }
  if (btnCancelar && btnCancelar.dataset.bound !== "true") {
    btnCancelar.dataset.bound = "true";
    btnCancelar.addEventListener("click", () => {
      form.reset();
      form.classList.add("hidden");
    });
  }
  if (form.dataset.bound === "true") return;
  form.dataset.bound = "true";
  form.addEventListener("submit", event => {
    event.preventDefault();
    const item = options.build();
    options.list.unshift(item);
    if (options.afterSave) options.afterSave(item);
    saveState();
    form.reset();
    form.classList.add("hidden");
    renderFinanceiroTables();
  });
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
    clienteSelect.innerHTML = ERP_DATA.cadastro.clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("");
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

function nextFinanceId(prefix, list) {
  const used = new Set(list.map(item => item.id));
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
    pagarBody.innerHTML = ERP_DATA.financeiro.contasPagar.map(b => `
      <tr>
        <td>${b.descricao}</td>
        <td>${b.fornecedor}</td>
        <td>${formatDateBR(b.vencimento)}</td>
        <td>${formatBRL(b.valor)}</td>
        <td><span class="badge ${b.status === 'Pago' ? 'badge-success' : b.status === 'Atrasado' ? 'badge-danger' : 'badge-warning'}">${b.status}</span></td>
        <td>
          ${b.status !== 'Pago' ? `<button class="btn btn-secondary btn-icon-only" onclick="payBill('${b.id}')" title="Marcar como Pago"><i data-lucide="check"></i></button>` : ''}
        </td>
      </tr>
    `).join('');
  }

  // Receber
  const receberBody = document.getElementById("table-receber-body");
  if (receberBody) {
    receberBody.innerHTML = ERP_DATA.financeiro.contasReceber.map(b => `
      <tr>
        <td>${b.descricao}</td>
        <td>${b.cliente}</td>
        <td>${formatDateBR(b.vencimento)}</td>
        <td>${formatBRL(b.valor)}</td>
        <td><span class="badge ${b.status === 'Recebido' ? 'badge-success' : 'badge-warning'}">${b.status}</span></td>
        <td>
          ${b.status !== 'Recebido' ? `<button class="btn btn-secondary btn-icon-only" onclick="receiveBill('${b.id}')" title="Receber Valor"><i data-lucide="arrow-down-left"></i></button>` : ''}
        </td>
      </tr>
    `).join('');
  }

  // Faturamento
  const fatBody = document.getElementById("table-faturamento-body");
  if (fatBody) {
    const allFaturas = ERP_DATA.financeiro.contasReceber
      .filter(r => r.contratoId || r.manualFaturamento || r.descricao?.startsWith('Faturamento'))
      .map(f => ({ id: f.id, descricao: f.descricao || '', cliente: f.cliente, emissao: f.emissao || new Date().toISOString().split('T')[0], vencimento: f.vencimento, valor: f.valor, nfseEmitida: f.nfseEmitida || false, boletoGerado: f.boletoGerado || false, recId: f.id }));

    if (!allFaturas.length) {
      fatBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhuma fatura gerada.</td></tr>';
    } else {
      fatBody.innerHTML = allFaturas.map(fat => `
        <tr>
          <td><strong>${fat.id}</strong></td>
          <td>${fat.cliente}</td>
          <td>${formatDateBR(fat.emissao)}</td>
          <td>${formatDateBR(fat.vencimento)}</td>
          <td><strong>${formatBRL(fat.valor)}</strong></td>
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
      `).join('');
    }
  }

  lucide.createIcons();
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
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Boleto ${fat.id || fallbackFatId}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
    .doc { max-width: 820px; margin: 0 auto; border: 1px solid #111827; padding: 24px; }
    .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 16px; }
    h1 { margin: 0; font-size: 22px; }
    .muted { color: #4b5563; font-size: 12px; text-transform: uppercase; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 22px 0; }
    .box { border: 1px solid #d1d5db; padding: 12px; min-height: 54px; }
    .pix { display: grid; grid-template-columns: 210px 1fr; gap: 18px; align-items: center; border: 2px solid #111827; padding: 16px; margin-top: 20px; }
    .pix img { width: 180px; height: 180px; display: block; }
    .copy { word-break: break-all; font-family: "Courier New", monospace; font-size: 11px; background: #f3f4f6; border: 1px solid #d1d5db; padding: 10px; margin-top: 8px; }
    .amount { font-size: 24px; font-weight: 800; }
    .barcode { margin-top: 24px; border: 1px solid #111827; padding: 14px; font-family: "Courier New", monospace; font-size: 18px; letter-spacing: 1px; text-align: center; }
    .bars { display: flex; height: 62px; gap: 3px; align-items: stretch; justify-content: center; margin-top: 12px; }
    .bars span { background: #111827; display: block; }
    .footer { margin-top: 24px; font-size: 12px; color: #374151; border-top: 1px dashed #9ca3af; padding-top: 12px; }
    @page { size: A4; margin: 12mm; }
    @media print { body { margin: 0; } .doc { border: 0; } }
  </style>
</head>
<body>
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
  </section>
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

function renderForecastChart() {
  const ctx = document.getElementById("finance-forecast-chart");
  if (!ctx) return;

  if (forecastChartInstance) {
    forecastChartInstance.destroy();
  }

  const cenario = document.getElementById("select-cenario").value;
  let multiplier = 1.0;
  if (cenario === 'conservador') multiplier = 0.85;
  if (cenario === 'otimista') multiplier = 1.2;

  const labels = ["Jul/26", "Ago/26", "Set/26", "Out/26", "Nov/26", "Dez/26"];
  const baselineReceitas = [150000, 162000, 158000, 175000, 182000, 210000];
  const despesas = [110000, 115000, 112000, 118000, 120000, 135000];

  const projectedReceitas = baselineReceitas.map(v => v * multiplier);

  const isLight = document.body.classList.contains("light-theme");
  const textColor = isLight ? '#475569' : '#94a3b8';

  forecastChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: `Previsão Receitas (${cenario})`,
          data: projectedReceitas,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Previsão Despesas Fixas',
          data: despesas,
          borderColor: '#ef4444',
          borderDash: [5, 5],
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  document.getElementById("select-cenario").addEventListener("change", renderForecastChart);
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
  const selectVeiculo = document.getElementById("aba-veiculo");
  if (selectVeiculo) {
    selectVeiculo.innerHTML = ERP_DATA.cadastro.veiculos.map(v => `<option value="${v.placa}">${v.marca} ${v.modelo} (${v.placa})</option>`).join('');
  }

  const form = document.getElementById("form-frota-abastecimento");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const veiculo = selectVeiculo.value;
      const comb = document.getElementById("aba-combustivel").value;
      const litros = parseFloat(document.getElementById("aba-litros").value);
      const custo = parseFloat(document.getElementById("aba-custo").value);

      const newRefuel = {
        id: `ABA-00${ERP_DATA.frota.abastecimentos.length + 1}`,
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
  if (pdfBtn) {
    pdfBtn.addEventListener("click", () => {
      alert("Relatório Consolidado Geral gerado como PDF com sucesso! (Salvo na fila de downloads corporativos)");
    });
  }

  renderAdministrativoDocs();
  renderConsolidadoGeral();
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
