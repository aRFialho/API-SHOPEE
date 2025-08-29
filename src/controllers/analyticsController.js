// ========================================
// CONTROLLER DE ANALYTICS - Shopee Manager
// ========================================

const { Product, Order, ShopeeAuth } = require('../models/index');
const { Op } = require('sequelize');

// ========================================
// DASHBOARD PRINCIPAL
// ========================================
const getDashboardData = async (req, res) => {
  try {
    const { period = '30' } = req.query; // Período em dias
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Estatísticas de produtos
    const productStats = {
      total: await Product.count(),
      active: await Product.count({ where: { status: 'active' } }),
      inactive: await Product.count({ where: { status: 'inactive' } }),
      draft: await Product.count({ where: { status: 'draft' } }),
      low_stock: await Product.count({
        where: {
          stock_quantity: { [Op.lte]: 5 },
        },
      }),
    };

    // Valor total do estoque
    const stockValue =
      (await Product.sum('price', {
        where: { status: 'active' },
      })) || 0;

    // Produtos mais vendidos (simulado)
    const topProducts = await Product.findAll({
      where: { status: 'active' },
      order: [['sales_count', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'price', 'sales_count', 'stock_quantity'],
    });

    // Produtos com estoque baixo
    const lowStockProducts = await Product.findAll({
      where: {
        status: 'active',
        stock_quantity: { [Op.lte]: 5 },
      },
      order: [['stock_quantity', 'ASC']],
      limit: 10,
      attributes: ['id', 'name', 'stock_quantity', 'min_stock_alert'],
    });

    // Estatísticas de sincronização
    const syncStats = {
      synced: await Product.count({ where: { sync_status: 'synced' } }),
      pending: await Product.count({ where: { sync_status: 'pending' } }),
      error: await Product.count({ where: { sync_status: 'error' } }),
      manual: await Product.count({ where: { sync_status: 'manual' } }),
    };

    // Lojas conectadas
    const connectedShops = await ShopeeAuth.count({
      where: { status: 'active' },
    });

    res.json({
      success: true,
      data: {
        period_days: parseInt(period),
        products: productStats,
        stock_value: stockValue,
        top_products: topProducts,
        low_stock_products: lowStockProducts,
        sync_status: syncStats,
        connected_shops: connectedShops,
        last_updated: new Date().toISOString(),
      },
      message: 'Dashboard carregado com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar o dashboard',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// RELATÓRIO DE PRODUTOS
// ========================================
const getProductsReport = async (req, res) => {
  try {
    const { category, status, sync_status, format = 'json' } = req.query;

    // Construir filtros
    const where = {};
    if (category) where.category_name = { [Op.like]: `%${category}%` };
    if (status) where.status = status;
    if (sync_status) where.sync_status = sync_status;

    // Buscar produtos
    const products = await Product.findAll({
      where,
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'name',
        'category_name',
        'price',
        'cost_price',
        'stock_quantity',
        'status',
        'sync_status',
        'sales_count',
        'created_at',
        'last_sync_at',
      ],
    });

    // Calcular métricas
    const totalValue = products.reduce(
      (sum, p) => sum + p.price * p.stock_quantity,
      0
    );
    const totalCost = products.reduce(
      (sum, p) => sum + (p.cost_price || 0) * p.stock_quantity,
      0
    );
    const totalProfit = totalValue - totalCost;

    // Agrupar por categoria
    const byCategory = products.reduce((acc, product) => {
      const cat = product.category_name || 'Sem categoria';
      if (!acc[cat]) {
        acc[cat] = { count: 0, value: 0 };
      }
      acc[cat].count++;
      acc[cat].value += product.price * product.stock_quantity;
      return acc;
    }, {});

    const reportData = {
      summary: {
        total_products: products.length,
        total_stock_value: totalValue,
        total_cost_value: totalCost,
        estimated_profit: totalProfit,
        profit_margin:
          totalValue > 0 ? ((totalProfit / totalValue) * 100).toFixed(2) : 0,
      },
      by_category: byCategory,
      products: products.map(p => ({
        ...p.toJSON(),
        stock_value: p.price * p.stock_quantity,
        profit_per_unit: p.cost_price ? p.price - p.cost_price : null,
      })),
    };

    res.json({
      success: true,
      data: reportData,
      filters: { category, status, sync_status },
      message: `Relatório gerado com ${products.length} produto(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível gerar o relatório',
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getDashboardData,
  getProductsReport,
};
