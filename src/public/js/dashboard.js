// ========================================
// SHOPEE MANAGER DASHBOARD - VERSÃƒO CORRIGIDA FINAL
// ========================================

// Definir API_BASE
const API_BASE =
  'https://shopee-manager-9pdwpmws9-raphaels-projects-11cd9f6b.vercel.app';
console.log('ðŸ”— API_BASE definida como:', API_BASE);

// VariÃ¡veis globais
let currentBenchmarkType = 'category';
let benchmarkData = null;
let positioningChart = null;

// ========================================
// INICIALIZAÃ‡ÃƒO
// ========================================
document.addEventListener('DOMContentLoaded', function () {
  console.log('âœ… Dashboard carregando...');

  // Aguardar um pouco para garantir que tudo carregou
  setTimeout(() => {
    initializeEventListeners();
    loadDashboardData();
    console.log('ðŸš€ Dashboard totalmente carregado!');
  }, 500);
});

// ========================================
// INICIALIZAR EVENT LISTENERS
// ========================================
function initializeEventListeners() {
  console.log('ðŸ”§ Inicializando event listeners...');

  // ===== NAVEGAÃ‡ÃƒO DE ABAS =====
  const tabButtons = document.querySelectorAll('.tab-btn');
  console.log('ðŸ“‹ Encontradas', tabButtons.length, 'abas');

  tabButtons.forEach((button, index) => {
    const tabName = button.getAttribute('data-tab');
    console.log(`   Aba ${index + 1}: ${tabName}`);

    button.addEventListener('click', function (e) {
      e.preventDefault();
      console.log('ðŸ–±ï¸ Clique na aba:', tabName);
      showTab(tabName);
    });
  });

  // ===== BOTÃƒO DE BENCHMARKING =====
  const runBenchmarkBtn = document.getElementById('run-benchmark-btn');
  if (runBenchmarkBtn) {
    runBenchmarkBtn.addEventListener('click', function (e) {
      e.preventDefault();
      console.log('ðŸ–±ï¸ Clique no botÃ£o de benchmarking');
      runBenchmarkAnalysis();
    });
    console.log('âœ… BotÃ£o de benchmarking configurado');
  } else {
    console.log('âŒ BotÃ£o de benchmarking nÃ£o encontrado');
  }

  // ===== SELECT DE TIPO DE BENCHMARKING =====
  const benchmarkTypeSelect = document.getElementById('benchmark-type');
  if (benchmarkTypeSelect) {
    benchmarkTypeSelect.addEventListener('change', function (e) {
      console.log('ðŸ”„ Tipo de benchmarking alterado para:', e.target.value);
      updateBenchmarkType();
    });
    console.log('âœ… Select de tipo de benchmarking configurado');
  }

  // ===== OUTROS BOTÃ•ES =====
  const syncBtn = document.getElementById('sync-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', function (e) {
      e.preventDefault();
      syncProducts();
    });
    console.log('âœ… BotÃ£o de sincronizaÃ§Ã£o configurado');
  }

  const newProductBtn = document.getElementById('new-product-btn');
  if (newProductBtn) {
    newProductBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openProductModal();
    });
    console.log('âœ… BotÃ£o de novo produto configurado');
  }

  // ===== MODAL =====
  const closeModal = document.getElementById('close-modal');
  if (closeModal) {
    closeModal.addEventListener('click', function (e) {
      e.preventDefault();
      closeProductModal();
    });
  }

  const cancelModal = document.getElementById('cancel-modal');
  if (cancelModal) {
    cancelModal.addEventListener('click', function (e) {
      e.preventDefault();
      closeProductModal();
    });
  }

  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', function (e) {
      e.preventDefault();
      saveProduct(e);
    });
  }

  console.log('âœ… Todos os event listeners configurados!');
}

