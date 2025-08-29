// ========================================
// CONTROLLER DE IA - Shopee Manager
// Inteligência Artificial para otimização
// ========================================

const { Product } = require('../models/index');
const { Op } = require('sequelize');

// ========================================
// ANÁLISE DE PREÇOS COM IA
// ========================================
const analyzePricing = async (req, res) => {
  try {
    const { category, competitor_analysis = true } = req.query;

    // Buscar produtos para análise
    const where = { status: 'active' };
    if (category) where.category_name = { [Op.like]: `%${category}%` };

    const products = await Product.findAll({
      where,
      attributes: [
        'id',
        'name',
        'price',
        'cost_price',
        'category_name',
        'sales_count',
        'views_count',
        'rating_average',
        'stock_quantity',
      ],
    });

    // Algoritmo de IA para análise de preços
    const priceAnalysis = products.map(product => {
      const currentPrice = parseFloat(product.price);
      const costPrice = parseFloat(product.cost_price) || 0;
      const currentMargin =
        costPrice > 0 ? ((currentPrice - costPrice) / currentPrice) * 100 : 0;

      // Calcular performance score (0-100)
      const salesScore = Math.min((product.sales_count / 100) * 30, 30);
      const viewsScore = Math.min((product.views_count / 1000) * 20, 20);
      const ratingScore = (product.rating_average || 0) * 10;
      const stockScore =
        product.stock_quantity > 10 ? 20 : (product.stock_quantity / 10) * 20;
      const performanceScore =
        salesScore + viewsScore + ratingScore + stockScore;

      // IA: Sugerir preço otimizado
      let suggestedPrice = currentPrice;
      let recommendation = 'manter';
      let confidence = 50;

      // Algoritmo de otimização
      if (performanceScore > 70 && currentMargin < 40) {
        // Produto performando bem, pode aumentar preço
        suggestedPrice = currentPrice * 1.15;
        recommendation = 'aumentar';
        confidence = 85;
      } else if (performanceScore < 30 && currentMargin > 20) {
        // Produto com baixa performance, reduzir preço
        suggestedPrice = currentPrice * 0.9;
        recommendation = 'reduzir';
        confidence = 75;
      } else if (product.stock_quantity > 50 && performanceScore < 50) {
        // Muito estoque, preço competitivo
        suggestedPrice = currentPrice * 0.95;
        recommendation = 'reduzir_estoque';
        confidence = 70;
      }

      // Garantir margem mínima
      const minPrice = costPrice * 1.2; // 20% margem mínima
      if (suggestedPrice < minPrice) {
        suggestedPrice = minPrice;
        recommendation = 'margem_minima';
        confidence = 90;
      }

      return {
        product_id: product.id,
        name: product.name,
        category: product.category_name,
        current_price: currentPrice,
        suggested_price: parseFloat(suggestedPrice.toFixed(2)),
        price_change: parseFloat(
          (((suggestedPrice - currentPrice) / currentPrice) * 100).toFixed(2)
        ),
        current_margin: parseFloat(currentMargin.toFixed(2)),
        suggested_margin:
          costPrice > 0
            ? parseFloat(
                (((suggestedPrice - costPrice) / suggestedPrice) * 100).toFixed(
                  2
                )
              )
            : 0,
        performance_score: parseFloat(performanceScore.toFixed(1)),
        recommendation,
        confidence: parseFloat(confidence.toFixed(1)),
        reasoning: getRecommendationReasoning(
          recommendation,
          performanceScore,
          currentMargin,
          product.stock_quantity
        ),
      };
    });

    // Estatísticas gerais
    const totalProducts = priceAnalysis.length;
    const increaseCount = priceAnalysis.filter(
      p => p.recommendation === 'aumentar'
    ).length;
    const decreaseCount = priceAnalysis.filter(
      p => p.recommendation === 'reduzir'
    ).length;
    const maintainCount = priceAnalysis.filter(
      p => p.recommendation === 'manter'
    ).length;

    const potentialRevenue = priceAnalysis.reduce((sum, p) => {
      return (
        sum + (p.suggested_price - p.current_price) * (p.performance_score / 10)
      );
    }, 0);

    res.json({
      success: true,
      data: {
        analysis_summary: {
          total_products: totalProducts,
          recommendations: {
            increase_price: increaseCount,
            decrease_price: decreaseCount,
            maintain_price: maintainCount,
          },
          potential_revenue_impact: parseFloat(potentialRevenue.toFixed(2)),
          average_confidence: parseFloat(
            (
              priceAnalysis.reduce((sum, p) => sum + p.confidence, 0) /
              totalProducts
            ).toFixed(1)
          ),
        },
        products: priceAnalysis.sort((a, b) => b.confidence - a.confidence),
      },
      message: `Análise de IA concluída para ${totalProducts} produtos`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na análise de IA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível executar análise de IA',
      timestamp: new Date().toISOString(),
    });
  }
};

