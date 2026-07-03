import { initialData } from './data.js';

// Local storage state initialization
let ERP_DATA = JSON.parse(localStorage.getItem('erp_data')) || initialData;

function saveState() {
  localStorage.setItem('erp_data', JSON.stringify(ERP_DATA));
}

// Charts references
let cashFlowChartInstance = null;
let forecastChartInstance = null;

// Initialize Lucide Icons
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  initRouter();
  initTheme();
  initTabs();
  initDashboard();
  initComercial();
  initCadastro();
  initFiscal();
  initFinanceiro();
  initRH();
  initFrota();
  initEstoque();
  initAdministrativo();
  
  // Custom Global Search
  const searchInput = document.getElementById("global-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const val = e.target.value.toLowerCase();
      // Basic page filter indicator
      console.log("Global search: ", val);
    });
  }
});

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
        if (view.id === `view-${viewId}`) {
          view.classList.add("active");
        }
      });

      // Update titles
      if (viewInfo[viewId]) {
        titleEl.textContent = viewInfo[viewId].title;
        subtitleEl.textContent = viewInfo[viewId].sub;
      }

      // Re-trigger specific setups if needed (like charts)
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
  
  document.getElementById("kpi-receita").textContent = formatBRL(totalReceitas);
  document.getElementById("kpi-vendas").textContent = `${activeOrdersCount} Pedidos`;
  document.getElementById("kpi-frota").textContent = `${vehiclesActiveCount} Veículos`;
}

function renderDashboardNotifications() {
  const container = document.getElementById("dashboard-notifications");
  if (!container) return;

  const notifications = [
    { type: "danger", text: "Licença Ambiental Simplificada (LAS) vence em breve." },
    { type: "warning", text: "Produto [Película Protetora] próximo ao vencimento." },
    { type: "info", text: "Contrato Fornecimento Gamma expira em 30 dias." }
  ];

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
  const marginFields = kind === "orcamento"
    ? "<div class='form-group'><label>Margem de Lucro Desejada (%)</label><input type='number' class='form-input' id='orc-margem' value='30' min='0' required></div><div class='form-group'><label>Alíquota de Imposto (%)</label><input type='number' class='form-input' id='orc-imposto' value='18' min='0' required></div>"
    : "";
  const totalLabel = kind === "orcamento" ? "VALOR FINAL CALCULADO" : "TOTAL DO PEDIDO";
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
    "<div class='commercial-summary'>" + marginFields + "<div class='commercial-total'><span>" + totalLabel + "</span><strong id='" + prefix + "-resultado-val'>R$ 0,00</strong></div><button type='submit' class='btn btn-primary'><i data-lucide='" + icon + "'></i> " + buttonLabel + "</button></div>";
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
  return tipo === "Serviço" ? COMMERCIAL_SERVICES_UPGRADE : ERP_DATA.cadastro.produtos;
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
  if (kind !== "orcamento") return { subtotal: subtotal, finalValue: subtotal, taxValue: 0 };
  const margem = parseFloat(document.getElementById("orc-margem")?.value) || 0;
  const imposto = parseFloat(document.getElementById("orc-imposto")?.value) || 0;
  const comMargem = subtotal * (1 + margem / 100);
  const finalValue = comMargem * (1 + imposto / 100);
  return { subtotal: subtotal, finalValue: finalValue, taxValue: finalValue - comMargem };
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
        impostos: totals.taxValue,
        total: totals.finalValue,
        margem: parseFloat(document.getElementById("orc-margem").value) || 0,
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
      return "<tr><td><strong>" + ped.id + "</strong></td><td>" + ped.cliente + "</td><td>" + ped.data + "</td><td>" + formatBRL(ped.total) + "</td><td>" + ped.entregaEstimada + "</td><td><span class='badge " + badge + "'>" + ped.status + "</span></td><td>" + commercialActionsHtml("pedido", ped.id) + "</td></tr>";
    }).join("");
  }

  const conBody = document.getElementById("table-contratos-body");
  if (conBody) {
    conBody.innerHTML = ERP_DATA.comercial.contratos.map(function(con) {
      const badge = con.status === "Ativo" ? "badge-success" : "badge-warning";
      return "<tr><td>" + con.titulo + "</td><td>" + con.tipo + "</td><td>" + con.parceiro + "</td><td>" + con.vigenciaFim + "</td><td>" + formatBRL(con.valorMensal) + "</td><td><span class='badge badge-success'><i data-lucide='check'></i> Digital</span></td><td><span class='badge " + badge + "'>" + con.status + "</span></td></tr>";
    }).join("");
  }
  lucide.createIcons();
}

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
  const extraLabel = kind === "pedido" ? "Previsão de entrega" : "Margem aplicada";
  const extraValue = kind === "pedido" ? record.entregaEstimada : ((record.margem || 0) + "%");
  const taxLine = kind === "orcamento" ? "<div class='total-line'><span>Impostos</span><strong>" + formatBRL(record.impostos || 0) + "</strong></div>" : "";
  const html = "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>" + title + " " + record.id + "</title><style>body{font-family:Arial,sans-serif;color:#111827;margin:40px}header{border-bottom:2px solid #4f46e5;padding-bottom:18px;margin-bottom:24px;display:flex;justify-content:space-between;gap:24px}h1{margin:0;font-size:26px}.muted{color:#6b7280;font-size:13px}.box{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f3f4f6;text-align:left;font-size:12px;text-transform:uppercase}th,td{border-bottom:1px solid #e5e7eb;padding:10px}.totals{margin-left:auto;width:320px}.total-line{display:flex;justify-content:space-between;padding:8px 0}.grand{font-size:20px;font-weight:800;border-top:2px solid #111827;margin-top:8px;padding-top:12px}@page{size:A4;margin:14mm}@media print{body{margin:0}}</style></head><body><header><div><h1>" + title + "</h1><div class='muted'>APP ADM - Sistema Integrado de Gestão ERP</div></div><div><strong>" + record.id + "</strong><br><span class='muted'>Emissão: " + new Date().toLocaleDateString("pt-BR") + "</span></div></header><section class='box grid'><div><span class='muted'>Cliente</span><br><strong>" + record.cliente + "</strong></div><div><span class='muted'>Data do registro</span><br><strong>" + record.data + "</strong></div><div><span class='muted'>Status</span><br><strong>" + record.status + "</strong></div><div><span class='muted'>" + extraLabel + "</span><br><strong>" + extraValue + "</strong></div></section><section class='box'><strong>Produtos e serviços</strong><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>" + rows + "</tbody></table></section><section class='totals'><div class='total-line'><span>Subtotal</span><strong>" + formatBRL(subtotal) + "</strong></div>" + taxLine + "<div class='total-line grand'><span>Total</span><strong>" + formatBRL(record.total) + "</strong></div></section></body></html>";
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