// ========================================
// NAVEGAÃ‡ÃƒO DE ABAS
// ========================================
function showTab(tabName) {
  console.log('ðŸ“‚ Mostrando aba:', tabName);

  // Remover active de todas as abas
  const tabContents = document.querySelectorAll('.tab-content');
  const tabButtons = document.querySelectorAll('.tab-btn');

  tabContents.forEach(content => content.classList.remove('active'));
  tabButtons.forEach(button => button.classList.remove('active'));

  // Ativar aba selecionada
  const activeTab = document.getElementById(tabName);
  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);

  if (activeTab) {
    activeTab.classList.add('active');
    console.log('âœ… Aba ativada:', tabName);
  } else {
    console.log('âŒ Aba nÃ£o encontrada:', tabName);
  }

  if (activeButton) {
    activeButton.classList.add('active');
  }

  // Carregar dados especÃ­ficos da aba
  switch (tabName) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'products':
      loadProducts();
      break;
    case 'benchmarking':
      updateBenchmarkType();
      break;
    case 'notifications':
      refreshAlerts();
      break;
    case 'shopee':
      checkShopeeStatus();
      break;
  }
}

// ========================================
// BENCHMARKING FUNCTIONS
// ========================================
function updateBenchmarkType() {
  const typeSelect = document.getElementById('benchmark-type');
  if (!typeSelect) {
    console.log('âŒ Select de tipo nÃ£o encontrado');
    return;
  }

  const type = typeSelect.value;
  currentBenchmarkType = type;

  console.log('ðŸ”„ Tipo de benchmarking alterado para:', type);

  // Mostrar/esconder filtros
  const categoryFilter = document.getElementById('category-filter');
  const productFilter = document.getElementById('product-filter');
  const trendsFilter = document.getElementById('trends-filter');

  if (categoryFilter)
    categoryFilter.style.display = type === 'category' ? 'flex' : 'none';
  if (productFilter)
    productFilter.style.display = type === 'product' ? 'flex' : 'none';
  if (trendsFilter)
    trendsFilter.style.display = type === 'trends' ? 'flex' : 'none';

  // Carregar produtos se necessÃ¡rio
  if (type === 'product') {
    loadProductsForBenchmark();
  }

  // Limpar resultados
  clearBenchmarkResults();
}

async function runBenchmarkAnalysis() {
  console.log('ðŸŽ¯ Executando anÃ¡lise de benchmarking...');

  const type = currentBenchmarkType;
  let url = '';
  let params = new URLSearchParams();

  // Construir URL baseada no tipo
  switch (type) {
    case 'category':
      url = `${API_BASE}/benchmarking/category`;
      const categorySelect = document.getElementById('category-select');
      const category = categorySelect
        ? categorySelect.value || 'mÃ³veis e estofados'
        : 'mÃ³veis e estofados';
      if (category) params.append('category', category);
      break;

    case 'product':
      const productSelect = document.getElementById('product-select');
      const productId = productSelect ? productSelect.value || '123' : '123';
      url = `${API_BASE}/benchmarking/product/${productId}`;
      params.append('name', 'sofÃ¡ 3 lugares');
      params.append('price', '599.90');
      break;

    case 'trends':
      url = `${API_BASE}/benchmarking/trends`;
      const periodSelect = document.getElementById('period-select');
      const period = periodSelect ? periodSelect.value : '30';
      params.append('period_days', period);
      params.append('category', 'mÃ³veis e estofados');
      break;
  }

  // Adicionar parÃ¢metros Ã  URL
  if (params.toString()) {
    url += '?' + params.toString();
  }

  console.log('ðŸ”— URL da requisiÃ§Ã£o:', url);

  // Mostrar loading
  showBenchmarkLoading();

  try {
    showNotification(
      'ðŸ” Coletando dados em tempo real da Shopee...',
      'success'
    );

    const response = await fetch(url);
    const data = await response.json();

    console.log('ðŸ“Š Resposta recebida:', data);

    if (data.success) {
      benchmarkData = data.data;
      displayBenchmarkResults(type, data.data);
      showNotification('âœ… ' + data.message, 'success');
    } else {
      showNotification(
        'âŒ ' + (data.message || 'Erro na anÃ¡lise de benchmarking'),
        'error'
      );
      clearBenchmarkResults();
    }
  } catch (error) {
    console.error('âŒ Erro na anÃ¡lise de benchmarking:', error);
    showNotification(
      'âŒ Erro ao conectar com o serviÃ§o. Tente novamente.',
      'error'
    );
    clearBenchmarkResults();
  }
}

