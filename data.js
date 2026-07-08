// Banco de dados simulado para o APP ADM com suporte a Multi-empresa
export const initialData = {
  activeSession: null,
  companies: [
    {
      id: "comp-1",
      cnpj: "12.345.678/0001-90",
      razaoSocial: "Indústrias Metalúrgicas Alfa",
      pixKey: "12.345.678/0001-90",
      data: {
        comercial: {
          orcamentos: [
            { id: "ORC-001", cliente: "Indústrias Metalúrgicas Alfa", data: "2026-06-28", subtotal: 15000.00, impostos: 2700.00, total: 17700.00, margem: 35, status: "Aprovado" },
            { id: "ORC-002", cliente: "Transportadora Veloz Ltda", data: "2026-06-29", subtotal: 8500.00, impostos: 1530.00, total: 10030.00, margem: 40, status: "Pendente" },
            { id: "ORC-003", cliente: "Supermercados Pão & Leite", data: "2026-06-30", subtotal: 22000.00, impostos: 3960.00, total: 25960.00, margem: 30, status: "Rascunho" }
          ],
          pedidos: [
            { id: "PED-001", cliente: "Indústrias Metalúrgicas Alfa", data: "2026-06-28", total: 17700.00, status: "Preparando", entregaEstimada: "2026-07-05" },
            { id: "PED-002", cliente: "Construtora Silva & Filhos", data: "2026-06-25", total: 45000.00, status: "Entregue", entregaEstimada: "2026-06-29" },
            { id: "PED-003", cliente: "Comércio Varejista Beta", data: "2026-06-29", total: 12500.00, status: "Aguardando Aprovação", entregaEstimada: "2026-07-08" }
          ],
          contratos: [
            { id: "CON-001", titulo: "Prestação de Serviços - Alfa", tipo: "Cliente", parceiro: "Indústrias Metalúrgicas Alfa", vigenciaInicio: "2026-01-01", vigenciaFim: "2026-12-31", valorMensal: 5000.00, status: "Ativo" },
            { id: "CON-002", titulo: "Fornecimento de Insumos - Gamma", tipo: "Fornecedor", parceiro: "Química Gamma S.A.", vigenciaInicio: "2025-07-01", vigenciaFim: "2026-07-01", valorMensal: 8000.00, status: "Próximo ao Vencimento" }
          ]
        },
        cadastro: {
          clientes: [
            { id: "CLI-001", nome: "Indústrias Metalúrgicas Alfa", cnpj: "12.345.678/0001-90", email: "contato@metalalfa.com.br", telefone: "(11) 4002-8922", totalComprado: 125000.00 },
            { id: "CLI-002", nome: "Transportadora Veloz Ltda", cnpj: "98.765.432/0001-10", email: "financeiro@veloztrans.com.br", telefone: "(21) 3344-5566", totalComprado: 95300.00 },
            { id: "CLI-003", nome: "Supermercados Pão & Leite", cnpj: "45.678.901/0002-34", email: "compras@paoleite.com.br", telefone: "(31) 2233-4455", totalComprado: 45000.00 }
          ],
          fornecedores: [
            { id: "FOR-001", nome: "Química Gamma S.A.", cnpj: "11.222.333/0001-44", contato: "Carlos Souza", telefone: "(19) 3871-9000", qualidade: "Excelente", prazoMedio: "5 dias" },
            { id: "FOR-002", nome: "Madeiras Pinhal Eireli", cnpj: "22.333.444/0001-55", contato: "Ana Silva", telefone: "(15) 3224-1122", qualidade: "Bom", prazoMedio: "10 dias" }
          ],
          colaboradores: [
            { id: "COL-001", nome: "José Roberto Santos", cargo: "Gerente Comercial", departamento: "Comercial", salario: 6500.00, admissao: "2022-03-15", status: "Ativo" },
            { id: "COL-002", nome: "Mariana Oliveira Costa", cargo: "Analista Financeiro", departamento: "Financeiro", salario: 4200.00, admissao: "2024-01-10", status: "Ativo" },
            { id: "COL-003", nome: "Pedro Henrique Silva", cargo: "Operador de Estoque", departamento: "Logística", salario: 2500.00, admissao: "2025-06-01", status: "Ativo" }
          ],
          veiculos: [
            { id: "VEI-001", placa: "ABC-1234", modelo: "Fiorino 1.4 Hard Working", marca: "Fiat", ano: 2021, status: "Operacional", vencimentoLicenciamento: "2026-09-15" },
            { id: "VEI-002", placa: "XYZ-9876", modelo: "Constellation 24.280", marca: "Volkswagen", ano: 2019, status: "Em Manutenção", vencimentoLicenciamento: "2026-07-20" }
          ],
          produtos: [
            { id: "PROD-001", nome: "Bobina de Aço Galvanizado", categoria: "Insumos", precoVenda: 1200.00, estoqueAtual: 45, custoMedio: 780.00, validade: null, imagem: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=60" },
            { id: "PROD-002", nome: "Graxa Industrial Azul HT", categoria: "Manutenção", precoVenda: 85.00, estoqueAtual: 120, custoMedio: 42.00, validade: "2026-11-30", imagem: "https://images.unsplash.com/photo-1530124560072-a059b014b37d?w=200&auto=format&fit=crop&q=60" },
            { id: "PROD-003", nome: "Película Protetora Anti-UV", categoria: "Embalagem", precoVenda: 150.00, estoqueAtual: 8, custoMedio: 95.00, validade: "2026-07-15", imagem: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=200&auto=format&fit=crop&q=60" }
          ]
        },
        fiscal: {
          notasEmitidas: [
            { id: "NF-1024", destinatario: "Indústrias Metalúrgicas Alfa", tipo: "NFe", valor: 17700.00, emissao: "2026-06-28T14:30:00", status: "Autorizada (SEFAZ)", xmlFile: "NFe35260612345678000190550010000010241001024090.xml" },
            { id: "NF-1025", destinatario: "Transportadora Veloz Ltda", tipo: "CTe", valor: 3500.00, emissao: "2026-06-29T10:15:00", status: "Autorizada (SEFAZ)", xmlFile: "CTe35260612345678000190570010000010251001025091.xml" }
          ],
          comunicacaoContabilidade: {
            ultimoEnvio: "2026-06-01",
            arquivosPendentes: 14,
            competenciaAtual: "06/2026"
          }
        },
        financeiro: {
          contasPagar: [
            { id: "PAG-001", descricao: "Aluguel Galpão Logístico", fornecedor: "Imobiliária Central", vencimento: "2026-07-05", valor: 12000.00, status: "A Pagar" },
            { id: "PAG-002", descricao: "Fatura de Energia Elétrica", fornecedor: "Neoenergia S.A.", vencimento: "2026-07-10", valor: 4500.00, status: "A Pagar" },
            { id: "PAG-003", descricao: "Fornecimento Química Gamma", fornecedor: "Química Gamma S.A.", vencimento: "2026-06-25", valor: 8000.00, status: "Atrasado" }
          ],
          contasReceber: [
            { id: "REC-001", descricao: "Faturamento Pedido PED-001", cliente: "Indústrias Metalúrgicas Alfa", vencimento: "2026-07-28", valor: 17700.00, status: "A Receber" },
            { id: "REC-002", descricao: "Faturamento Pedido PED-002", cliente: "Construtora Silva & Filhos", vencimento: "2026-06-29", valor: 45000.00, status: "Recebido" }
          ],
          fluxoCaixa: {
            diario: [
              { data: "24/06", receita: 15000, despesa: 12000 },
              { data: "25/06", receita: 18000, despesa: 9000 },
              { data: "26/06", receita: 22000, despesa: 14000 },
              { data: "27/06", receita: 5000, despesa: 3000 },
              { data: "28/06", receita: 29000, despesa: 16000 },
              { data: "29/06", receita: 45000, despesa: 8000 },
              { data: "30/06", receita: 12000, despesa: 25000 }
            ],
            saldoAtual: 148500.00,
            projecaoMes: 195000.00
          }
        },
        rh: {
          contratosTrabalho: [
            { id: "CT-001", colaborador: "José Roberto Santos", tipo: "CLT", inicio: "2022-03-15", termino: "Indeterminado", status: "Ativo" },
            { id: "CT-002", colaborador: "Pedro Henrique Silva", tipo: "CLT - Temporário", inicio: "2025-06-01", termino: "2026-12-01", status: "Ativo" }
          ]
        },
        frota: {
          manutencoes: [
            { id: "MAN-001", veiculo: "XYZ-9876", servico: "Retífica de motor e troca de bicos injetores", oficina: "Mecânica Diesel Express", data: "2026-06-26", custo: 8400.00, status: "Em Execução" },
            { id: "MAN-002", veiculo: "ABC-1234", servico: "Troca de óleo, filtros e pastilhas de freio", oficina: "AutoCenter Car", data: "2026-05-10", custo: 680.00, status: "Concluído" }
          ],
          abastecimentos: [
            { id: "ABA-001", veiculo: "ABC-1234", data: "2026-06-29", combustivel: "Gasolina", litros: 45, valorTotal: 261.00, kmAtual: 82450 },
            { id: "ABA-002", veiculo: "XYZ-9876", data: "2026-06-28", combustivel: "Diesel S10", litros: 180, valorTotal: 1098.00, kmAtual: 184560 }
          ],
          multas: [
            { id: "MUL-001", veiculo: "ABC-1234", infracao: "Excesso de velocidade (Média)", local: "Av. Brasil, Km 23", data: "2026-06-12", valor: 130.16, vencimento: "2026-08-15", status: "Aguardando Pagamento" }
          ]
        },
        estoque: {
          movimentacoes: []
        },
        administrativo: {
          documentos: [
            { id: "DOC-001", nome: "Alvará de Funcionamento 2026", categoria: "Alvarás", emissao: "2026-01-10", vencimento: "2027-01-10", status: "Válido" },
            { id: "DOC-002", nome: "Certidão Negativa de Débitos Federais", categoria: "Certidões", emissao: "2026-04-15", vencimento: "2026-10-15", status: "Válido" },
            { id: "DOC-003", nome: "Licença Ambiental Simplificada (LAS)", categoria: "Licenças", emissao: "2022-07-20", vencimento: "2026-07-20", status: "Vencendo em Breve" }
          ]
        }
      }
    },
    {
      id: "comp-2",
      cnpj: "98.765.432/0001-10",
      razaoSocial: "Transportadora Veloz Ltda",
      pixKey: "financeiro@veloztrans.com.br",
      data: {
        comercial: {
          orcamentos: [
            { id: "ORC-001", cliente: "Supermercados Pão & Leite", data: "2026-06-25", subtotal: 9000.00, impostos: 1620.00, total: 10620.00, margem: 30, status: "Aprovado" }
          ],
          pedidos: [
            { id: "PED-001", cliente: "Supermercados Pão & Leite", data: "2026-06-25", total: 10620.00, status: "Preparando", entregaEstimada: "2026-07-02" }
          ],
          contratos: [
            { id: "CON-001", titulo: "Logística Mensal - Veloz", tipo: "Cliente", parceiro: "Supermercados Pão & Leite", vigenciaInicio: "2026-01-01", vigenciaFim: "2026-12-31", valorMensal: 7500.00, status: "Ativo" }
          ]
        },
        cadastro: {
          clientes: [
            { id: "CLI-001", nome: "Supermercados Pão & Leite", cnpj: "45.678.901/0002-34", email: "compras@paoleite.com.br", telefone: "(31) 2233-4455", totalComprado: 10620.00 }
          ],
          fornecedores: [
            { id: "FOR-001", nome: "Posto Combustível Rápido", cnpj: "33.444.555/0001-66", contato: "Marcos", telefone: "(11) 98765-4321", qualidade: "Bom", prazoMedio: "Imediato" }
          ],
          colaboradores: [
            { id: "COL-001", nome: "Carlos Motorista", cargo: "Motorista de Carreta", departamento: "Logística", salario: 3800.00, admissao: "2023-05-10", status: "Ativo" }
          ],
          veiculos: [
            { id: "VEI-001", placa: "VEL-8888", modelo: "Constellation 24.280", marca: "Volkswagen", ano: 2020, status: "Operacional", vencimentoLicenciamento: "2026-12-15" }
          ],
          produtos: [
            { id: "PROD-001", nome: "Serviço de Frete km", categoria: "Serviços", precoVenda: 4.50, estoqueAtual: 99999, custoMedio: 2.20, validade: null, imagem: "" }
          ]
        },
        fiscal: {
          notasEmitidas: [
            { id: "NF-2001", destinatario: "Supermercados Pão & Leite", tipo: "NFs", valor: 10620.00, emissao: "2026-06-25T11:00:00", status: "Autorizada (SEFAZ)", xmlFile: "NFs35260698765432000110550010000020011001024090.xml" }
          ],
          comunicacaoContabilidade: {
            ultimoEnvio: "2026-06-01",
            arquivosPendentes: 2,
            competenciaAtual: "06/2026"
          }
        },
        financeiro: {
          contasPagar: [
            { id: "PAG-001", descricao: "Manutenção Preventiva Caminhão", fornecedor: "Oficina Mecânica", vencimento: "2026-07-15", valor: 1500.00, status: "A Pagar" }
          ],
          contasReceber: [
            { id: "REC-001", descricao: "Faturamento Frete Alfa", cliente: "Supermercados Pão & Leite", vencimento: "2026-07-10", valor: 10620.00, status: "A Receber" }
          ],
          fluxoCaixa: {
            diario: [
              { data: "28/06", receita: 10620, despesa: 4500 }
            ],
            saldoAtual: 75200.00,
            projecaoMes: 95000.00
          }
        },
        rh: {
          contratosTrabalho: [
            { id: "CT-001", colaborador: "Carlos Motorista", tipo: "CLT", inicio: "2023-05-10", termino: "Indeterminado", status: "Ativo" }
          ]
        },
        frota: {
          manutencoes: [],
          abastecimentos: [],
          multas: []
        },
        estoque: {
          movimentacoes: []
        },
        administrativo: {
          documentos: []
        }
      }
    },
    {
      id: "comp-3",
      cnpj: "67.873.641/0001-21",
      razaoSocial: "Nova Empresa Licenciada",
      pixKey: "67.873.641/0001-21",
      data: {
        comercial: { orcamentos: [], pedidos: [], contratos: [] },
        cadastro: { clientes: [], fornecedores: [], colaboradores: [], veiculos: [], produtos: [] },
        fiscal: { notasEmitidas: [], comunicacaoContabilidade: { ultimoEnvio: '', arquivosPendentes: 0, competenciaAtual: '' } },
        financeiro: { contasPagar: [], contasReceber: [], fluxoCaixa: { diario: [], saldoAtual: 0, projecaoMes: 0 } },
        rh: { contratosTrabalho: [] },
        frota: { manutencoes: [], abastecimentos: [], multas: [] },
        estoque: { movimentacoes: [] },
        administrativo: { documentos: [] }
      }
    },
    {
      id: "comp-4",
      cnpj: "57.135.668/0001-63",
      razaoSocial: "Empresa Lucas",
      pixKey: "57.135.668/0001-63",
      data: {
        comercial: { orcamentos: [], pedidos: [], contratos: [] },
        cadastro: { clientes: [], fornecedores: [], colaboradores: [], veiculos: [], produtos: [] },
        fiscal: { notasEmitidas: [], comunicacaoContabilidade: { ultimoEnvio: '', arquivosPendentes: 0, competenciaAtual: '' } },
        financeiro: { contasPagar: [], contasReceber: [], fluxoCaixa: { diario: [], saldoAtual: 0, projecaoMes: 0 } },
        rh: { contratosTrabalho: [] },
        frota: { manutencoes: [], abastecimentos: [], multas: [] },
        estoque: { movimentacoes: [] },
        administrativo: { documentos: [] }
      }
    }
  ],
  users: [
    { username: "admin", password: "123456", cnpj: "12.345.678/0001-90" },
    { username: "veloz", password: "654321", cnpj: "98.765.432/0001-10" },
    { username: "osnei", password: "031705", cnpj: "67.873.641/0001-21" },
    { username: "lucas", password: "688551", cnpj: "57.135.668/0001-63" }
  ]
};
