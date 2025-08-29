// ========================================
// CONTROLLER DE BENCHMARKING - Shopee Manager
// Análise competitiva e benchmarking de mercado
// ========================================

const { Product } = require('../models/index');
const { Op } = require('sequelize');

// ========================================
// BENCHMARKING DE PREÇOS POR CATEGORIA
// ========================================
const analyzeCategoryBenchmark = async (req, res) => {
  try {
    const {
      category,
      include_market_data = true,
      price_range_analysis = true,
    } = req.query;

    // Buscar produtos da categoria
    const whereClause = { status: 'active' };
    if (category) {
      whereClause.category_name = { [Op.like]: `%${category}%` };
    }

    const products = await Product.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'category_name',
        'price',
        'cost_price',
        'sales_count',
        'views_count',
        'rating_average',
        'stock_quantity',
      ],
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum produto encontrado para benchmarking',
        category: category || 'todas',
        timestamp: new Date().toISOString(),
      });
    }

    // Agrupar por categoria
    const categoryGroups = {};
    products.forEach(product => {
      const cat = product.category_name || 'Sem categoria';
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = [];
      }
      categoryGroups[cat].push(product);
    });

    const benchmarkResults = {};

    for (const [categoryName, categoryProducts] of Object.entries(
      categoryGroups
    )) {
      // Análise de preços
      const prices = categoryProducts.map(p => p.price).sort((a, b) => a - b);
      const priceStats = {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: prices.reduce((sum, p) => sum + p, 0) / prices.length,
        median: getMedian(prices),
        q1: getPercentile(prices, 25),
        q3: getPercentile(prices, 75),
      };

      // Análise de performance
      const performanceMetrics = categoryProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        sales: p.sales_count || 0,
        views: p.views_count || 0,
        rating: p.rating_average || 0,
        conversion_rate:
          p.views_count > 0 ? (p.sales_count / p.views_count) * 100 : 0,
        price_position: getPricePosition(p.price, priceStats),
        performance_score: calculatePerformanceScore(p),
      }));

      // Identificar líderes e oportunidades
      const topPerformers = performanceMetrics
        .sort((a, b) => b.performance_score - a.performance_score)
        .slice(0, 3);

      const priceLeaders = performanceMetrics
        .filter(p => p.price_position === 'baixo' && p.performance_score > 60)
        .sort((a, b) => b.performance_score - a.performance_score);

      const premiumProducts = performanceMetrics
        .filter(p => p.price_position === 'alto' && p.rating > 4.0)
        .sort((a, b) => b.rating - a.rating);

      // Análise de gaps de mercado
      const priceGaps = findPriceGaps(prices, priceStats);

      // Simulação de dados de mercado (em produção, viria de APIs externas)
      const marketData = generateMarketSimulation(categoryName, priceStats);

      benchmarkResults[categoryName] = {
        category_overview: {
          total_products: categoryProducts.length,
          price_range: {
            min: parseFloat(priceStats.min.toFixed(2)),
            max: parseFloat(priceStats.max.toFixed(2)),
            avg: parseFloat(priceStats.avg.toFixed(2)),
            median: parseFloat(priceStats.median.toFixed(2)),
          },
          market_position: getMarketPosition(priceStats, marketData.market_avg),
          competitiveness_score: calculateCompetitivenessScore(
            categoryProducts,
            marketData
          ),
        },

        price_analysis: {
          distribution: {
            budget: prices.filter(p => p <= priceStats.q1).length,
            mid_range: prices.filter(
              p => p > priceStats.q1 && p <= priceStats.q3
            ).length,
            premium: prices.filter(p => p > priceStats.q3).length,
          },
          quartiles: {
            q1: parseFloat(priceStats.q1.toFixed(2)),
            q2_median: parseFloat(priceStats.median.toFixed(2)),
            q3: parseFloat(priceStats.q3.toFixed(2)),
          },
          price_gaps: priceGaps,
          optimal_price_ranges: getOptimalPriceRanges(priceStats, marketData),
        },

        competitive_analysis: {
          top_performers: topPerformers,
          price_leaders: priceLeaders.slice(0, 3),
          premium_products: premiumProducts.slice(0, 3),
          market_leaders: identifyMarketLeaders(performanceMetrics),
          competitive_threats: identifyCompetitiveThreats(performanceMetrics),
        },

        market_insights: marketData,

        opportunities: {
          underpriced_products: findUnderpricedProducts(
            performanceMetrics,
            priceStats
          ),
          overpriced_products: findOverpricedProducts(
            performanceMetrics,
            priceStats
          ),
          market_gaps: priceGaps,
          growth_opportunities: identifyGrowthOpportunities(
            categoryProducts,
            marketData
          ),
        },

        recommendations: generateCategoryRecommendations(
          categoryProducts,
          priceStats,
          marketData
        ),
      };
    }

    res.json({
      success: true,
      data: {
        benchmark_summary: {
          categories_analyzed: Object.keys(benchmarkResults).length,
          total_products: products.length,
          analysis_date: new Date().toISOString(),
          market_coverage: calculateMarketCoverage(benchmarkResults),
        },
        category_benchmarks: benchmarkResults,
      },
      message: `Benchmarking concluído para ${Object.keys(benchmarkResults).length} categoria(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro no benchmarking:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível executar análise de benchmarking',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// BENCHMARKING DE PRODUTO ESPECÍFICO
// ========================================
const analyzeProductBenchmark = async (req, res) => {
  try {
    const { id } = req.params;
    const { include_similar = true, similarity_threshold = 70 } = req.query;

    // Buscar produto principal
    const product = await Product.findByPk(id, {
      attributes: [
        'id',
        'name',
        'category_name',
        'price',
        'cost_price',
        'sales_count',
        'views_count',
        'rating_average',
        'stock_quantity',
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
        message: `Produto com ID ${id} não existe`,
        timestamp: new Date().toISOString(),
      });
    }

    // Buscar produtos similares na mesma categoria
    const similarProducts = await Product.findAll({
      where: {
        id: { [Op.ne]: product.id },
        category_name: product.category_name,
        status: 'active',
        price: {
          [Op.between]: [product.price * 0.5, product.price * 2], // Faixa de preço similar
        },
      },
      attributes: [
        'id',
        'name',
        'price',
        'cost_price',
        'sales_count',
        'views_count',
        'rating_average',
        'stock_quantity',
      ],
    });

    // Análise do produto principal
    const productAnalysis = {
      id: product.id,
      name: product.name,
      category: product.category_name,
      current_metrics: {
        price: product.price,
        sales: product.sales_count || 0,
        views: product.views_count || 0,
        rating: product.rating_average || 0,
        stock: product.stock_quantity,
        conversion_rate:
          product.views_count > 0
            ? parseFloat(
                ((product.sales_count / product.views_count) * 100).toFixed(2)
              )
            : 0,
        performance_score: calculatePerformanceScore(product),
      },
    };

    // Análise comparativa
    const competitorAnalysis = similarProducts.map(comp => {
      const conversionRate =
        comp.views_count > 0 ? (comp.sales_count / comp.views_count) * 100 : 0;

      return {
        id: comp.id,
        name: comp.name,
        price: comp.price,
        price_difference: parseFloat(
          (((comp.price - product.price) / product.price) * 100).toFixed(2)
        ),
        sales: comp.sales_count || 0,
        rating: comp.rating_average || 0,
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
        performance_score: calculatePerformanceScore(comp),
        competitive_advantage: analyzeCompetitiveAdvantage(product, comp),
      };
    });

    // Estatísticas do mercado
    const allProducts = [product, ...similarProducts];
    const marketStats = {
      avg_price:
        allProducts.reduce((sum, p) => sum + p.price, 0) / allProducts.length,
      avg_sales:
        allProducts.reduce((sum, p) => sum + (p.sales_count || 0), 0) /
        allProducts.length,
      avg_rating:
        allProducts.reduce((sum, p) => sum + (p.rating_average || 0), 0) /
        allProducts.length,
      price_percentile: calculatePricePercentile(
        product.price,
        allProducts.map(p => p.price)
      ),
    };

    // Posicionamento competitivo
    const competitivePosition = {
      price_position: getCompetitivePosition(
        product.price,
        allProducts.map(p => p.price)
      ),
      performance_position: getCompetitivePosition(
        calculatePerformanceScore(product),
        allProducts.map(p => calculatePerformanceScore(p))
      ),
      rating_position: getCompetitivePosition(
        product.rating_average || 0,
        allProducts.map(p => p.rating_average || 0)
      ),
    };

    // Simulação de cenários
    const scenarios = generatePricingScenarios(
      product,
      marketStats,
      competitorAnalysis
    );

    // Recomendações específicas
    const recommendations = generateProductRecommendations(
      product,
      competitorAnalysis,
      marketStats,
      competitivePosition
    );

    res.json({
      success: true,
      data: {
        product_analysis: productAnalysis,
        market_context: {
          category: product.category_name,
          competitors_found: similarProducts.length,
          market_statistics: {
            avg_price: parseFloat(marketStats.avg_price.toFixed(2)),
            avg_sales: parseFloat(marketStats.avg_sales.toFixed(1)),
            avg_rating: parseFloat(marketStats.avg_rating.toFixed(2)),
            price_percentile: marketStats.price_percentile,
          },
        },
        competitive_analysis: {
          position: competitivePosition,
          direct_competitors: competitorAnalysis.slice(0, 5),
          market_leaders: competitorAnalysis
            .sort((a, b) => b.performance_score - a.performance_score)
            .slice(0, 3),
          price_competitors: competitorAnalysis
            .filter(c => Math.abs(c.price_difference) <= 10)
            .sort(
              (a, b) =>
                Math.abs(a.price_difference) - Math.abs(b.price_difference)
            ),
        },
        scenario_analysis: scenarios,
        recommendations: recommendations,
      },
      message: `Benchmarking do produto "${product.name}" concluído`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro no benchmarking do produto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível executar benchmarking do produto',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// ANÁLISE DE TENDÊNCIAS DE MERCADO
// ========================================
const analyzeMarketTrends = async (req, res) => {
  try {
    const {
      period_days = 30,
      include_predictions = true,
      trend_analysis = true,
    } = req.query;

    // Buscar todos os produtos ativos
    const products = await Product.findAll({
      where: { status: 'active' },
      attributes: [
        'id',
        'name',
        'category_name',
        'price',
        'sales_count',
        'views_count',
        'rating_average',
        'created_at',
        'updated_at',
      ],
    });

    // Agrupar por categoria
    const categoryTrends = {};
    const categories = [
      ...new Set(products.map(p => p.category_name || 'Sem categoria')),
    ];

    for (const category of categories) {
      const categoryProducts = products.filter(
        p => (p.category_name || 'Sem categoria') === category
      );

      // Análise de tendências de preço
      const priceTrend = analyzePriceTrend(categoryProducts);

      // Análise de demanda
      const demandTrend = analyzeDemandTrend(categoryProducts);

      // Análise de qualidade
      const qualityTrend = analyzeQualityTrend(categoryProducts);

      // Análise de competitividade
      const competitivenessTrend =
        analyzeCompetitivenessTrend(categoryProducts);

      // Previsões (simuladas)
      const predictions = generateMarketPredictions(categoryProducts);

      categoryTrends[category] = {
        category_metrics: {
          total_products: categoryProducts.length,
          avg_price:
            categoryProducts.reduce((sum, p) => sum + p.price, 0) /
            categoryProducts.length,
          total_sales: categoryProducts.reduce(
            (sum, p) => sum + (p.sales_count || 0),
            0
          ),
          avg_rating:
            categoryProducts.reduce(
              (sum, p) => sum + (p.rating_average || 0),
              0
            ) / categoryProducts.length,
        },
        trends: {
          price: priceTrend,
          demand: demandTrend,
          quality: qualityTrend,
          competitiveness: competitivenessTrend,
        },
        predictions: predictions,
        market_opportunities: identifyMarketOpportunities(
          categoryProducts,
          priceTrend,
          demandTrend
        ),
        risk_factors: identifyRiskFactors(
          categoryProducts,
          priceTrend,
          demandTrend
        ),
      };
    }

    // Análise geral do mercado
    const overallTrends = {
      market_growth: calculateMarketGrowth(products),
      price_inflation: calculatePriceInflation(products),
      competition_intensity: calculateCompetitionIntensity(products),
      market_saturation: calculateMarketSaturation(categoryTrends),
    };

    res.json({
      success: true,
      data: {
        analysis_period: `${period_days} dias`,
        overall_market_trends: overallTrends,
        category_trends: categoryTrends,
        market_insights: {
          fastest_growing_categories:
            getFastestGrowingCategories(categoryTrends),
          most_competitive_categories:
            getMostCompetitiveCategories(categoryTrends),
          emerging_opportunities: getEmergingOpportunities(categoryTrends),
          market_threats: getMarketThreats(categoryTrends),
        },
        strategic_recommendations: generateStrategicRecommendations(
          overallTrends,
          categoryTrends
        ),
      },
      message: `Análise de tendências concluída para ${categories.length} categoria(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na análise de tendências:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível executar análise de tendências',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function getMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function getPercentile(arr, percentile) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
}

function getPricePosition(price, stats) {
  if (price <= stats.q1) return 'baixo';
  if (price <= stats.q3) return 'médio';
  return 'alto';
}

function calculatePerformanceScore(product) {
  const salesScore = Math.min(((product.sales_count || 0) / 50) * 30, 30);
  const viewsScore = Math.min(((product.views_count || 0) / 500) * 20, 20);
  const ratingScore = (product.rating_average || 0) * 10;
  const stockScore = product.stock_quantity > 0 ? 20 : 0;

  return parseFloat(
    (salesScore + viewsScore + ratingScore + stockScore).toFixed(1)
  );
}

function findPriceGaps(prices, stats) {
  const gaps = [];
  const sortedPrices = [...prices].sort((a, b) => a - b);

  for (let i = 1; i < sortedPrices.length; i++) {
    const gap = sortedPrices[i] - sortedPrices[i - 1];
    const gapPercentage = (gap / sortedPrices[i - 1]) * 100;

    if (gapPercentage > 20) {
      // Gap significativo
      gaps.push({
        lower_price: parseFloat(sortedPrices[i - 1].toFixed(2)),
        upper_price: parseFloat(sortedPrices[i].toFixed(2)),
        gap_amount: parseFloat(gap.toFixed(2)),
        gap_percentage: parseFloat(gapPercentage.toFixed(1)),
        opportunity_score: Math.min(gapPercentage / 5, 10), // Score de 0-10
      });
    }
  }

  return gaps.sort((a, b) => b.opportunity_score - a.opportunity_score);
}

function generateMarketSimulation(categoryName, priceStats) {
  // Simulação de dados de mercado (em produção, viria de APIs externas)
  const marketMultiplier = Math.random() * 0.4 + 0.8; // 0.8 a 1.2

  return {
    market_avg: parseFloat((priceStats.avg * marketMultiplier).toFixed(2)),
    market_median: parseFloat(
      (priceStats.median * marketMultiplier).toFixed(2)
    ),
    market_size_estimate: Math.floor(Math.random() * 1000 + 500),
    growth_rate: parseFloat((Math.random() * 20 - 5).toFixed(1)), // -5% a +15%
    competition_level: ['baixa', 'média', 'alta'][
      Math.floor(Math.random() * 3)
    ],
    market_maturity: ['emergente', 'crescimento', 'maduro'][
      Math.floor(Math.random() * 3)
    ],
  };
}

function getMarketPosition(priceStats, marketAvg) {
  const avgDiff = ((priceStats.avg - marketAvg) / marketAvg) * 100;

  if (avgDiff < -10) return 'abaixo_mercado';
  if (avgDiff > 10) return 'acima_mercado';
  return 'alinhado_mercado';
}

function calculateCompetitivenessScore(products, marketData) {
  const avgPerformance =
    products.reduce((sum, p) => sum + calculatePerformanceScore(p), 0) /
    products.length;
  const priceCompetitiveness =
    100 -
    Math.abs(
      ((products.reduce((sum, p) => sum + p.price, 0) / products.length -
        marketData.market_avg) /
        marketData.market_avg) *
        100
    );

  return parseFloat(((avgPerformance + priceCompetitiveness) / 2).toFixed(1));
}

function getOptimalPriceRanges(priceStats, marketData) {
  return {
    budget_segment: {
      min: parseFloat(priceStats.min.toFixed(2)),
      max: parseFloat(priceStats.q1.toFixed(2)),
      recommendation: 'Foco em volume e penetração de mercado',
    },
    mainstream_segment: {
      min: parseFloat(priceStats.q1.toFixed(2)),
      max: parseFloat(priceStats.q3.toFixed(2)),
      recommendation: 'Maior potencial de vendas e margem equilibrada',
    },
    premium_segment: {
      min: parseFloat(priceStats.q3.toFixed(2)),
      max: parseFloat(priceStats.max.toFixed(2)),
      recommendation: 'Foco em margem e diferenciação',
    },
  };
}

function identifyMarketLeaders(products) {
  return products
    .filter(p => p.performance_score > 80)
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, 3)
    .map(p => ({
      ...p,
      leadership_factors: analyzeLeadershipFactors(p),
    }));
}

function analyzeLeadershipFactors(product) {
  const factors = [];

  if (product.sales > 100) factors.push('Alto volume de vendas');
  if (product.rating > 4.5) factors.push('Excelente avaliação');
  if (product.conversion_rate > 5) factors.push('Alta taxa de conversão');
  if (product.price_position === 'médio') factors.push('Preço competitivo');

  return factors;
}

function identifyCompetitiveThreats(products) {
  return products
    .filter(p => p.performance_score > 70 && p.price_position === 'baixo')
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, 3)
    .map(p => ({
      ...p,
      threat_level: calculateThreatLevel(p),
      threat_factors: analyzeThreatFactors(p),
    }));
}