// 3. CADASTRO CONTROLLER
let editingProductId = null;

function initCadastro() {
  setupProductManagement();
  renderCadastroTables();
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
    btn.innerHTML = '<i data-lucide="plus"></i> Novo Produto';
    header.appendChild(btn);
  }

  const grid = document.getElementById("catalog-produtos-grid");
  if (grid && !document.getElementById("form-produto")) {
    const form = document.createElement("form");
    form.id = "form-produto";
    form.className = "product-form hidden";
    form.innerHTML = '<div class="form-row">' +
      '<div class="form-group"><label>Nome do Produto</label><input type="text" class="form-input" id="produto-nome" required></div>' +
      '<div class="form-group"><label>Categoria</label><input type="text" class="form-input" id="produto-categoria" required></div>' +
      '<div class="form-group"><label>Preço de Venda</label><input type="number" class="form-input" id="produto-preco" min="0" step="0.01" required></div>' +
      '<div class="form-group"><label>Estoque Atual</label><input type="number" class="form-input" id="produto-estoque" min="0" step="1" required></div>' +
      '<div class="form-group"><label>Custo Médio</label><input type="number" class="form-input" id="produto-custo" min="0" step="0.01" required></div>' +
      '<div class="form-group"><label>Validade</label><input type="date" class="form-input" id="produto-validade"></div>' +
      '</div><div class="product-form-actions">' +
      '<button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Salvar Produto</button>' +
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
  lucide.createIcons();
}