function showBenchmarkLoading() {
  const resultsContainer = document.getElementById('benchmark-results');
  if (resultsContainer) {
    resultsContainer.innerHTML = `
            <div class="benchmark-loading" style="text-align: center; padding: 60px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(238, 77, 45, 0.1); margin: 20px 0;">
                <div style="width: 80px; height: 80px; margin: 0 auto 25px; background: linear-gradient(135deg, #ee4d2d 0%, #ff6b35 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;">
                    <i class="fas fa-chart-bar" style="color: white; font-size: 2rem;"></i>
                </div>
                <h3 style="color: #2d3748; margin-bottom: 12px; font-size: 1.5rem; font-weight: 700;">Analisando dados da Shopee...</h3>
                <p style="color: #64748b; margin-bottom: 25px; font-size: 1.1rem;">Processando informaÃ§Ãµes de mercado e concorrÃªncia em tempo real</p>
                <div style="margin-top: 25px;">
                    <div style="width: 250px; height: 6px; background: #e2e8f0; border-radius: 3px; margin: 0 auto; overflow: hidden;">
                        <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #ee4d2d, #ff6b35); animation: loading 2s infinite; border-radius: 3px;"></div>
                    </div>
                    <p style="color: #64748b; font-size: 0.9rem; margin-top: 15px; font-style: italic;">Coletando dados de categoria...</p>
                </div>
            </div>
        `;

    const cardsContainer = document.getElementById('benchmark-cards');
    if (cardsContainer) {
      cardsContainer.style.display = 'none';
    }
  }
}

function clearBenchmarkResults() {
  const resultsContainer = document.getElementById('benchmark-results');
  if (resultsContainer) {
    resultsContainer.innerHTML = `
            <div class="benchmark-welcome" style="text-align: center; padding: 60px 40px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(238, 77, 45, 0.1); margin: 20px 0;">
                <div class="welcome-icon" style="width: 80px; height: 80px; margin: 0 auto 25px; background: linear-gradient(135deg, #ee4d2d 0%, #ff6b35 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;">
                    <i class="fas fa-chart-bar" style="color: white; font-size: 2rem;"></i>
                </div>
                <h3 style="color: #2d3748; margin-bottom: 12px; font-size: 1.5rem; font-weight: 700;">AnÃ¡lise Competitiva Inteligente</h3>
                <p style="color: #64748b; margin-bottom: 30px; font-size: 1.1rem;">Selecione o tipo de anÃ¡lise e clique em "Analisar" para comeÃ§ar</p>
                <div class="benchmark-features" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 30px;">
                    <div class="feature-item" style="display: flex; align-items: center; gap: 12px; padding: 15px; background: rgba(238, 77, 45, 0.05); border-radius: 10px; color: #2d3748; font-weight: 500;">
                        <i class="fas fa-target" style="color: #ee4d2d; font-size: 1.2rem;"></i>
                        <span>Posicionamento Competitivo</span>
                    </div>
                    <div class="feature-item" style="display: flex; align-items: center; gap: 12px; padding: 15px; background: rgba(238, 77, 45, 0.05); border-radius: 10px; color: #2d3748; font-weight: 500;">
                        <i class="fas fa-chart-line" style="color: #ee4d2d; font-size: 1.2rem;"></i>
                        <span>AnÃ¡lise de TendÃªncias</span>
                    </div>
                    <div class="feature-item" style="display: flex; align-items: center; gap: 12px; padding: 15px; background: rgba(238, 77, 45, 0.05); border-radius: 10px; color: #2d3748; font-weight: 500;">
                        <i class="fas fa-lightbulb" style="color: #ee4d2d; font-size: 1.2rem;"></i>
                        <span>Oportunidades de Mercado</span>
                    </div>
                    <div class="feature-item" style="display: flex; align-items: center; gap: 12px; padding: 15px; background: rgba(238, 77, 45, 0.05); border-radius: 10px; color: #2d3748; font-weight: 500;">
                        <i class="fas fa-shield-alt" style="color: #ee4d2d; font-size: 1.2rem;"></i>
                        <span>IdentificaÃ§Ã£o de AmeaÃ§as</span>
                    </div>
                </div>
            </div>
        `;
  }

  const cardsContainer = document.getElementById('benchmark-cards');
  if (cardsContainer) {
    cardsContainer.style.display = 'none';
  }

  benchmarkData = null;

  if (positioningChart) {
    positioningChart.destroy();
    positioningChart = null;
  }
}