function calculateThreatLevel(product) {
  if (product.performance_score > 85 && product.price_position === 'baixo')
    return 'alta';
  if (product.performance_score > 75) return 'média';
  return 'baixa';
}

function analyzeThreatFactors(product) {
  const factors = [];

  if (product.price_position === 'baixo')
    factors.push('Preço muito competitivo');
  if (product.conversion_rate > 3) factors.push('Boa conversão');
  if (product.rating > 4.0) factors.push('Boa avaliação');
  if (product.sales > 50) factors.push('Volume de vendas crescente');

  return factors;
}

function findUnderpricedProducts(products, priceStats) {
  return products
    .filter(p => p.price < priceStats.median && p.performance_score > 70)
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, 5)
    .map(p => ({
      ...p,
      price_increase_potential: parseFloat(
        (((priceStats.median - p.price) / p.price) * 100).toFixed(1)
      ),
    }));
}

function findOverpricedProducts(products, priceStats) {
  return products
    .filter(p => p.price > priceStats.q3 && p.performance_score < 50)
    .sort((a, b) => a.performance_score - b.performance_score)
    .slice(0, 5)
    .map(p => ({
      ...p,
      price_reduction_suggestion: parseFloat(
        (((p.price - priceStats.median) / p.price) * 100).toFixed(1)
      ),
    }));
}