// Função auxiliar para gerar explicações
const getRecommendationReasoning = (
  recommendation,
  performanceScore,
  margin,
  stock
) => {
  switch (recommendation) {
    case 'aumentar':
      return `Produto com alta performance (${performanceScore.toFixed(1)}/100) e margem baixa (${margin.toFixed(1)}%). Mercado aceita preço maior.`;
    case 'reduzir':
      return `Performance baixa (${performanceScore.toFixed(1)}/100) indica resistência ao preço atual. Redução pode aumentar vendas.`;
    case 'reduzir_estoque':
      return `Alto estoque (${stock} unidades) com performance média. Preço promocional pode acelerar giro.`;
    case 'margem_minima':
      return `Preço ajustado para manter margem mínima de 20%. Custo muito próximo ao preço sugerido.`;
    default:
      return `Produto equilibrado. Preço atual está adequado para performance e margem atuais.`;
  }
};

// ========================================
// PREVISÃO DE DEMANDA
// ========================================
const predictDemand = async (req, res) => {
  try {
    const { product_id, days_ahead = 30 } = req.query;

    let products;
    if (product_id) {
      products = await Product.findAll({
        where: { id: product_id, status: 'active' },
      });
    } else {
      products = await Product.findAll({
        where: { status: 'active' },
        limit: 20,
        order: [['sales_count', 'DESC']],
      });
    }

    const predictions = products.map(product => {
      // Algoritmo simples de previsão baseado em tendências
      const currentSales = product.sales_count || 0;
      const currentViews = product.views_count || 0;
      const rating = product.rating_average || 3.0;
      const stock = product.stock_quantity || 0;

      // Fatores de influência
      const ratingFactor = rating / 5; // 0-1
      const stockFactor = Math.min(stock / 100, 1); // 0-1
      const trendFactor = Math.random() * 0.4 + 0.8; // 0.8-1.2 (simula tendência de mercado)

      // Previsão de vendas diárias
      const avgDailySales = currentSales / 30; // Assumindo dados dos últimos 30 dias
      const predictedDailySales =
        avgDailySales * ratingFactor * stockFactor * trendFactor;
      const predictedTotalSales = predictedDailySales * parseInt(days_ahead);

      // Previsão de estoque
      const daysUntilStockout =
        stock > 0 ? Math.floor(stock / Math.max(predictedDailySales, 0.1)) : 0;
      const needsRestock = daysUntilStockout < parseInt(days_ahead);
      const suggestedRestock = needsRestock
        ? Math.ceil(predictedTotalSales * 1.2)
        : 0;

      // Nível de confiança
      const confidence = Math.min(
        (currentSales > 10 ? 80 : currentSales * 8) +
          (currentViews > 100 ? 15 : currentViews * 0.15) +
          (rating > 4 ? 5 : 0),
        95
      );

      return {
        product_id: product.id,
        name: product.name,
        current_stock: stock,
        current_sales_trend: parseFloat(avgDailySales.toFixed(2)),
        predictions: {
          daily_sales: parseFloat(predictedDailySales.toFixed(2)),
          total_sales_period: parseFloat(predictedTotalSales.toFixed(0)),
          days_until_stockout: daysUntilStockout,
          needs_restock: needsRestock,
          suggested_restock_quantity: suggestedRestock,
        },
        confidence_level: parseFloat(confidence.toFixed(1)),
        factors: {
          rating_impact: parseFloat((ratingFactor * 100).toFixed(1)),
          stock_availability: parseFloat((stockFactor * 100).toFixed(1)),
          market_trend: parseFloat((trendFactor * 100).toFixed(1)),
        },
      };
    });

    res.json({
      success: true,
      data: {
        prediction_period: `${days_ahead} dias`,
        products: predictions.sort(
          (a, b) => b.confidence_level - a.confidence_level
        ),
        summary: {
          total_products_analyzed: predictions.length,
          products_needing_restock: predictions.filter(
            p => p.predictions.needs_restock
          ).length,
          average_confidence: parseFloat(
            (
              predictions.reduce((sum, p) => sum + p.confidence_level, 0) /
              predictions.length
            ).toFixed(1)
          ),
        },
      },
      message: `Previsão de demanda calculada para ${predictions.length} produto(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na previsão de demanda:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível calcular previsão de demanda',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// OTIMIZAÇÃO DE CATEGORIAS
// ========================================
const optimizeCategories = async (req, res) => {
  try {
    // Analisar performance por categoria
    const categoryStats = await Product.findAll({
      attributes: [
        'category_name',
        [
          Product.sequelize.fn('COUNT', Product.sequelize.col('id')),
          'product_count',
        ],
        [
          Product.sequelize.fn('AVG', Product.sequelize.col('price')),
          'avg_price',
        ],
        [
          Product.sequelize.fn('SUM', Product.sequelize.col('sales_count')),
          'total_sales',
        ],
        [
          Product.sequelize.fn('AVG', Product.sequelize.col('rating_average')),
          'avg_rating',
        ],
        [
          Product.sequelize.fn('SUM', Product.sequelize.col('stock_quantity')),
          'total_stock',
        ],
      ],
      where: { status: 'active' },
      group: ['category_name'],
      having: Product.sequelize.literal('COUNT(id) > 0'),
      order: [[Product.sequelize.literal('total_sales'), 'DESC']],
    });

    const categoryAnalysis = categoryStats.map(cat => {
      const productCount = parseInt(cat.dataValues.product_count);
      const avgPrice = parseFloat(cat.dataValues.avg_price) || 0;
      const totalSales = parseInt(cat.dataValues.total_sales) || 0;
      const avgRating = parseFloat(cat.dataValues.avg_rating) || 0;
      const totalStock = parseInt(cat.dataValues.total_stock) || 0;

      // Calcular métricas de performance
      const salesPerProduct = productCount > 0 ? totalSales / productCount : 0;
      const stockTurnover = totalSales > 0 ? totalStock / totalSales : 0;

      // Score de performance da categoria
      const salesScore = Math.min(salesPerProduct / 10, 40); // Max 40 pontos
      const ratingScore = avgRating * 12; // Max 60 pontos (5 * 12)
      const performanceScore = salesScore + ratingScore;

      // Recomendações
      let recommendation = 'manter';
      let action = 'Categoria equilibrada';

      if (performanceScore > 80) {
        recommendation = 'expandir';
        action = 'Adicionar mais produtos nesta categoria de alta performance';
      } else if (performanceScore < 30) {
        recommendation = 'revisar';
        action = 'Analisar preços e qualidade dos produtos desta categoria';
      } else if (stockTurnover > 5) {
        recommendation = 'reduzir_estoque';
        action = 'Estoque muito alto em relação às vendas';
      }

      return {
        category: cat.category_name || 'Sem categoria',
        metrics: {
          product_count: productCount,
          avg_price: parseFloat(avgPrice.toFixed(2)),
          total_sales: totalSales,
          sales_per_product: parseFloat(salesPerProduct.toFixed(2)),
          avg_rating: parseFloat(avgRating.toFixed(2)),
          total_stock: totalStock,
          stock_turnover: parseFloat(stockTurnover.toFixed(2)),
        },
        performance_score: parseFloat(performanceScore.toFixed(1)),
        recommendation,
        action,
        priority:
          performanceScore > 80
            ? 'alta'
            : performanceScore > 50
              ? 'média'
              : 'baixa',
      };
    });

    res.json({
      success: true,
      data: {
        categories: categoryAnalysis,
        summary: {
          total_categories: categoryAnalysis.length,
          high_performance: categoryAnalysis.filter(c => c.priority === 'alta')
            .length,
          needs_attention: categoryAnalysis.filter(c => c.priority === 'baixa')
            .length,
          top_category: categoryAnalysis[0]?.category || 'N/A',
        },
      },
      message: `Análise de ${categoryAnalysis.length} categoria(s) concluída`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na otimização de categorias:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível otimizar categorias',
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  analyzePricing,
  predictDemand,
  optimizeCategories,
};
