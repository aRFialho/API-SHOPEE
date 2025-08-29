// ========================================
// SHOPEE MANAGER - Dashboard JavaScript
// ========================================

// Configuração da API
const API_BASE = window.location.origin;

// Estado global
let currentTab = 'dashboard';
let products = [];
let dashboardData = {};

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function () {
  loadDashboard();
  loadProducts();
  loadAlerts();
  checkShopeeStatus();
});

// ========================================
// NAVEGAÇÃO DE TABS
// ========================================
function showTab(tabName) {
  // Esconder todas as tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remover active de todos os botões
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Mostrar tab selecionada
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');

  currentTab = tabName;

  // Carregar dados específicos da tab
  switch (tabName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'products':
      loadProducts();
      break;
    case 'ai':
      // IA tab não precisa carregar automaticamente
      break;
    case 'notifications':
      loadAlerts();
      break;
    case 'shopee':
      checkShopeeStatus();
      break;
  }
}

// ========================================
// DASHBOARD
// ========================================
async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/analytics/dashboard`);
    const data = await response.json();

    if (data.success) {
      dashboardData = data.data;
      updateDashboardStats();
      updateTopProducts();
      updateLowStockProducts();
    }
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    showNotification('Erro ao carregar dashboard', 'error');
  }
}

function updateDashboardStats() {
  document.getElementById('total-products').textContent =
    dashboardData.products?.total || 0;
  document.getElementById('active-products').textContent =
    dashboardData.products?.active || 0;
  document.getElementById('low-stock').textContent =
    dashboardData.products?.low_stock || 0;
  document.getElementById('stock-value').textContent = formatCurrency(
    dashboardData.stock_value || 0
  );
}

function updateTopProducts() {
  const container = document.getElementById('top-products');
  const topProducts = dashboardData.top_products || [];

  if (topProducts.length === 0) {
    container.innerHTML =
      '<div class="loading">Nenhum produto encontrado</div>';
    return;
  }

  container.innerHTML = topProducts
    .map(
      product => `
        <div class="list-item">
            <div>
                <strong>${product.name}</strong><br>
                <small>Vendas: ${product.sales_count} | Estoque: ${product.stock_quantity}</small>
            </div>
            <div>
                <strong>${formatCurrency(product.price)}</strong>
            </div>
        </div>
    `
    )
    .join('');
}

function updateLowStockProducts() {
  const container = document.getElementById('low-stock-products');
  const lowStockProducts = dashboardData.low_stock_products || [];

  if (lowStockProducts.length === 0) {
    container.innerHTML =
      '<div class="loading">Nenhum produto com estoque baixo</div>';
    return;
  }

  container.innerHTML = lowStockProducts
    .map(
      product => `
        <div class="list-item">
            <div>
                <strong>${product.name}</strong><br>
                <small>Alerta: ${product.min_stock_alert} unidades</small>
            </div>
            <div>
                <span class="badge badge-warning">${product.stock_quantity} restantes</span>
            </div>
        </div>
    `
    )
    .join('');
}

// ========================================
// PRODUTOS
// ========================================
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/api/products`);
    const data = await response.json();

    if (data.success) {
      products = data.data.products || [];
      updateProductsTable();
    }
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    showNotification('Erro ao carregar produtos', 'error');
  }
}