function identifyGrowthOpportunities(products, marketData) {
  const opportunities = [];

  if (marketData.growth_rate > 5) {
    opportunities.push({
      type: 'market_expansion',
      description: `Mercado em crescimento (${marketData.growth_rate}%)`,
      action: 'Aumentar investimento em marketing e estoque',
    });
  }

  if (marketData.competition_level === 'baixa') {
    opportunities.push({
      type: 'low_competition',
      description: 'Baixa competição no mercado',
      action: 'Oportunidade para aumentar preços e margem',
    });
  }

  const avgPerformance =
    products.reduce((sum, p) => sum + calculatePerformanceScore(p), 0) /
    products.length;
  if (avgPerformance < 60) {
    opportunities.push({
      type: 'performance_improvement',
      description: 'Produtos com performance abaixo da média',
      action: 'Otimizar descrições, imagens e preços',
    });
  }

  return opportunities;
}

function generateCategoryRecommendations(products, priceStats, marketData) {
  const recommendations = [];

  // Recomendação de preços
  if (priceStats.avg < marketData.market_avg * 0.9) {
    recommendations.push({
      priority: 'alta',
      type: 'pricing',
      title: 'Oportunidade de aumento de preços',
      description: `Preços ${((1 - priceStats.avg / marketData.market_avg) * 100).toFixed(1)}% abaixo do mercado`,
      action: 'Considerar aumento gradual de preços',
    });
  }

  // Recomendação de portfolio
  const lowPerformers = products.filter(p => calculatePerformanceScore(p) < 40);
  if (lowPerformers.length > products.length * 0.3) {
    recommendations.push({
      priority: 'média',
      type: 'portfolio',
      title: 'Otimizar portfolio de produtos',
      description: `${lowPerformers.length} produtos com baixa performance`,
      action: 'Revisar produtos com baixa performance',
    });
  }

  // Recomendação de competitividade
  if (marketData.competition_level === 'alta') {
    recommendations.push({
      priority: 'alta',
      type: 'competition',
      title: 'Mercado altamente competitivo',
      description: 'Necessário diferenciação para manter posição',
      action: 'Focar em qualidade e atendimento',
    });
  }

  return recommendations;
}