function displayBenchmarkResults(type, data) {
  const resultsContainer = document.getElementById('benchmark-results');
  const cardsContainer = document.getElementById('benchmark-cards');

  if (resultsContainer) resultsContainer.style.display = 'none';
  if (cardsContainer) {
    cardsContainer.style.display = 'grid';
    cardsContainer.classList.add('fade-in-benchmark');

    // ForÃ§ar fundo branco nos cards
    setTimeout(() => {
      const allCards = document.querySelectorAll('.benchmark-card');
      allCards.forEach(card => {
        card.style.background = 'white';
        const content = card.querySelector('.card-content');
        if (content) {
          content.style.background = 'white';
        }
      });
    }, 100);
  }

  displayCategoryBenchmark(data);

  setTimeout(() => {
    createPositioningChart(type, data);

    // Garantir fundo branco apÃ³s criar grÃ¡fico
    setTimeout(() => {
      const chartCard = document.querySelector(
        '.positioning-chart .card-content'
      );
      if (chartCard) {
        chartCard.style.background = 'white';
      }
    }, 200);
  }, 100);
}

function displayCategoryBenchmark(data) {
  const category = Object.keys(data.category_benchmarks)[0];
  const categoryData = data.category_benchmarks[category];

  // Resumo Executivo
  const summaryContent = document.getElementById('executive-summary-content');
  if (summaryContent) {
    summaryContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h4 style="color: #ee4d2d; margin-bottom: 10px;">ðŸª‘ ${category}</h4>
                <p style="color: #64748b; font-size: 0.9rem;">AnÃ¡lise Competitiva da Shopee</p>
            </div>
            <div class="benchmark-metric">
                <span class="metric-label">Total de Produtos Analisados</span>
                <span class="metric-value">${categoryData.category_overview.total_products}</span>
            </div>
            <div class="benchmark-metric">
                <span class="metric-label">Faixa de PreÃ§os</span>
                <span class="metric-value">${formatCurrency(categoryData.category_overview.price_range.min)} - ${formatCurrency(categoryData.category_overview.price_range.max)}</span>
            </div>
            <div class="benchmark-metric">
                <span class="metric-label">PreÃ§o MÃ©dio do Mercado</span>
                <span class="metric-value">${formatCurrency(categoryData.category_overview.price_range.avg)}</span>
            </div>
            <div class="benchmark-metric">
                <span class="metric-label">Data da AnÃ¡lise</span>
                <span class="metric-value">${new Date(data.benchmark_summary.analysis_date).toLocaleDateString('pt-BR')}</span>
            </div>
        `;
  }

  // AnÃ¡lise de PreÃ§os
  const priceContent = document.getElementById('price-analysis-content');
  if (priceContent) {
    priceContent.innerHTML = `
            <h4 style="color: #ee4d2d; margin-bottom: 15px;">ðŸ’° DistribuiÃ§Ã£o de PreÃ§os</h4>
            <div class="benchmark-metric">
                <span class="metric-label">PreÃ§o MÃ­nimo</span>
                <span class="metric-value">${formatCurrency(categoryData.category_overview.price_range.min)}</span>
            </div>
            <div class="benchmark-metric">
                <span class="metric-label">PreÃ§o MÃ©dio</span>
                <span class="metric-value">${formatCurrency(categoryData.category_overview.price_range.avg)}</span>
            </div>
            <div class="benchmark-metric">
                <span class="metric-label">PreÃ§o MÃ¡ximo</span>
                <span class="metric-value">${formatCurrency(categoryData.category_overview.price_range.max)}</span>
            </div>
            <div class="benchmark-metric">
                <span class="metric-label">Mediana</span>
                <span class="metric-value">${formatCurrency(categoryData.category_overview.price_range.median)}</span>
            </div>
        `;
  }

  // Competidores
  const competitorsContent = document.getElementById('competitors-content');
  if (competitorsContent && categoryData.competitive_analysis.top_performers) {
    competitorsContent.innerHTML = `
            <div class="competitor-list">
                ${categoryData.competitive_analysis.top_performers
                  .map(
                    (competitor, index) => `
                    <div class="competitor-item">
                        <div class="competitor-info">
                            <div class="competitor-name">
                                ${index === 0 ? 'ðŸ†' : index === 1 ? 'ðŸ¥ˆ' : index === 2 ? 'ðŸ¥‰' : 'ðŸ“Š'} 
                                ${competitor.name}
                            </div>
                            <div class="competitor-details">
                                <strong>${competitor.category}</strong> â€¢ ${formatCurrency(competitor.price)} â€¢ ${competitor.sold_count} vendas â€¢ â­ ${competitor.rating.toFixed(1)}
                            </div>
                        </div>
                        <div class="competitor-score">
                            <div class="score-value">${competitor.performance_score}</div>
                            <div class="score-label">Score</div>
                        </div>
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  }

  // RecomendaÃ§Ãµes
  const recommendationsContent = document.getElementById(
    'recommendations-content'
  );
  if (recommendationsContent && categoryData.recommendations) {
    recommendationsContent.innerHTML = `
            <div class="recommendation-list">
                ${categoryData.recommendations
                  .map(
                    rec => `
                    <div class="recommendation-item priority-${rec.priority}">
                        <div class="recommendation-header">
                            <div class="recommendation-title">
                                <i class="fas fa-lightbulb"></i>
                                ${rec.title}
                            </div>
                            <span class="recommendation-priority ${rec.priority}">${rec.priority}</span>
                        </div>
                        <div class="recommendation-description">${rec.description}</div>
                        <div class="recommendation-action"><strong>AÃ§Ã£o:</strong> ${rec.action}</div>
                        ${rec.expected_impact ? `<div class="recommendation-impact" style="margin-top: 8px; font-style: italic; color: #48bb78;"><strong>Impacto esperado:</strong> ${rec.expected_impact}</div>` : ''}
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  }

  // Oportunidades
  const opportunitiesContent = document.getElementById('opportunities-content');
  if (opportunitiesContent) {
    opportunitiesContent.innerHTML = `
            <div class="opportunity-list">
                <div class="opportunity-item">
                    <div class="opportunity-title">
                        <i class="fas fa-chart-line"></i>
                        Crescimento de Mercado
                    </div>
                    <div class="opportunity-description">
                        Categoria em expansÃ£o com potencial de crescimento baseado em dados reais da Shopee.
                    </div>
                </div>
                <div class="opportunity-item">
                    <div class="opportunity-title">
                        <i class="fas fa-target"></i>
                        Posicionamento Competitivo
                    </div>
                    <div class="opportunity-description">
                        Identificadas oportunidades de posicionamento em faixas de preÃ§o com menor concorrÃªncia.
                    </div>
                </div>
                <div class="opportunity-item">
                    <div class="opportunity-title">
                        <i class="fas fa-rocket"></i>
                        InovaÃ§Ã£o de Produtos
                    </div>
                    <div class="opportunity-description">
                        EspaÃ§o para produtos inovadores que atendam necessidades nÃ£o cobertas pelo mercado atual.
                    </div>
                </div>
            </div>
        `;
  }
}

function createPositioningChart(type, data) {
  const canvas = document.getElementById('positioningChart');
  if (!canvas || typeof Chart === 'undefined') {
    console.log('âŒ Canvas ou Chart.js nÃ£o disponÃ­vel');
    return;
  }

  const ctx = canvas.getContext('2d');

  if (positioningChart) {
    positioningChart.destroy();
  }

  const category = Object.keys(data.category_benchmarks)[0];
  const categoryData = data.category_benchmarks[category];

  if (!categoryData || !categoryData.competitive_analysis.top_performers) {
    console.log('âŒ Dados insuficientes para o grÃ¡fico');
    return;
  }

  const chartData = categoryData.competitive_analysis.top_performers.map(
    product => ({
      x: product.price,
      y: product.performance_score,
      label: product.name,
    })
  );

  positioningChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Produtos',
          data: chartData,
          backgroundColor: '#ee4d2d',
          borderColor: '#ee4d2d',
          pointRadius: 8,
          pointHoverRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `ðŸª‘ Mapa Competitivo - ${category}`,
          font: {
            size: 16,
            weight: 'bold',
          },
          color: '#2d3748',
        },
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const point = context.raw;
              return `${point.label}: ${formatCurrency(point.x)} | Score: ${point.y}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'PreÃ§o (R$)',
            font: {
              weight: 'bold',
            },
          },
          ticks: {
            callback: function (value) {
              return formatCurrency(value);
            },
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Score de Performance',
            font: {
              weight: 'bold',
            },
          },
        },
      },
    },
  });
}

