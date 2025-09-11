const express = require('express');
const router = express.Router();
const ShopeeService = require('../services/shopeeRealService');
const {
  generateAuthUrl,
  makeAuthenticatedRequest,
} = require('../config/shopee');

const shopeeService = new ShopeeService();

// ========================================
// ROTAS DE AUTENTICAÇÃO OFICIAL
// ========================================

// Gerar URL de autorização
router.get('/auth/url', (req, res) => {
  try {
    const authUrl = generateAuthUrl();
    res.json({
      success: true,
      auth_url: authUrl,
      message: 'URL de autorização gerada com sucesso',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar URL de autorização',
      error: error.message,
    });
  }
});

// Status da integração
router.get('/status', async (req, res) => {
  try {
    const hasCredentials = !!(
      process.env.SHOPEE_PARTNER_ID && process.env.SHOPEE_PARTNER_KEY
    );

    res.json({
      success: true,
      status: hasCredentials ? 'configured' : 'not_configured',
      environment: process.env.NODE_ENV || 'development',
      has_credentials: hasCredentials,
      partner_id: process.env.SHOPEE_PARTNER_ID ? '***' : 'NOT_SET',
      message: hasCredentials
        ? 'Credenciais configuradas'
        : 'Configure as credenciais da Shopee',
      features: {
        official_api: hasCredentials,
        real_time_scraping: true,
        price_analysis: true,
        competitor_analysis: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status',
      error: error.message,
    });
  }
});

// ========================================
// ROTAS DE ANÁLISE EM TEMPO REAL
// ========================================

// Buscar produtos por categoria
router.get('/products/search', async (req, res) => {
  try {
    const { category = 'móveis e estofados', limit = 20 } = req.query;

    console.log(`🔍 Buscando produtos da Shopee: ${category}`);

    const products = await shopeeService.searchProductsByCategory(
      category,
      parseInt(limit)
    );

    res.json({
      success: true,
      category,
      products_found: products.length,
      products,
      timestamp: new Date().toISOString(),
      source: 'shopee_real_time',
    });
  } catch (error) {
    console.error('❌ Erro na busca:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produtos',
      error: error.message,
    });
  }
});

// Análise de preços por categoria
router.get('/analysis/prices', async (req, res) => {
  try {
    const { category = 'móveis e estofados' } = req.query;

    console.log(`📊 Iniciando análise de preços: ${category}`);

    const analysis = await shopeeService.analyzeCategoryPrices(category);

    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na análise:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na análise de preços',
      error: error.message,
    });
  }
});

// Análise competitiva
router.post('/analysis/competition', async (req, res) => {
  try {
    const { product_name, current_price } = req.body;

    if (!product_name) {
      return res.status(400).json({
        success: false,
        message: 'Nome do produto é obrigatório',
      });
    }

    console.log(`🎯 Análise competitiva: ${product_name}`);

    const analysis = await shopeeService.analyzeProductCompetition(
      product_name,
      current_price ? parseFloat(current_price) : null
    );

    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na análise competitiva:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na análise competitiva',
      error: error.message,
    });
  }
});

// Tendências de mercado
router.get('/trends', async (req, res) => {
  try {
    const { category = 'móveis e estofados' } = req.query;

    console.log(`📈 Analisando tendências: ${category}`);

    // Buscar dados de múltiplas categorias para comparação
    const categories = ['móveis e estofados', 'sofás', 'poltronas', 'mesas'];
    const trends = {};

    for (const cat of categories) {
      try {
        const products = await shopeeService.searchProductsByCategory(cat, 15);
        trends[cat] = {
          total_products: products.length,
          avg_price:
            products.length > 0
              ? Math.round(
                  (products.reduce((sum, p) => sum + p.price, 0) /
                    products.length) *
                    100
                ) / 100
              : 0,
          avg_sales:
            products.length > 0
              ? Math.round(
                  products.reduce((sum, p) => sum + p.sold_count, 0) /
                    products.length
                )
              : 0,
          top_product: products.length > 0 ? products[0] : null,
        };

        // Delay entre categorias
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Erro na categoria ${cat}:`, error);
        trends[cat] = { error: error.message };
      }
    }

    res.json({
      success: true,
      trends,
      analysis_date: new Date().toISOString(),
      market_insights: {
        most_active_category: Object.keys(trends).reduce((a, b) =>
          (trends[a]?.avg_sales || 0) > (trends[b]?.avg_sales || 0) ? a : b
        ),
        price_leader: Object.keys(trends).reduce((a, b) =>
          (trends[a]?.avg_price || 0) > (trends[b]?.avg_price || 0) ? a : b
        ),
      },
    });
  } catch (error) {
    console.error('❌ Erro nas tendências:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao analisar tendências',
      error: error.message,
    });
  }
});

// Relatório completo
router.get('/report/complete', async (req, res) => {
  try {
    const { category = 'móveis e estofados' } = req.query;

    console.log(`📋 Gerando relatório completo: ${category}`);

    // Executar análises em paralelo
    const [products, priceAnalysis] = await Promise.all([
      shopeeService.searchProductsByCategory(category, 30),
      shopeeService.analyzeCategoryPrices(category),
    ]);

    const report = {
      category,
      generated_at: new Date().toISOString(),
      summary: {
        total_products_analyzed: products.length,
        market_position: priceAnalysis.market_position,
        avg_price: priceAnalysis.price_statistics?.average || 0,
        top_performer: priceAnalysis.top_performers?.[0] || null,
      },
      products: products.slice(0, 10), // Top 10
      price_analysis: priceAnalysis,
      recommendations: priceAnalysis.recommendations || [],
      market_opportunities: this.identifyMarketOpportunities(
        products,
        priceAnalysis
      ),
    };

    res.json({
      success: true,
      report,
      data_source: 'shopee_real_time',
    });
  } catch (error) {
    console.error('❌ Erro no relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório',
      error: error.message,
    });
  }
});

// Função auxiliar para identificar oportunidades
router.identifyMarketOpportunities = (products, analysis) => {
  const opportunities = [];

  if (analysis.price_statistics) {
    const { average, min, max } = analysis.price_statistics;

    // Oportunidade de preço
    if (max > average * 2) {
      opportunities.push({
        type: 'pricing',
        title: 'Gap de Preço Identificado',
        description: `Existe uma grande variação de preços (${min} - ${max})`,
        action: 'Explorar faixa de preço intermediária',
      });
    }

    // Oportunidade de performance
    const lowPerformers = products.filter(p => p.performance_score < 30);
    if (lowPerformers.length > products.length * 0.3) {
      opportunities.push({
        type: 'performance',
        title: 'Mercado com Baixa Performance',
        description: `${lowPerformers.length} produtos com baixa performance`,
        action: 'Oportunidade para produtos otimizados',
      });
    }
  }

  return opportunities;
};

module.exports = router;