// Funções para análise de produto específico
function analyzeCompetitiveAdvantage(mainProduct, competitor) {
  const advantages = [];
  const disadvantages = [];

  if (mainProduct.price < competitor.price) {
    advantages.push('Preço mais competitivo');
  } else {
    disadvantages.push('Preço mais alto');
  }

  if ((mainProduct.rating_average || 0) > (competitor.rating_average || 0)) {
    advantages.push('Melhor avaliação');
  } else {
    disadvantages.push('Avaliação inferior');
  }

  if ((mainProduct.sales_count || 0) > (competitor.sales_count || 0)) {
    advantages.push('Mais vendas');
  } else {
    disadvantages.push('Menos vendas');
  }

  return { advantages, disadvantages };
}

function calculatePricePercentile(price, allPrices) {
  const sorted = allPrices.sort((a, b) => a - b);
  const index = sorted.findIndex(p => p >= price);
  return parseFloat(((index / sorted.length) * 100).toFixed(1));
}

function getCompetitivePosition(value, allValues) {
  const sorted = allValues.sort((a, b) => b - a);
  const index = sorted.findIndex(v => v <= value);
  const percentile = (index / sorted.length) * 100;

  if (percentile <= 25) return 'líder';
  if (percentile <= 50) return 'forte';
  if (percentile <= 75) return 'médio';
  return 'fraco';
}

