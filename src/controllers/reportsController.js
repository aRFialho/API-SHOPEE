// ========================================
// CONTROLLER DE RELATÓRIOS - Shopee Manager
// Relatórios avançados com exportação
// ========================================

const { Product, ShopeeAuth } = require('../models/index');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const moment = require('moment');

// ========================================
// RELATÓRIO EXECUTIVO COMPLETO
// ========================================
const generateExecutiveReport = async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      format = 'json',
      include_charts = true,
    } = req.query;

    // Definir período padrão (últimos 30 dias)
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date
      ? new Date(start_date)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Resumo Geral
    const totalProducts = await Product.count();
    const activeProducts = await Product.count({ where: { status: 'active' } });
    const inactiveProducts = await Product.count({
      where: { status: 'inactive' },
    });
    const draftProducts = await Product.count({ where: { status: 'draft' } });

    // 2. Análise Financeira
    const totalStockValue =
      (await Product.sum('price', { where: { status: 'active' } })) || 0;
    const totalCostValue =
      (await Product.sum('cost_price', { where: { status: 'active' } })) || 0;
    const estimatedProfit = totalStockValue - totalCostValue;
    const profitMargin =
      totalStockValue > 0 ? (estimatedProfit / totalStockValue) * 100 : 0;

    // 3. Análise de Performance
    const topProducts = await Product.findAll({
      where: { status: 'active' },
      order: [['sales_count', 'DESC']],
      limit: 10,
      attributes: [
        'id',
        'name',
        'price',
        'sales_count',
        'rating_average',
        'stock_quantity',
      ],
    });

    const lowPerformers = await Product.findAll({
      where: {
        status: 'active',
        sales_count: { [Op.lte]: 5 },
      },
      order: [['sales_count', 'ASC']],
      limit: 10,
      attributes: [
        'id',
        'name',
        'price',
        'sales_count',
        'views_count',
        'created_at',
      ],
    });

    // 4. Análise de Estoque
    const lowStockProducts = await Product.findAll({
      where: {
        status: 'active',
        stock_quantity: { [Op.lte]: 5 },
      },
      order: [['stock_quantity', 'ASC']],
      attributes: [
        'id',
        'name',
        'stock_quantity',
        'min_stock_alert',
        'sales_count',
      ],
    });

    const overStockProducts = await Product.findAll({
      where: {
        status: 'active',
        stock_quantity: { [Op.gte]: 100 },
      },
      order: [['stock_quantity', 'DESC']],
      attributes: ['id', 'name', 'stock_quantity', 'sales_count', 'price'],
    });

    // 5. Análise por Categoria
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

    // 6. Métricas de Qualidade
    const avgRating = await Product.findOne({
      attributes: [
        [
          Product.sequelize.fn('AVG', Product.sequelize.col('rating_average')),
          'avg_rating',
        ],
      ],
      where: {
        status: 'active',
        rating_average: { [Op.not]: null },
      },
    });

    const productsWithoutRating = await Product.count({
      where: {
        status: 'active',
        [Op.or]: [{ rating_average: null }, { rating_average: 0 }],
      },
    });

    // 7. Análise de Tendências (simulada)
    const trendAnalysis = {
      sales_trend: 'crescimento',
      price_trend: 'estável',
      stock_trend: 'adequado',
      quality_trend: 'melhorando',
    };

    const reportData = {
      report_info: {
        generated_at: new Date().toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
        },
        report_type: 'Relatório Executivo Completo',
      },

      summary: {
        total_products: totalProducts,
        active_products: activeProducts,
        inactive_products: inactiveProducts,
        draft_products: draftProducts,
        activation_rate:
          totalProducts > 0
            ? ((activeProducts / totalProducts) * 100).toFixed(2)
            : 0,
      },

      financial_analysis: {
        total_stock_value: parseFloat(totalStockValue.toFixed(2)),
        total_cost_value: parseFloat(totalCostValue.toFixed(2)),
        estimated_profit: parseFloat(estimatedProfit.toFixed(2)),
        profit_margin_percent: parseFloat(profitMargin.toFixed(2)),
        avg_product_value:
          totalProducts > 0
            ? parseFloat((totalStockValue / activeProducts).toFixed(2))
            : 0,
      },

      performance_analysis: {
        top_performers: topProducts.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          sales: p.sales_count,
          rating: p.rating_average || 0,
          stock: p.stock_quantity,
          revenue_estimate: p.price * p.sales_count,
        })),
        low_performers: lowPerformers.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          sales: p.sales_count,
          views: p.views_count,
          days_online: Math.floor(
            (new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24)
          ),
          conversion_rate:
            p.views_count > 0
              ? ((p.sales_count / p.views_count) * 100).toFixed(2)
              : 0,
        })),
      },

      stock_analysis: {
        low_stock_alerts: lowStockProducts.length,
        overstock_items: overStockProducts.length,
        low_stock_products: lowStockProducts,
        overstock_products: overStockProducts.slice(0, 5),
        stock_efficiency: {
          total_items: activeProducts,
          well_stocked:
            activeProducts - lowStockProducts.length - overStockProducts.length,
          efficiency_rate:
            activeProducts > 0
              ? (
                  ((activeProducts -
                    lowStockProducts.length -
                    overStockProducts.length) /
                    activeProducts) *
                  100
                ).toFixed(2)
              : 0,
        },
      },

      category_analysis: categoryStats.map(cat => ({
        category: cat.category_name || 'Sem categoria',
        product_count: parseInt(cat.dataValues.product_count),
        avg_price: parseFloat((cat.dataValues.avg_price || 0).toFixed(2)),
        total_sales: parseInt(cat.dataValues.total_sales || 0),
        avg_rating: parseFloat((cat.dataValues.avg_rating || 0).toFixed(2)),
        total_stock: parseInt(cat.dataValues.total_stock || 0),
        category_value: parseFloat(
          (
            (cat.dataValues.avg_price || 0) * (cat.dataValues.total_stock || 0)
          ).toFixed(2)
        ),
      })),

      quality_metrics: {
        avg_rating: parseFloat(
          (avgRating?.dataValues?.avg_rating || 0).toFixed(2)
        ),
        products_without_rating: productsWithoutRating,
        rating_coverage:
          activeProducts > 0
            ? (
                ((activeProducts - productsWithoutRating) / activeProducts) *
                100
              ).toFixed(2)
            : 0,
        quality_score: calculateQualityScore(
          avgRating?.dataValues?.avg_rating || 0,
          productsWithoutRating,
          activeProducts
        ),
      },

      trend_analysis: trendAnalysis,

      recommendations: generateRecommendations({
        lowStockCount: lowStockProducts.length,
        overStockCount: overStockProducts.length,
        lowPerformersCount: lowPerformers.length,
        profitMargin,
        avgRating: avgRating?.dataValues?.avg_rating || 0,
      }),
    };

    // Exportar em diferentes formatos
    if (format === 'excel') {
      return await exportToExcel(reportData, res);
    } else if (format === 'pdf') {
      return await exportToPDF(reportData, res);
    }

    res.json({
      success: true,
      data: reportData,
      message: 'Relatório executivo gerado com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao gerar relatório executivo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível gerar relatório executivo',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// RELATÓRIO DE PRODUTOS DETALHADO
// ========================================
const generateProductReport = async (req, res) => {
  try {
    const {
      category,
      status,
      min_price,
      max_price,
      format = 'json',
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = req.query;

    // Construir filtros
    const where = {};
    if (category) where.category_name = { [Op.like]: `%${category}%` };
    if (status) where.status = status;
    if (min_price) where.price = { [Op.gte]: parseFloat(min_price) };
    if (max_price) {
      where.price = where.price
        ? { ...where.price, [Op.lte]: parseFloat(max_price) }
        : { [Op.lte]: parseFloat(max_price) };
    }

    // Buscar produtos
    const products = await Product.findAll({
      where,
      order: [[sort_by, sort_order.toUpperCase()]],
      attributes: [
        'id',
        'name',
        'category_name',
        'price',
        'cost_price',
        'original_price',
        'stock_quantity',
        'min_stock_alert',
        'status',
        'is_promoted',
        'sales_count',
        'views_count',
        'rating_average',
        'rating_count',
        'sync_status',
        'created_at',
        'updated_at',
        'last_sync_at',
      ],
    });

    // Calcular métricas detalhadas
    const detailedProducts = products.map(product => {
      const profit = product.cost_price
        ? product.price - product.cost_price
        : 0;
      const margin = product.cost_price ? (profit / product.price) * 100 : 0;
      const stockValue = product.price * product.stock_quantity;
      const conversionRate =
        product.views_count > 0
          ? (product.sales_count / product.views_count) * 100
          : 0;
      const daysOnline = Math.floor(
        (new Date() - new Date(product.created_at)) / (1000 * 60 * 60 * 24)
      );
      const salesVelocity =
        daysOnline > 0 ? product.sales_count / daysOnline : 0;

      return {
        id: product.id,
        name: product.name,
        category: product.category_name || 'Sem categoria',
        pricing: {
          current_price: product.price,
          cost_price: product.cost_price || 0,
          original_price: product.original_price || product.price,
          profit_per_unit: parseFloat(profit.toFixed(2)),
          margin_percent: parseFloat(margin.toFixed(2)),
          is_promoted: product.is_promoted,
        },
        inventory: {
          stock_quantity: product.stock_quantity,
          min_stock_alert: product.min_stock_alert || 5,
          stock_value: parseFloat(stockValue.toFixed(2)),
          stock_status: getStockStatus(
            product.stock_quantity,
            product.min_stock_alert
          ),
        },
        performance: {
          sales_count: product.sales_count || 0,
          views_count: product.views_count || 0,
          rating_average: product.rating_average || 0,
          rating_count: product.rating_count || 0,
          conversion_rate: parseFloat(conversionRate.toFixed(2)),
          sales_velocity: parseFloat(salesVelocity.toFixed(3)),
        },
        status: {
          product_status: product.status,
          sync_status: product.sync_status || 'manual',
          days_online: daysOnline,
          last_updated: product.updated_at,
          last_sync: product.last_sync_at,
        },
        analysis: {
          performance_score: calculateProductPerformanceScore(product),
          recommendations: getProductRecommendations(
            product,
            margin,
            conversionRate,
            salesVelocity
          ),
        },
      };
    });

    // Estatísticas do relatório
    const reportStats = {
      total_products: detailedProducts.length,
      total_value: detailedProducts.reduce(
        (sum, p) => sum + p.inventory.stock_value,
        0
      ),
      avg_margin:
        detailedProducts.length > 0
          ? detailedProducts.reduce(
              (sum, p) => sum + p.pricing.margin_percent,
              0
            ) / detailedProducts.length
          : 0,
      avg_rating:
        detailedProducts.length > 0
          ? detailedProducts.reduce(
              (sum, p) => sum + p.performance.rating_average,
              0
            ) / detailedProducts.length
          : 0,
      total_sales: detailedProducts.reduce(
        (sum, p) => sum + p.performance.sales_count,
        0
      ),
    };

    const reportData = {
      report_info: {
        generated_at: new Date().toISOString(),
        filters: { category, status, min_price, max_price },
        sort: { by: sort_by, order: sort_order },
      },
      statistics: {
        ...reportStats,
        avg_margin: parseFloat(reportStats.avg_margin.toFixed(2)),
        avg_rating: parseFloat(reportStats.avg_rating.toFixed(2)),
        total_value: parseFloat(reportStats.total_value.toFixed(2)),
      },
      products: detailedProducts,
    };

    // Exportar se solicitado
    if (format === 'excel') {
      return await exportProductsToExcel(reportData, res);
    }

    res.json({
      success: true,
      data: reportData,
      message: `Relatório de produtos gerado com ${detailedProducts.length} produto(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao gerar relatório de produtos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível gerar relatório de produtos',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function calculateQualityScore(
  avgRating,
  productsWithoutRating,
  totalProducts
) {
  const ratingScore = (avgRating / 5) * 70; // 70% do score baseado na nota média
  const coverageScore =
    totalProducts > 0
      ? ((totalProducts - productsWithoutRating) / totalProducts) * 30
      : 0; // 30% baseado na cobertura
  return parseFloat((ratingScore + coverageScore).toFixed(1));
}

function generateRecommendations(metrics) {
  const recommendations = [];

  if (metrics.lowStockCount > 5) {
    recommendations.push({
      priority: 'alta',
      category: 'estoque',
      title: 'Reabastecer produtos com estoque baixo',
      description: `${metrics.lowStockCount} produtos precisam de reposição urgente`,
      action: 'Revisar fornecedores e fazer pedidos de reposição',
    });
  }

  if (metrics.overStockCount > 3) {
    recommendations.push({
      priority: 'media',
      category: 'estoque',
      title: 'Reduzir excesso de estoque',
      description: `${metrics.overStockCount} produtos com estoque excessivo`,
      action: 'Criar promoções para acelerar vendas',
    });
  }

  if (metrics.profitMargin < 20) {
    recommendations.push({
      priority: 'alta',
      category: 'financeiro',
      title: 'Melhorar margem de lucro',
      description: `Margem atual de ${metrics.profitMargin.toFixed(1)}% está abaixo do ideal`,
      action: 'Revisar preços e custos dos produtos',
    });
  }

  if (metrics.avgRating < 4.0) {
    recommendations.push({
      priority: 'media',
      category: 'qualidade',
      title: 'Melhorar qualidade dos produtos',
      description: `Avaliação média de ${metrics.avgRating.toFixed(1)} pode ser melhorada`,
      action: 'Revisar produtos com baixa avaliação',
    });
  }

  if (metrics.lowPerformersCount > 10) {
    recommendations.push({
      priority: 'media',
      category: 'vendas',
      title: 'Otimizar produtos com baixa performance',
      description: `${metrics.lowPerformersCount} produtos com vendas baixas`,
      action: 'Revisar preços, descrições e imagens',
    });
  }

  return recommendations;
}

function getStockStatus(quantity, minAlert) {
  if (quantity <= 0) return 'sem_estoque';
  if (quantity <= (minAlert || 5)) return 'estoque_baixo';
  if (quantity > 100) return 'excesso_estoque';
  return 'adequado';
}

function calculateProductPerformanceScore(product) {
  const salesScore = Math.min((product.sales_count / 50) * 25, 25);
  const viewsScore = Math.min((product.views_count / 500) * 20, 20);
  const ratingScore = (product.rating_average || 0) * 11;
  const stockScore = product.stock_quantity > 0 ? 20 : 0;

  return parseFloat(
    (salesScore + viewsScore + ratingScore + stockScore).toFixed(1)
  );
}

function getProductRecommendations(
  product,
  margin,
  conversionRate,
  salesVelocity
) {
  const recommendations = [];

  if (margin < 15) {
    recommendations.push('Revisar preço - margem muito baixa');
  }

  if (conversionRate < 2) {
    recommendations.push('Melhorar descrição e imagens - baixa conversão');
  }

  if (salesVelocity < 0.1) {
    recommendations.push(
      'Produto com vendas muito baixas - considerar promoção'
    );
  }

  if (product.stock_quantity <= 5) {
    recommendations.push('Reabastecer urgentemente');
  }

  if ((product.rating_average || 0) < 3.5) {
    recommendations.push('Melhorar qualidade - rating baixo');
  }

  return recommendations.length > 0
    ? recommendations
    : ['Produto com performance adequada'];
}

// ========================================
// EXPORTAÇÃO PARA EXCEL
// ========================================
async function exportToExcel(reportData, res) {
  const workbook = new ExcelJS.Workbook();

  // Aba 1: Resumo Executivo
  const summarySheet = workbook.addWorksheet('Resumo Executivo');

  // Cabeçalho
  summarySheet.addRow(['RELATÓRIO EXECUTIVO - SHOPEE MANAGER']);
  summarySheet.addRow([`Gerado em: ${moment().format('DD/MM/YYYY HH:mm:ss')}`]);
  summarySheet.addRow([]);

  // Resumo Geral
  summarySheet.addRow(['RESUMO GERAL']);
  summarySheet.addRow(['Total de Produtos', reportData.summary.total_products]);
  summarySheet.addRow(['Produtos Ativos', reportData.summary.active_products]);
  summarySheet.addRow([
    'Produtos Inativos',
    reportData.summary.inactive_products,
  ]);
  summarySheet.addRow([
    'Taxa de Ativação',
    `${reportData.summary.activation_rate}%`,
  ]);
  summarySheet.addRow([]);

  // Análise Financeira
  summarySheet.addRow(['ANÁLISE FINANCEIRA']);
  summarySheet.addRow([
    'Valor Total do Estoque',
    `R$ ${reportData.financial_analysis.total_stock_value}`,
  ]);
  summarySheet.addRow([
    'Valor Total de Custo',
    `R$ ${reportData.financial_analysis.total_cost_value}`,
  ]);
  summarySheet.addRow([
    'Lucro Estimado',
    `R$ ${reportData.financial_analysis.estimated_profit}`,
  ]);
  summarySheet.addRow([
    'Margem de Lucro',
    `${reportData.financial_analysis.profit_margin_percent}%`,
  ]);

  // Aba 2: Top Produtos
  const topProductsSheet = workbook.addWorksheet('Top Produtos');
  topProductsSheet.addRow([
    'ID',
    'Nome',
    'Preço',
    'Vendas',
    'Rating',
    'Estoque',
    'Receita Estimada',
  ]);

  reportData.performance_analysis.top_performers.forEach(product => {
    topProductsSheet.addRow([
      product.id,
      product.name,
      product.price,
      product.sales,
      product.rating,
      product.stock,
      product.revenue_estimate,
    ]);
  });

  // Aba 3: Análise por Categoria
  const categorySheet = workbook.addWorksheet('Análise por Categoria');
  categorySheet.addRow([
    'Categoria',
    'Qtd Produtos',
    'Preço Médio',
    'Total Vendas',
    'Rating Médio',
    'Estoque Total',
    'Valor da Categoria',
  ]);

  reportData.category_analysis.forEach(category => {
    categorySheet.addRow([
      category.category,
      category.product_count,
      category.avg_price,
      category.total_sales,
      category.avg_rating,
      category.total_stock,
      category.category_value,
    ]);
  });

  // Configurar resposta
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=relatorio-executivo-${moment().format('YYYY-MM-DD')}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
}

async function exportProductsToExcel(reportData, res) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório de Produtos');

  // Cabeçalhos
  worksheet.addRow([
    'ID',
    'Nome',
    'Categoria',
    'Preço Atual',
    'Preço de Custo',
    'Margem %',
    'Estoque',
    'Status Estoque',
    'Vendas',
    'Visualizações',
    'Taxa Conversão %',
    'Rating',
    'Status',
    'Dias Online',
    'Score Performance',
    'Recomendações',
  ]);

  // Dados dos produtos
  reportData.products.forEach(product => {
    worksheet.addRow([
      product.id,
      product.name,
      product.category,
      product.pricing.current_price,
      product.pricing.cost_price,
      product.pricing.margin_percent,
      product.inventory.stock_quantity,
      product.inventory.stock_status,
      product.performance.sales_count,
      product.performance.views_count,
      product.performance.conversion_rate,
      product.performance.rating_average,
      product.status.product_status,
      product.status.days_online,
      product.analysis.performance_score,
      product.analysis.recommendations.join('; '),
    ]);
  });

  // Configurar resposta
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=relatorio-produtos-${moment().format('YYYY-MM-DD')}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = {
  generateExecutiveReport,
  generateProductReport,
};