// ========================================
// FUNÃ‡Ã•ES AUXILIARES
// ========================================

function showNotification(message, type) {
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    document.body.appendChild(notification);
  }

  const colors = {
    success: { bg: '#48bb78', border: '#38a169' },
    error: { bg: '#e53e3e', border: '#c53030' },
    warning: { bg: '#ed8936', border: '#dd6b20' },
  };

  const color = colors[type] || colors.success;

  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        border-left: 4px solid ${color.border};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 500;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;

  notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        </div>
    `;

  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (notification && notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 4000);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// ========================================
// FUNÃ‡Ã•ES PLACEHOLDER
// ========================================

function loadDashboardData() {
  console.log('ðŸ“Š Carregando dados do dashboard...');
}

function loadProducts() {
  console.log('ðŸ“¦ Carregando produtos...');
}

function loadProductsForBenchmark() {
  console.log('ðŸ” Carregando produtos para benchmarking...');
}

function syncProducts() {
  console.log('ðŸ”„ Sincronizando produtos...');
  showNotification('SincronizaÃ§Ã£o iniciada!', 'success');
}

function openProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.style.display = 'block';
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.style.display = 'none';
}

function saveProduct(event) {
  event.preventDefault();
  console.log('ðŸ’¾ Salvando produto...');
  showNotification('Produto salvo com sucesso!', 'success');
  closeProductModal();
}

function refreshAlerts() {
  console.log('ðŸ”” Atualizando alertas...');
  showNotification('Alertas atualizados!', 'success');
}

function checkShopeeStatus() {
  console.log('ðŸ”— Verificando status Shopee...');
}

// ========================================
// ADICIONAR ESTILOS CSS
// ========================================
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    @keyframes loading {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .fade-in-benchmark {
        animation: fadeInBenchmark 0.8s ease;
    }
    
    @keyframes fadeInBenchmark {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .benchmark-metric {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .metric-label {
        color: #64748b;
        font-weight: 500;
    }
    
    .metric-value {
        color: #2d3748;
        font-weight: 600;
    }
    
    .competitor-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .competitor-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: rgba(238, 77, 45, 0.05);
        border-radius: 8px;
        border-left: 4px solid #ee4d2d;
    }
    
    .competitor-info {
        flex: 1;
    }
    
    .competitor-name {
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
    }
    
    .competitor-details {
        font-size: 0.9rem;
        color: #64748b;
    }
    
    .competitor-score {
        text-align: center;
        min-width: 60px;
    }
    
    .score-value {
        font-size: 1.2rem;
        font-weight: 700;
        color: #ee4d2d;
    }
    
    .score-label {
        font-size: 0.8rem;
        color: #64748b;
    }
    
    .recommendation-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    
    .recommendation-item {
        padding: 15px;
        border-radius: 10px;
        border-left: 4px solid;
    }
    
    .recommendation-item.priority-alta {
        background: rgba(239, 68, 68, 0.05);
        border-left-color: #ef4444;
    }
    
    .recommendation-item.priority-media {
        background: rgba(245, 158, 11, 0.05);
        border-left-color: #f59e0b;
    }
    
    .recommendation-item.priority-baixa {
        background: rgba(34, 197, 94, 0.05);
        border-left-color: #22c55e;
    }
    
    .recommendation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .recommendation-title {
        font-weight: 600;
        color: #2d3748;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .recommendation-priority {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .recommendation-priority.alta {
        background: #ef4444;
        color: white;
    }
    
    .recommendation-priority.media {
        background: #f59e0b;
        color: white;
    }
    
    .recommendation-priority.baixa {
        background: #22c55e;
        color: white;
    }
    
    .recommendation-description {
        color: #64748b;
        margin-bottom: 8px;
        line-height: 1.5;
    }
    
    .recommendation-action {
        color: #2d3748;
        font-weight: 500;
    }
    
    .opportunity-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .opportunity-item {
        padding: 12px;
        background: rgba(72, 187, 120, 0.05);
        border-radius: 8px;
        border-left: 4px solid #48bb78;
    }
    
    .opportunity-title {
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .opportunity-description {
        color: #64748b;
        line-height: 1.5;
    }
`;
document.head.appendChild(style);