function generatePricingScenarios(product, marketStats, competitors) {
  const currentPrice = product.price;

  return {
    aggressive_pricing: {
      price: parseFloat((currentPrice * 0.9).toFixed(2)),
      expected_impact: 'Aumento de 15-25% nas vendas',
      risk_level: 'médio',
      margin_impact: 'Redução de margem',
    },
    market_aligned: {
      price: parseFloat(marketStats.avg_price.toFixed(2)),
      expected_impact: 'Vendas estáveis com melhor margem',
      risk_level: 'baixo',
      margin_impact: 'Melhoria de margem',
    },
    premium_positioning: {
      price: parseFloat((currentPrice * 1.15).toFixed(2)),
      expected_impact: 'Possível redução de 10-15% nas vendas',
      risk_level: 'alto',
      margin_impact: 'Significativa melhoria de margem',
    },
  };
}

function generateProductRecommendations(
  product,
  competitors,
  marketStats,
  position
) {
  const recommendations = [];

  if (position.price_position === 'fraco') {
    recommendations.push({
      priority: 'alta',
      type: 'pricing',
      title: 'Revisar estratégia de preços',
      description: 'Preço não competitivo em relação ao mercado',
      action: 'Considerar redução de preço ou melhoria de valor',
    });
  }

  if (position.performance_position === 'fraco') {
    recommendations.push({
      priority: 'alta',
      type: 'performance',
      title: 'Melhorar performance do produto',
      description: 'Produto abaixo da média em vendas/conversão',
      action: 'Otimizar descrição, imagens e SEO',
    });
  }

  if (position.rating_position === 'fraco') {
    recommendations.push({
      priority: 'média',
      type: 'quality',
      title: 'Melhorar qualidade percebida',
      description: 'Avaliações abaixo da média do mercado',
      action: 'Revisar qualidade e atendimento',
    });
  }

  return recommendations;
}