function openProductForm(product) {
  const form = document.getElementById("form-produto");
  if (!form) return;
  form.classList.remove("hidden");
  editingProductId = product?.id || null;
  document.getElementById("produto-nome").value = product?.nome || "";
  document.getElementById("produto-categoria").value = product?.categoria || "";
  document.getElementById("produto-preco").value = product?.precoVenda ?? "";
  document.getElementById("produto-estoque").value = product?.estoqueAtual ?? "";
  document.getElementById("produto-custo").value = product?.custoMedio ?? "";
  document.getElementById("produto-validade").value = product?.validade || "";
  document.getElementById("produto-nome").focus();
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
  const productData = {
    nome: document.getElementById("produto-nome").value.trim(),
    categoria: document.getElementById("produto-categoria").value.trim(),
    precoVenda: parseFloat(document.getElementById("produto-preco").value) || 0,
    estoqueAtual: parseInt(document.getElementById("produto-estoque").value, 10) || 0,
    custoMedio: parseFloat(document.getElementById("produto-custo").value) || 0,
    validade: document.getElementById("produto-validade").value || null
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
        <td>${col.admissao}</td>
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
        <td>${v.vencimentoLicenciamento}</td>
        <td><span class="badge ${v.status === 'Operacional' ? 'badge-success' : 'badge-warning'}">${v.status}</span></td>
      </tr>
    `).join('');
  }

  // Produtos Catalog Grid
  const prodGrid = document.getElementById("catalog-produtos-grid");
  if (prodGrid) {
    prodGrid.innerHTML = ERP_DATA.cadastro.produtos.map(p =>
      '<div class="product-card">' +
        '<div class="product-card-header">' +
          '<div><h4>' + p.nome + '</h4><span>' + p.categoria + '</span></div>' +
          '<button type="button" class="btn btn-secondary btn-icon-only" data-product-action="edit" data-id="' + p.id + '" title="Editar produto"><i data-lucide="pencil"></i></button>' +
        '</div>' +
        '<div class="product-metrics">' +
          '<div><span>PREÇO</span><strong>' + formatBRL(p.precoVenda) + '</strong></div>' +
          '<div><span>ESTOQUE</span><strong style="color: ' + (p.estoqueAtual < 10 ? 'var(--color-danger)' : 'var(--color-success)') + ';">' + p.estoqueAtual + ' unid</strong></div>' +
          '<div><span>CUSTO</span><strong>' + formatBRL(p.custoMedio || 0) + '</strong></div>' +
          '<div><span>VALIDADE</span><strong>' + (p.validade || 'Sem validade') + '</strong></div>' +
        '</div>' +
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

      const newNF = {
        id: `NF-${1026 + ERP_DATA.fiscal.notasEmitidas.length}`,
        destinatario: dest,
        tipo: tipo,
        valor: val,
        emissao: new Date().toISOString(),
        status: "Autorizada (SEFAZ)",
        xmlFile: `NF352606${Math.floor(1000000000 + Math.random() * 9000000000)}.xml`
      };

      ERP_DATA.fiscal.notasEmitidas.unshift(newNF);
      saveState();
      renderFiscalData();
      form.reset();
      alert("Nota transmitida com sucesso e autorizada pela SEFAZ Estadual!");
    });
  }

  // Contabilidade export button
  const contabBtn = document.getElementById("btn-export-contabilidade");
  if (contabBtn) {
    contabBtn.addEventListener("click", () => {
      alert("Sucesso! Todos os arquivos fiscais e XMLs da competência 06/2026 foram compactados e enviados para o e-mail: contabil@parceiro.com.br.");
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
      </tr>
    `).join('');
    lucide.createIcons();
  }
}

// 5. FINANCEIRO CONTROLLER
function initFinanceiro() {
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

function renderFinanceiroTables() {
  // Pagar
  const pagarBody = document.getElementById("table-pagar-body");
  if (pagarBody) {
    pagarBody.innerHTML = ERP_DATA.financeiro.contasPagar.map(b => `
      <tr>
        <td>${b.descricao}</td>
        <td>${b.fornecedor}</td>
        <td>${b.vencimento}</td>
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
        <td>${b.vencimento}</td>
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
    // Populate with recent invoices billed
    fatBody.innerHTML = ERP_DATA.fiscal.notasEmitidas.map(nf => `
      <tr>
        <td>FAT-${nf.id.replace('NF-', '')}</td>
        <td>${nf.destinatario}</td>
        <td>2026-06-30</td>
        <td>2026-07-30</td>
        <td><strong>${formatBRL(nf.valor)}</strong></td>
        <td><span class="badge badge-primary" style="cursor: pointer;"><i data-lucide="download"></i> PDF Boleto</span></td>
        <td><span class="badge badge-success"><i data-lucide="check"></i> Emitido</span></td>
      </tr>
    `).join('');
  }

  lucide.createIcons();
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
  
  if (colSelect) {
    // Populate select
    colSelect.innerHTML = ERP_DATA.cadastro.colaboradores.map(c => `
      <option value="${c.id}">${c.nome}</option>
    `).join('');

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

  [horasInput, benefInput].forEach(inp => {
    inp.addEventListener("input", calculatePayroll);
  });

  const form = document.getElementById("form-folha-rh");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const col = ERP_DATA.cadastro.colaboradores.find(c => c.id === colSelect.value);
      const results = calculatePayroll();

      alert(`Holerite gerado com sucesso para ${col.nome}! Líquido: ${formatBRL(results.net)}`);
      
      // We could add this to a dynamic comprovantes list
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
        <td>${v.vencimentoLicenciamento}</td>
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
          <span class="badge badge-danger" style="margin-bottom: 0.25rem;">Vencimento: ${p.validade}</span>
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
    });
  }

  const pdfBtn = document.getElementById("btn-export-pdf");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", () => {
      alert("Relatório Consolidado Geral gerado como PDF com sucesso! (Salvo na fila de downloads corporativos)");
    });
  }

  renderAdministrativoDocs();
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
          <strong>${doc.vencimento}</strong>
        </div>
        <span class="badge ${doc.status === 'Válido' ? 'badge-success' : 'badge-warning'}" style="align-self: flex-start; margin-top: 0.25rem;">${doc.status}</span>
      </div>
    `).join('');
    lucide.createIcons();
  }
}