console.log('âœ… Sistema de Benchmarking totalmente carregado e funcional!');

// ========================================
// INTEGRAÇÃO SHOPEE REAL-TIME
// ========================================

// Carregar status da Shopee
async function loadShopeeStatus() {
  try {
    showLoading('shopee-status');

    const response = await fetch('/api/shopee/status');
    const data = await response.json();

    const statusContainer = document.getElementById('shopee-status');

    if (data.success) {
      statusContainer.innerHTML = `
        <div class="status-card ${data.status === 'configured' ? 'connected' : 'disconnected'}">
          <div class="status-header">
            <h3><i class="fas fa-link"></i> Status da Integração</h3>
            <span class="status-badge ${data.status}">${data.status === 'configured' ? 'Configurado' : 'Não Configurado'}</span>
          </div>
          <div class="status-details">
            <p><strong>Ambiente:</strong> ${data.environment}</p>
            <p><strong>Partner ID:</strong> ${data.partner_id}</p>
            <div class="features">
              <h4>Recursos Disponíveis:</h4>
              <ul>
                <li class="${data.features.official_api ? 'enabled' : 'disabled'}">
                  <i class="fas ${data.features.official_api ? 'fa-check' : 'fa-times'}"></i>
                  API Oficial
                </li>
                <li class="${data.features.real_time_scraping ? 'enabled' : 'disabled'}">
                  <i class="fas ${data.features.real_time_scraping ? 'fa-check' : 'fa-times'}"></i>
                  Análise em Tempo Real
                </li>
                <li class="${data.features.price_analysis ? 'enabled' : 'disabled'}">
                  <i class="fas ${data.features.price_analysis ? 'fa-check' : 'fa-times'}"></i>
                  Análise de Preços
                </li>
                <li class="${data.features.competitor_analysis ? 'enabled' : 'disabled'}">
                  <i class="fas ${data.features.competitor_analysis ? 'fa-check' : 'fa-times'}"></i>
                  Análise Competitiva
                </li>
              </ul>
            </div>
            ${
              data.status !== 'configured'
                ? `
              <div class="setup-actions">
                <button class="btn btn-primary" onclick="setupShopeeIntegration()">
                  <i class="fas fa-cog"></i> Configurar Integração
                </button>
              </div>
            `
                : `
              <div class="integration-actions">
                <button class="btn btn-success" onclick="testShopeeConnection()">
                  <i class="fas fa-play"></i> Testar Conexão
                </button>
                <button class="btn btn-primary" onclick="runShopeeAnalysis()">
                  <i class="fas fa-chart-bar"></i> Executar Análise
                </button>
              </div>
            `
            }
          </div>
        </div>
      `;
    } else {
      statusContainer.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erro ao carregar status: ${data.message}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Erro ao carregar status da Shopee:', error);
    document.getElementById('shopee-status').innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Erro de conexão: ${error.message}</p>
      </div>
    `;
  }
}

// Executar análise da Shopee
async function runShopeeAnalysis() {
  try {
    showNotification('Iniciando análise da Shopee...', 'info');

    const category =
      document.getElementById('category-select')?.value || 'móveis e estofados';

    // Buscar produtos
    const productsResponse = await fetch(
      `/api/shopee/products/search?category=${encodeURIComponent(category)}&limit=20`
    );
    const productsData = await productsResponse.json();

    if (productsData.success) {
      displayShopeeProducts(productsData.products);
      showNotification(
        `${productsData.products_found} produtos encontrados!`,
        'success'
      );
    }

    // Análise de preços
    const priceResponse = await fetch(
      `/api/shopee/analysis/prices?category=${encodeURIComponent(category)}`
    );
    const priceData = await priceResponse.json();

    if (priceData.success) {
      displayPriceAnalysis(priceData.analysis);
      showNotification('Análise de preços concluída!', 'success');
    }
  } catch (error) {
    console.error('Erro na análise:', error);
    showNotification('Erro na análise da Shopee', 'error');
  }
}

// Exibir produtos da Shopee
function displayShopeeProducts(products) {
  const container =
    document.getElementById('shopee-products') ||
    createShopeeProductsContainer();

  container.innerHTML = `
    <h3><i class="fas fa-box"></i> Produtos da Shopee (${products.length})</h3>
    <div class="products-grid">
      ${products
        .slice(0, 12)
        .map(
          product => `
        <div class="product-card">
          <div class="product-image">
            <img src="${product.image || '/images/no-image.png'}" alt="${product.name}" onerror="this.src='/images/no-image.png'">
          </div>
          <div class="product-info">
            <h4>${product.name.substring(0, 50)}...</h4>
            <div class="product-stats">
              <span class="price">R$ ${product.price.toFixed(2)}</span>
              <span class="sold">${product.sold_count} vendidos</span>
              <span class="rating">⭐ ${product.rating}</span>
            </div>
            <div class="performance-score">
              Score: ${product.performance_score}/100
            </div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

// Exibir análise de preços
function displayPriceAnalysis(analysis) {
  const container =
    document.getElementById('price-analysis-results') ||
    createPriceAnalysisContainer();

  const stats = analysis.price_statistics;

  container.innerHTML = `
    <h3><i class="fas fa-chart-line"></i> Análise de Preços - ${analysis.category}</h3>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h4>Preço Médio</h4>
        <span class="stat-value">R$ ${stats.average.toFixed(2)}</span>
      </div>
      <div class="stat-card">
        <h4>Faixa de Preços</h4>
        <span class="stat-value">R$ ${stats.min.toFixed(2)} - R$ ${stats.max.toFixed(2)}</span>
      </div>
      <div class="stat-card">
        <h4>Mediana</h4>
        <span class="stat-value">R$ ${stats.median.toFixed(2)}</span>
      </div>
      <div class="stat-card">
        <h4>Produtos Analisados</h4>
        <span class="stat-value">${analysis.total_products}</span>
      </div>
    </div>
    
    <div class="recommendations">
      <h4><i class="fas fa-lightbulb"></i> Recomendações</h4>
      ${analysis.recommendations
        .map(
          rec => `
        <div class="recommendation ${rec.priority}">
          <h5>${rec.title}</h5>
          <p>${rec.description}</p>
          <small><strong>Ação:</strong> ${rec.action}</small>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

// Criar containers se não existirem
function createShopeeProductsContainer() {
  const container = document.createElement('div');
  container.id = 'shopee-products';
  container.className = 'shopee-section';
  document.getElementById('benchmarking').appendChild(container);
  return container;
}

function createPriceAnalysisContainer() {
  const container = document.createElement('div');
  container.id = 'price-analysis-results';
  container.className = 'analysis-section';
  document.getElementById('benchmarking').appendChild(container);
  return container;
}

// Configurar integração
function setupShopeeIntegration() {
  showNotification(
    'Para configurar a integração, adicione as variáveis de ambiente no Vercel',
    'info'
  );
  // Aqui você pode adicionar um modal com instruções
}

// Testar conexão
async function testShopeeConnection() {
  try {
    showNotification('Testando conexão...', 'info');

    const response = await fetch(
      '/api/shopee/products/search?category=teste&limit=1'
    );
    const data = await response.json();

    if (data.success) {
      showNotification('Conexão com Shopee funcionando!', 'success');
    } else {
      showNotification('Erro na conexão: ' + data.message, 'error');
    }
  } catch (error) {
    showNotification('Erro de conexão: ' + error.message, 'error');
  }
}

// Carregar status ao abrir aba Shopee
document.addEventListener('DOMContentLoaded', () => {
  // Carregar status quando a aba Shopee for clicada
  const shopeeTab = document.querySelector('[data-tab="shopee"]');
  if (shopeeTab) {
    shopeeTab.addEventListener('click', () => {
      setTimeout(loadShopeeStatus, 100);
    });
  }

  // Carregar automaticamente se já estiver na aba Shopee
  if (document.getElementById('shopee')?.classList.contains('active')) {
    loadShopeeStatus();
  }
});