// Funções para análise de tendências
function analyzePriceTrend(products) {
  // Simulação de tendência (em produção, analisaria dados históricos)
  const avgPrice =
    products.reduce((sum, p) => sum + p.price, 0) / products.length;
  const trend = Math.random() > 0.5 ? 'crescimento' : 'estável';
  const rate = parseFloat((Math.random() * 10 - 2).toFixed(1)); // -2% a +8%

  return {
    direction: trend,
    rate_percent: rate,
    avg_price: parseFloat(avgPrice.toFixed(2)),
    volatility: Math.random() > 0.7 ? 'alta' : 'baixa',
  };
}

function analyzeDemandTrend(products) {
  const totalSales = products.reduce((sum, p) => sum + (p.sales_count || 0), 0);
  const avgSales = totalSales / products.length;

  return {
    direction: avgSales > 20 ? 'crescimento' : 'estável',
    strength: avgSales > 50 ? 'forte' : avgSales > 20 ? 'moderada' : 'fraca',
    total_sales: totalSales,
    avg_sales_per_product: parseFloat(avgSales.toFixed(1)),
  };
}

function analyzeQualityTrend(products) {
  const avgRating =
    products.reduce((sum, p) => sum + (p.rating_average || 0), 0) /
    products.length;

  return {
    avg_rating: parseFloat(avgRating.toFixed(2)),
    trend:
      avgRating > 4.0
        ? 'melhorando'
        : avgRating > 3.5
          ? 'estável'
          : 'deteriorando',
    quality_level:
      avgRating > 4.5
        ? 'excelente'
        : avgRating > 4.0
          ? 'boa'
          : avgRating > 3.0
            ? 'média'
            : 'baixa',
  };
}