function updateProductsTable() {
  const container = document.getElementById('products-table');

  if (products.length === 0) {
    container.innerHTML =
      '<div class="loading">Nenhum produto encontrado</div>';
    return;
  }

  container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Categoria</th>
                    <th>Preço</th>
                    <th>Estoque</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${products
                  .map(
                    product => `
                    <tr>
                        <td><strong>${product.name}</strong></td>
                        <td>${product.category_name || 'Sem categoria'}</td>
                        <td>${formatCurrency(product.price)}</td>
                        <td>
                            <span class="${product.stock_quantity <= 5 ? 'text-danger' : ''}">${product.stock_quantity}</span>
                        </td>
                        <td>
                            <span class="badge badge-${getStatusColor(product.status)}">${getStatusText(product.status)}</span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="editProduct(${product.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    `;
}

function filterProducts() {
  const statusFilter = document.getElementById('status-filter').value;
  // Implementar filtro
  console.log('Filtrar por status:', statusFilter);
}

function searchProducts() {
  const searchTerm = document
    .getElementById('search-products')
    .value.toLowerCase();
  // Implementar busca
  console.log('Buscar:', searchTerm);
}

// ========================================
// MODAL DE PRODUTO
// ========================================
function openProductModal() {
  document.getElementById('product-modal').style.display = 'block';
  document.getElementById('product-form').reset();
}

function closeProductModal() {
  document.getElementById('product-modal').style.display = 'none';
}

async function saveProduct(event) {
  event.preventDefault();

  const formData = {
    name: document.getElementById('product-name').value,
    category_name: document.getElementById('product-category').value,
    price: parseFloat(document.getElementById('product-price').value),
    cost_price:
      parseFloat(document.getElementById('product-cost').value) || null,
    stock_quantity:
      parseInt(document.getElementById('product-stock').value) || 0,
    status: document.getElementById('product-status').value,
    description: document.getElementById('product-description').value,
  };

  try {
    const response = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      showNotification('Produto criado com sucesso!', 'success');
      closeProductModal();
      loadProducts();
      loadDashboard();
    } else {
      showNotification(data.message || 'Erro ao criar produto', 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    showNotification('Erro ao salvar produto', 'error');
  }
}

// ========================================
// INTELIGÊNCIA ARTIFICIAL
// ========================================
async function runPriceAnalysis() {
  const container = document.getElementById('price-analysis');
  container.innerHTML =
    '<div class="loading">Analisando preços com IA...</div>';

  try {
    const response = await fetch(`${API_BASE}/ai/pricing`);
    const data = await response.json();

    if (data.success) {
      const analysis = data.data;
      container.innerHTML = `
                <div class="analysis-summary">
                    <h4>Resumo da Análise</h4>
                    <p><strong>Produtos analisados:</strong> ${analysis.analysis_summary.total_products}</p>
                    <p><strong>Recomendações:</strong></p>
                    <ul>
                        <li>Aumentar preço: ${analysis.analysis_summary.recommendations.increase_price}</li>
                        <li>Reduzir preço: ${analysis.analysis_summary.recommendations.decrease_price}</li>
                        <li>Manter preço: ${analysis.analysis_summary.recommendations.maintain_price}</li>
                    </ul>
                    <p><strong>Impacto potencial na receita:</strong> ${formatCurrency(analysis.analysis_summary.potential_revenue_impact)}</p>
                </div>
                <div class="analysis-products">
                    <h4>Top Recomendações</h4>
                    ${analysis.products
                      .slice(0, 5)
                      .map(
                        product => `
                        <div class="analysis-item">
                            <strong>${product.name}</strong><br>
                            <small>Preço atual: ${formatCurrency(product.current_price)} → Sugerido: ${formatCurrency(product.suggested_price)}</small><br>
                            <small>Confiança: ${product.confidence}% | ${product.recommendation}</small>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            `;
    }
  } catch (error) {
    console.error('Erro na análise de preços:', error);
    container.innerHTML =
      '<div class="error">Erro ao executar análise de preços</div>';
  }
}

async function runDemandForecast() {
  const container = document.getElementById('demand-forecast');
  container.innerHTML = '<div class="loading">Prevendo demanda...</div>';

  try {
    const response = await fetch(`${API_BASE}/ai/demand`);
    const data = await response.json();

    if (data.success) {
      const forecast = data.data;
      container.innerHTML = `
                <div class="forecast-summary">
                    <h4>Previsão para ${forecast.prediction_period}</h4>
                    <p><strong>Produtos analisados:</strong> ${forecast.summary.total_products_analyzed}</p>
                    <p><strong>Precisam reposição:</strong> ${forecast.summary.products_needing_restock}</p>
                    <p><strong>Confiança média:</strong> ${forecast.summary.average_confidence}%</p>
                </div>
                <div class="forecast-products">
                    <h4>Produtos que Precisam Reposição</h4>
                    ${forecast.products
                      .filter(p => p.predictions.needs_restock)
                      .slice(0, 5)
                      .map(
                        product => `
                        <div class="forecast-item">
                            <strong>${product.name}</strong><br>
                            <small>Estoque atual: ${product.current_stock} | Sugerido: ${product.predictions.suggested_restock_quantity}</small><br>
                            <small>Previsão de vendas: ${product.predictions.daily_sales}/dia</small>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            `;
    }
  } catch (error) {
    console.error('Erro na previsão de demanda:', error);
    container.innerHTML =
      '<div class="error">Erro ao executar previsão de demanda</div>';
  }
}

// ========================================
// ALERTAS
// ========================================
async function loadAlerts() {
  try {
    const response = await fetch(`${API_BASE}/notifications/alerts`);
    const data = await response.json();

    if (data.success) {
      updateAlertsContainer(data.data.alerts);
    }
  } catch (error) {
    console.error('Erro ao carregar alertas:', error);
    showNotification('Erro ao carregar alertas', 'error');
  }
}

function updateAlertsContainer(alerts) {
  const container = document.getElementById('alerts-container');

  if (alerts.length === 0) {
    container.innerHTML =
      '<div class="loading">Nenhum alerta no momento 🎉</div>';
    return;
  }

  container.innerHTML = alerts
    .map(
      alert => `
        <div class="alert alert-${alert.urgency}">
            <i class="fas fa-${getAlertIcon(alert.type)}"></i>
            <div>
                <strong>${alert.message}</strong><br>
                <small>${alert.suggested_action}</small>
            </div>
        </div>
    `
    )
    .join('');
}

function refreshAlerts() {
  loadAlerts();
  showNotification('Alertas atualizados', 'success');
}

// ========================================
// SHOPEE STATUS
// ========================================
async function checkShopeeStatus() {
  try {
    const response = await fetch(`${API_BASE}/auth/status`);
    const data = await response.json();

    const container = document.getElementById('shopee-status');

    if (data.success && data.data.connected_shops > 0) {
      container.innerHTML = `
                <div class="status-connected">
                    <h3><i class="fas fa-check-circle text-success"></i> Shopee Conectada</h3>
                    <p>${data.data.connected_shops} loja(s) conectada(s)</p>
                    ${data.data.shops
                      .map(
                        shop => `
                        <div class="shop-item">
                            <strong>Loja ID: ${shop.shop_id}</strong><br>
                            <small>Status: ${shop.is_token_valid ? 'Ativo' : 'Token expirado'}</small>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            `;
    } else {
      container.innerHTML = `
                <div class="status-disconnected">
                    <h3><i class="fas fa-exclamation-circle text-warning"></i> Shopee Não Conectada</h3>
                    <p>Configure suas credenciais da Shopee para começar a sincronizar.</p>
                    <button class="btn btn-primary" onclick="connectShopee()">
                        <i class="fas fa-link"></i> Conectar Shopee
                    </button>
                </div>
            `;
    }
  } catch (error) {
    console.error('Erro ao verificar status Shopee:', error);
  }
}

async function connectShopee() {
  try {
    const response = await fetch(`${API_BASE}/auth/shopee`);
    const data = await response.json();

    if (data.success) {
      window.open(data.data.auth_url, '_blank');
      showNotification(
        'Abra a nova aba para autorizar a conexão com a Shopee',
        'info'
      );
    }
  } catch (error) {
    console.error('Erro ao conectar Shopee:', error);
    showNotification('Erro ao conectar com a Shopee', 'error');
  }
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getStatusColor(status) {
  const colors = {
    active: 'success',
    inactive: 'secondary',
    draft: 'warning',
    suspended: 'danger',
  };
  return colors[status] || 'secondary';
}

function getStatusText(status) {
  const texts = {
    active: 'Ativo',
    inactive: 'Inativo',
    draft: 'Rascunho',
    suspended: 'Suspenso',
  };
  return texts[status] || status;
}

function getAlertIcon(type) {
  const icons = {
    estoque_baixo: 'exclamation-triangle',
    sem_vendas: 'chart-line',
    preco_desatualizado: 'clock',
    token_expirando: 'key',
  };
  return icons[type] || 'bell';
}

function showNotification(message, type = 'info') {
  // Implementar sistema de notificações toast
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// ========================================
// SINCRONIZAÇÃO
// ========================================
async function syncProducts() {
  showNotification('Sincronização iniciada...', 'info');
  // Implementar quando tivermos as credenciais
  console.log('Sincronização de produtos');
}

// Fechar modal ao clicar fora
window.onclick = function (event) {
  const modal = document.getElementById('product-modal');
  if (event.target === modal) {
    closeProductModal();
  }
// ========================================
// BENCHMARKING FUNCTIONS
// ========================================

let currentBenchmarkType = 'category';
let benchmarkData = null;

// Atualizar tipo de benchmarking
function updateBenchmarkType() {
    const type = document.getElementById('benchmark-type').value;
    currentBenchmarkType = type;

    // Mostrar/esconder filtros apropriados
    document.getElementById('category-filter').style.display = type === 'category' ? 'flex' : 'none';
    document.getElementById('product-filter').style.display = type === 'product' ? 'flex' : 'none';
    document.getElementById('trends-filter').style.display = type === 'trends' ? 'flex' : 'none';

    // Carregar produtos se necessário
    if (type === 'product') {
        loadProductsForBenchmark();
    }

    // Limpar resultados
    clearBenchmarkResults();
}

// Carregar produtos para seleção
async function loadProductsForBenchmark() {
    try {
        const response = await fetch(`${API_BASE}/api/products`);
        const data = await response.json();

        const productSelect = document.getElementById('product-select');
        productSelect.innerHTML = '<option value="">Selecione um produto</option>';

        if (data.success && data.data.products) {
            data.data.products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} - ${formatCurrency(product.price)}`;
                productSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// Executar análise de benchmarking
async function runBenchmarkAnalysis() {
    const type = currentBenchmarkType;
    let url = '';
    let params = new URLSearchParams();

    // Construir URL baseada no tipo
    switch (type) {
        case 'category':
            url = `${API_BASE}/benchmarking/category`;
            const category = document.getElementById('category-select').value;
            if (category) params.append('category', category);
            break;

        case 'product':
            const productId = document.getElementById('product-select').value;
            if (!productId) {
                showNotification('Selecione um produto para análise', 'warning');
                return;
            }
            url = `${API_BASE}/benchmarking/product/${productId}`;
            break;

        case 'trends':
            url = `${API_BASE}/benchmarking/trends`;
            const period = document.getElementById('period-select').value;
            params.append('period_days', period);
            break;
    }

    // Adicionar parâmetros à URL
    if (params.toString()) {
        url += '?' + params.toString();
    }

    // Mostrar loading
    showBenchmarkLoading();

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            benchmarkData = data.data;
            displayBenchmarkResults(type, data.data);
            showNotification('Análise de benchmarking concluída!', 'success');
        } else {
            showNotification(data.message || 'Erro na análise de benchmarking', 'error');
            clearBenchmarkResults();
        }
    } catch (error) {
        console.error('Erro na análise de benchmarking:', error);
        showNotification('Erro ao executar análise de benchmarking', 'error');
        clearBenchmarkResults();
    }
}

// Mostrar loading
function showBenchmarkLoading() {
    const resultsContainer = document.getElementById('benchmark-results');
    resultsContainer.innerHTML = `
        <div class="benchmark-loading">
            <i class="fas fa-spinner"></i>
            <h3>Analisando dados competitivos...</h3>
            <p>Processando informações de mercado e concorrência</p>
        </div>
    `;

    document.getElementById('benchmark-cards').style.display = 'none';
}

// Limpar resultados
function clearBenchmarkResults() {
    document.getElementById('benchmark-results').innerHTML = `
        <div class="benchmark-welcome">
            <div class="welcome-icon">
                <i class="fas fa-chart-bar"></i>
            </div>
            <h3>Análise Competitiva Inteligente</h3>
            <p>Selecione o tipo de análise e clique em "Analisar" para começar</p>
            <div class="benchmark-features">
                <div class="feature-item">
                    <i class="fas fa-target"></i>
                    <span>Posicionamento Competitivo</span>
                </div>
                <div class="feature-item">
                    <i class="fas fa-chart-line"></i>
                    <span>Análise de Tendências</span>
                </div>
                <div class="feature-item">
                    <i class="fas fa-lightbulb"></i>
                    <span>Oportunidades de Mercado</span>
                </div>
                <div class="feature-item">
                    <i class="fas fa-shield-alt"></i>
                    <span>Identificação de Ameaças</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('benchmark-cards').style.display = 'none';
    benchmarkData = null;
}

// Exibir resultados do benchmarking
function displayBenchmarkResults(type, data) {
    // Esconder welcome e mostrar cards
    document.getElementById('benchmark-results').style.display = 'none';
    document.getElementById('benchmark-cards').style.display = 'grid';
    document.getElementById('benchmark-cards').classList.add('fade-in-benchmark');

    // Preencher conteúdo baseado no tipo
    switch (type) {
        case 'category':
            displayCategoryBenchmark(data);
            break;
        case 'product':
            displayProductBenchmark(data);
            break;
        case 'trends':
            displayTrendsBenchmark(data);
            break;
    }
}

// Exibir benchmarking por categoria
function displayCategoryBenchmark(data) {
    // Resumo Executivo
    const summaryContent = document.getElementById('executive-summary-content');
    summaryContent.innerHTML = `
        <div class="benchmark-metric">
            <span class="metric-label">Categorias Analisadas</span>
            <span class="metric-value">${data.benchmark_summary.categories_analyzed}</span>
        </div>
        <div class="benchmark-metric">
            <span class="metric-label">Total de Produtos</span>
            <span class="metric-value">${data.benchmark_summary.total_products}</span>
        </div>
        <div class="benchmark-metric">
            <span class="metric-label">Data da Análise</span>
            <span class="metric-value">${new Date(data.benchmark_summary.analysis_date).toLocaleDateString('pt-BR')}</span>
        </div>
    `;

    // Análise de Preços (primeira categoria como exemplo)
    const firstCategory = Object.keys(data.category_benchmarks)[0];
    const categoryData = data.category_benchmarks[firstCategory];

    if (categoryData) {
        const priceContent = document.getElementById('price-analysis-content');
        priceContent.innerHTML = `
            <h4>Categoria: ${firstCategory}</h4>
            <div class="benchmark-metric">
                <span class="metric-label">Preço Mínimo</span>
                <span class="metric-value">${formatCurrency(categoryData.category_overview.price_range.min)}</span>
            </div>
            <div class="benchmark-metric">
                <span class="metric-label">Preço Médio</span>
                <span class="metric-value">${formatCurrency(categoryData.category_overview.price_range.avg)}</span>
            </div>
            <div class="benchmark-metric">
                <span class="metric-label">Preço Máximo</span>
                <span class="metric-value">${formatCurrency(categoryData.category_overview.price_range.max)}</span>
            </div>
            <div class="benchmark-metric">
                <span class="metric-label">Posição no Mercado</span>
                <span class="metric-value">${getMarketPositionText(categoryData.category_overview.market_position)}</span>
            </div>
        `;

        // Competidores
        const competitorsContent = document.getElementById('competitors-content');
        if (categoryData.competitive_analysis.top_performers.length > 0) {
            competitorsContent.innerHTML = `
                <div class="competitor-list">
                    ${categoryData.competitive_analysis.top_performers.map(competitor => `
                        <div class="competitor-item">
                            <div class="competitor-info">
                                <div class="competitor-name">${competitor.name}</div>
                                <div class="competitor-details">
                                    ${formatCurrency(competitor.price)} • ${competitor.sales} vendas • ⭐ ${competitor.rating.toFixed(1)}
                                </div>
                            </div>
                            <div class="competitor-score">
                                <div class="score-value">${competitor.performance_score}</div>
                                <div class="score-label">Score</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            competitorsContent.innerHTML = '<p>Nenhum competidor encontrado nesta categoria.</p>';
        }

        // Recomendações
        const recommendationsContent = document.getElementById('recommendations-content');
        if (categoryData.recommendations && categoryData.recommendations.length > 0) {
            recommendationsContent.innerHTML = `
                <div class="recommendation-list">
                    ${categoryData.recommendations.map(rec => `
                        <div class="recommendation-item priority-${rec.priority}">
                            <div class="recommendation-header">
                                <div class="recommendation-title">
                                    <i class="fas fa-lightbulb"></i>
                                    ${rec.title}
                                </div>
                                <span class="recommendation-priority ${rec.priority}">${rec.priority}</span>
                            </div>
                            <div class="recommendation-description">${rec.description}</div>
                            <div class="recommendation-action"><strong>Ação:</strong> ${rec.action}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            recommendationsContent.innerHTML = '<p>Nenhuma recomendação específica para esta categoria.</p>';
        }
    }

    // Oportunidades (placeholder)
    const opportunitiesContent = document.getElementById('opportunities-content');
    opportunitiesContent.innerHTML = `
        <div class="opportunity-list">
            <div class="opportunity-item">
                <div class="opportunity-title">
                    <i class="fas fa-chart-line"></i>
                    Crescimento de Mercado
                </div>
                <div class="opportunity-description">
                    Categoria em expansão com potencial de crescimento de 15-20% nos próximos meses.
                </div>
            </div>
            <div class="opportunity-item">
                <div class="opportunity-title">
                    <i class="fas fa-target"></i>
                    Gap de Preços
                </div>
                <div class="opportunity-description">
                    Identificadas oportunidades de posicionamento em faixas de preço com menor concorrência.
                </div>
            </div>
        </div>
    `;
}

// Exibir benchmarking de produto
function displayProductBenchmark(data) {
    const product = data.product_analysis;

    // Resumo Executivo
    const summaryContent = document.getElementById('executive-summary-content');
    summaryContent.innerHTML = `
        <h4>${product.name}</h4>
        <div class="benchmark-metric">
            <span class="metric-label">Categoria</span>
            <span class="metric-value">${product.category}</span>
        </div>
        <div class="benchmark-metric">
            <span class="metric-label">Preço Atual</span>
            <span class="metric-value">${formatCurrency(product.current_metrics.price)}</span>
        </div>
        <div class="benchmark-metric">
            <span class="metric-label">Score de Performance</span>
            <span class="metric-value">${product.current_metrics.performance_score}/100</span>
        </div>
        <div class="benchmark-metric">
            <span class="metric-label">Taxa de Conversão</span>
            <span class="metric-value">${product.current_metrics.conversion_rate}%</span>
        </div>
    `;

    // Análise de Preços
    const priceContent = document.getElementById('price-analysis-content');
    priceContent.innerHTML = `
        <div class="benchmark-metric">
            <span class="metric-label">Preço Médio do Mercado</span>
            <span class="metric-value">${formatCurrency(data.market_context.market_statistics.avg_price)}</span>
        </div>
        <div class="benchmark-metric">
            <span class="metric-label">Posição de Preço</span>
            <span class="metric-value">${getPositionText(data.competitive_analysis.position.price_position)}</span>
        </div>
        <div class="benchmark-metric">
            <span class="metric-label">Posição de Performance</span>
            <span class="metric-value">${getPositionText(data.competitive_analysis.position.performance_position)}</span>
        </div>
        <div class="benchmark-metric">
            <span class="metric-label">Concorrentes Encontrados</span>
            <span class="metric-value">${data.market_context.competitors_found}</span>
        </div>
    `;

    // Competidores Diretos
    const competitorsContent = document.getElementById('competitors-content');
    if (data.competitive_analysis.direct_competitors.length > 0) {
        competitorsContent.innerHTML = `
            <div class="competitor-list">
                ${data.competitive_analysis.direct_competitors.map(competitor => `
                    <div class="competitor-item">
                        <div class="competitor-info">
                            <div class="competitor-name">${competitor.name}</div>
                            <div class="competitor-details">
                                ${formatCurrency(competitor.price)} 
                                <span class="metric-change ${competitor.price_difference > 0 ? 'positive' : competitor.price_difference < 0 ? 'negative' : 'neutral'}">
                                    ${competitor.price_difference > 0 ? '+' : ''}${competitor.price_difference}%
                                </span>
                            </div>
                        </div>
                        <div class="competitor-score">
                            <div class="score-value">${competitor.performance_score}</div>
                            <div class="score-label">Score</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        competitorsContent.innerHTML = '<p>Nenhum concorrente direto encontrado.</p>';
    }

    // Recomendações
    const recommendationsContent = document.getElementById('recommendations-content');
    if (data.recommendations && data.recommendations.length > 0) {
        recommendationsContent.innerHTML = `
            <div class="recommendation-list">
                ${data.recommendations.map(rec => `
                    <div class="recommendation-item priority-${rec.priority}">
                        <div class="recommendation-header">
                            <div class="recommendation-title">
                                <i class="fas fa-lightbulb"></i>
                                ${rec.title}
                            </div>
                            <span class="recommendation-priority ${rec.priority}">${rec.priority}</span>
                        </div>
                        <div class="recommendation-description">${rec.description}</div>
                        <div class="recommendation-action"><strong>Ação:</strong> ${rec.action}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        recommendationsContent.innerHTML = '<p>Produto com performance adequada. Continue monitorando o mercado.</p>';
    }

    // Oportunidades
    const opportunitiesContent = document.getElementById('opportunities-content');
    opportunitiesContent.innerHTML = `
        <div class="opportunity-list">
            <div class="opportunity-item">
                <div class="opportunity-title">
                    <i class="fas fa-dollar-sign"></i>
                    Otimização de Preço
                </div>
                <div class="opportunity-description">
                    Baseado na análise competitiva, há oportunidade de ajuste de preço para melhor posicionamento.
                </div>
            </div>
            <div class="opportunity-item">
                <div class="opportunity-title">
                    <i class="fas fa-star"></i>
                    Melhoria de Performance
                </div>
                <div class="opportunity-description">
                    Foque em melhorar descrição, imagens e SEO para aumentar conversão e vendas.
                </div>
            </div>
        </div>
    `;
}

// Exibir análise de tendências
function displayTrendsBenchmark(data) {
    // Resumo Executivo
    const summaryContent = document.getElementById('executive-summary-content');
    summaryContent.innerHTML = `
        <div class="benchmark-metric">
            <span class="metric-label">Período de Análise</span>
            <span class="metric-value">${data.analysis_period}</span>
        </div>
        <div class="benchmark-metric">
            <span class="metric-label">Taxa de Crescimento</span>
            <span class="metric-value metric-change ${data.overall_market_trends.market_growth.rate > 0 ? 'positive' : 'negative'}">
                ${data.overall_market_trends.market_growth.rate > 0 ? '+' : ''}${data.overall_market_trends.market_growth.rate}%
            </span>
        </div>
        <div class="benchmark-metric">
            <span class="metric-label">Intensidade Competitiva</span>
            <span class="metric-value">${data.overall_market_trends.competition_intensity.level}</span>
        </div>
    `;

    // Categorias em Crescimento
    const priceContent = document.getElementById('price-analysis-content');
    priceContent.innerHTML = `
        <h4>Categorias de Maior Crescimento</h4>
        ${data.market_insights.fastest_growing_categories.map(cat => `
            <div class="benchmark-metric">
                <span class="metric-label">${cat.category}</span>
                <span class="metric-value">${cat.sales} vendas</span>
            </div>
        `).join('')}
    `;

    // Oportunidades Emergentes
    const opportunitiesContent = document.getElementById('opportunities-content');
    opportunitiesContent.innerHTML = `
        <div class="opportunity-list">
            ${data.market_insights.emerging_opportunities.map(opp => `
                <div class="opportunity-item">
                    <div class="opportunity-title">
                        <i class="fas fa-rocket"></i>
                        Oportunidade: ${opp}
                    </div>
                    <div class="opportunity-description">
                        Tendência emergente com potencial de crescimento significativo no mercado.
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Recomendações Estratégicas
    const recommendationsContent = document.getElementById('recommendations-content');
    if (data.strategic_recommendations && data.strategic_recommendations.length > 0) {
        recommendationsContent.innerHTML = `
            <div class="recommendation-list">
                ${data.strategic_recommendations.map(rec => `
                    <div class="recommendation-item priority-${rec.priority}">
                        <div class="recommendation-header">
                            <div class="recommendation-title">
                                <i class="fas fa-chart-line"></i>
                                ${rec.title}
                            </div>
                            <span class="recommendation-priority ${rec.priority}">${rec.priority}</span>
                        </div>
                        <div class="recommendation-description">${rec.description}</div>
                        <div class="recommendation-action"><strong>Ação:</strong> ${rec.action}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Competidores (placeholder para tendências)
    const competitorsContent = document.getElementById('competitors-content');
    competitorsContent.innerHTML = `
        <h4>Análise Setorial</h4>
        <p>Mercado apresentando ${data.overall_market_trends.market_growth.trend} com intensidade competitiva ${data.overall_market_trends.competition_intensity.level}.</p>
        <p>Recomenda-se monitoramento contínuo das tendências para identificar oportunidades de crescimento.</p>
    `;
}

// Funções auxiliares
function getMarketPositionText(position) {
    const positions = {
        'abaixo_mercado': 'Abaixo do Mercado',
        'alinhado_mercado': 'Alinhado ao Mercado',
        'acima_mercado': 'Acima do Mercado'
    };
    return positions[position] || position;
}

function getPositionText(position) {
    const positions = {
        'líder': 'Líder 🏆',
        'forte': 'Forte 💪',
        'médio': 'Médio 📊',
        'fraco': 'Fraco ⚠️'
        };
    return positions[position] || position;
}

// Atualizar função showTab para incluir benchmarking
const originalShowTab = showTab;
showTab = function(tabName) {
    originalShowTab(tabName);

    // Carregar dados específicos para benchmarking
    if (tabName === 'benchmarking') {
        // Inicializar benchmarking se necessário
        updateBenchmarkType();
    }
};