function analyzeCompetitivenessTrend(products) {
  const avgPerformance =
    products.reduce((sum, p) => sum + calculatePerformanceScore(p), 0) /
    products.length;

  return {
    competitiveness_score: parseFloat(avgPerformance.toFixed(1)),
    level:
      avgPerformance > 70 ? 'alta' : avgPerformance > 50 ? 'média' : 'baixa',
    trend: 'estável', // Simulado
  };
}

function generateMarketPredictions(products) {
  return {
    next_30_days: {
      price_forecast: 'estabilidade',
      demand_forecast: 'crescimento_moderado',
      competition_forecast: 'intensificação',
    },
    next_90_days: {
      market_opportunity: Math.random() > 0.5 ? 'positiva' : 'neutra',
      risk_level: Math.random() > 0.7 ? 'alto' : 'baixo',
      recommended_strategy: 'monitoramento_ativo',
    },
  };
}

function identifyMarketOpportunities(products, priceTrend, demandTrend) {
  const opportunities = [];

  if (
    priceTrend.direction === 'crescimento' &&
    demandTrend.direction === 'crescimento'
  ) {
    opportunities.push({
      type: 'market_expansion',
      description: 'Mercado em crescimento com demanda forte',
      potential: 'alto',
    });
  }

  if (priceTrend.volatility === 'baixa' && demandTrend.strength === 'forte') {
    opportunities.push({
      type: 'stable_growth',
      description: 'Ambiente estável com boa demanda',
      potential: 'médio',
    });
  }

  return opportunities;
}

function identifyRiskFactors(products, priceTrend, demandTrend) {
  const risks = [];

  if (priceTrend.rate_percent < -5) {
    risks.push({
      type: 'price_pressure',
      description: 'Pressão deflacionária no mercado',
      severity: 'alta',
    });
  }

  if (demandTrend.strength === 'fraca') {
    risks.push({
      type: 'weak_demand',
      description: 'Demanda fraca no segmento',
      severity: 'média',
    });
  }

  return risks;
}

function calculateMarketGrowth(products) {
  // Simulação baseada em métricas dos produtos
  const avgSales =
    products.reduce((sum, p) => sum + (p.sales_count || 0), 0) /
    products.length;
  return {
    rate: parseFloat((Math.random() * 15 - 2).toFixed(1)), // -2% a +13%
    trend: avgSales > 30 ? 'aceleração' : 'estável',
  };
}

function calculatePriceInflation(products) {
  const avgPrice =
    products.reduce((sum, p) => sum + p.price, 0) / products.length;
  return {
    rate: parseFloat((Math.random() * 8 - 1).toFixed(1)), // -1% a +7%
    level: avgPrice > 100 ? 'alto' : avgPrice > 50 ? 'médio' : 'baixo',
  };
}

function calculateCompetitionIntensity(products) {
  const categoryCount = new Set(products.map(p => p.category_name)).size;
  const avgProductsPerCategory = products.length / categoryCount;

  return {
    level:
      avgProductsPerCategory > 20
        ? 'alta'
        : avgProductsPerCategory > 10
          ? 'média'
          : 'baixa',
    score: parseFloat((avgProductsPerCategory / 5).toFixed(1)),
  };
}

function calculateMarketSaturation(categoryTrends) {
  const categories = Object.keys(categoryTrends);
  const avgProductsPerCategory =
    categories.reduce(
      (sum, cat) => sum + categoryTrends[cat].category_metrics.total_products,
      0
    ) / categories.length;

  return {
    level:
      avgProductsPerCategory > 25
        ? 'alta'
        : avgProductsPerCategory > 15
          ? 'média'
          : 'baixa',
    score: parseFloat((avgProductsPerCategory / 10).toFixed(1)),
  };
}

function getFastestGrowingCategories(categoryTrends) {
  return Object.entries(categoryTrends)
    .map(([category, data]) => ({
      category,
      growth_indicator: data.trends.demand.strength,
      total_sales: data.category_metrics.total_sales,
    }))
    .sort((a, b) => b.total_sales - a.total_sales)
    .slice(0, 3);
}

function getMostCompetitiveCategories(categoryTrends) {
  return Object.entries(categoryTrends)
    .map(([category, data]) => ({
      category,
      competitiveness: data.trends.competitiveness.competitiveness_score,
      product_count: data.category_metrics.total_products,
    }))
    .sort((a, b) => b.competitiveness - a.competitiveness)
    .slice(0, 3);
}

function getEmergingOpportunities(categoryTrends) {
  const opportunities = [];

  Object.entries(categoryTrends).forEach(([category, data]) => {
    if (
      data.trends.demand.strength === 'forte' &&
      data.trends.competitiveness.level === 'baixa'
    ) {
      opportunities.push({
        category,
        type: 'low_competition_high_demand',
        description: 'Alta demanda com baixa competição',
      });
    }
  });

  return opportunities.slice(0, 3);
}

function getMarketThreats(categoryTrends) {
  const threats = [];

  Object.entries(categoryTrends).forEach(([category, data]) => {
    if (
      data.trends.demand.strength === 'fraca' &&
      data.trends.competitiveness.level === 'alta'
    ) {
      threats.push({
        category,
        type: 'high_competition_low_demand',
        description: 'Alta competição com demanda fraca',
      });
    }
  });

  return threats.slice(0, 3);
}

function generateStrategicRecommendations(overallTrends, categoryTrends) {
  const recommendations = [];

  if (overallTrends.market_growth.rate > 5) {
    recommendations.push({
      priority: 'alta',
      type: 'expansion',
      title: 'Aproveitar crescimento do mercado',
      description: `Mercado crescendo ${overallTrends.market_growth.rate}%`,
      action: 'Aumentar investimento em produtos de alta demanda',
    });
  }

  if (overallTrends.competition_intensity.level === 'alta') {
    recommendations.push({
      priority: 'média',
      type: 'differentiation',
      title: 'Diferenciação necessária',
      description: 'Alta intensidade competitiva',
      action: 'Focar em qualidade e atendimento diferenciado',
    });
  }

  if (overallTrends.price_inflation.rate > 5) {
    recommendations.push({
      priority: 'média',
      type: 'pricing',
      title: 'Ajustar preços pela inflação',
      description: `Inflação de preços em ${overallTrends.price_inflation.rate}%`,
      action: 'Revisar preços para manter margem',
    });
  }

  return recommendations;
}

module.exports = {
  analyzeCategoryBenchmark,
  analyzeProductBenchmark,
  analyzeMarketTrends,
};
