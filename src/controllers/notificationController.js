// ========================================
// CONTROLLER DE NOTIFICAÇÕES - Shopee Manager
// ========================================

const { Product, ShopeeAuth } = require('../models/index');
const { Op } = require('sequelize');

// ========================================
// GERAR ALERTAS INTELIGENTES
// ========================================
const generateAlerts = async (req, res) => {
  try {
    const alerts = [];

    // 1. Alertas de estoque baixo
    const lowStockProducts = await Product.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          {
            stock_quantity: {
              [Op.lte]: Product.sequelize.col('min_stock_alert'),
            },
          },
          { stock_quantity: { [Op.lte]: 5 } },
        ],
      },
      attributes: [
        'id',
        'name',
        'stock_quantity',
        'min_stock_alert',
        'sales_count',
      ],
    });

    lowStockProducts.forEach(product => {
      const urgency =
        product.stock_quantity === 0
          ? 'crítica'
          : product.stock_quantity <= 2
            ? 'alta'
            : 'média';

      alerts.push({
        type: 'estoque_baixo',
        urgency,
        product_id: product.id,
        product_name: product.name,
        message: `Estoque baixo: apenas ${product.stock_quantity} unidades restantes`,
        current_stock: product.stock_quantity,
        min_alert: product.min_stock_alert,
        suggested_action:
          product.stock_quantity === 0
            ? 'Reabastecer imediatamente'
            : `Reabastecer quando atingir ${Math.max(product.min_stock_alert, 5)} unidades`,
        created_at: new Date().toISOString(),
      });
    });

    // 2. Alertas de produtos sem vendas
    const noSalesProducts = await Product.findAll({
      where: {
        status: 'active',
        sales_count: 0,
        created_at: {
          [Op.lte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        }, // 7 dias
      },
      attributes: ['id', 'name', 'price', 'views_count', 'created_at'],
    });

    noSalesProducts.forEach(product => {
      const daysOnline = Math.floor(
        (new Date() - new Date(product.created_at)) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        type: 'sem_vendas',
        urgency: daysOnline > 30 ? 'alta' : 'média',
        product_id: product.id,
        product_name: product.name,
        message: `Produto sem vendas há ${daysOnline} dias`,
        days_online: daysOnline,
        views_count: product.views_count,
        suggested_action:
          product.views_count < 10
            ? 'Revisar título e imagens do produto'
            : 'Considerar redução de preço ou promoção',
        created_at: new Date().toISOString(),
      });
    });

    // 3. Alertas de preços desatualizados
    const outdatedPrices = await Product.findAll({
      where: {
        status: 'active',
        updated_at: {
          [Op.lte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        }, // 30 dias
      },
      attributes: ['id', 'name', 'price', 'updated_at', 'sales_count'],
    });

    outdatedPrices.forEach(product => {
      const daysOld = Math.floor(
        (new Date() - new Date(product.updated_at)) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        type: 'preco_desatualizado',
        urgency: 'baixa',
        product_id: product.id,
        product_name: product.name,
        message: `Preço não atualizado há ${daysOld} dias`,
        days_since_update: daysOld,
        current_price: product.price,
        suggested_action:
          'Revisar preço com base na concorrência e performance',
        created_at: new Date().toISOString(),
      });
    });

    // 4. Alertas de tokens expirados
    const expiredTokens = await ShopeeAuth.findAll({
      where: {
        [Op.or]: [
          {
            expires_at: {
              [Op.lte]: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          }, // Expira em 24h
          { status: 'expired' },
        ],
      },
    });

    expiredTokens.forEach(auth => {
      const hoursUntilExpiry = Math.floor(
        (new Date(auth.expires_at) - new Date()) / (1000 * 60 * 60)
      );

      alerts.push({
        type: 'token_expirando',
        urgency: hoursUntilExpiry <= 0 ? 'crítica' : 'alta',
        shop_id: auth.shop_id,
        shop_name: auth.shop_name || 'Loja não identificada',
        message:
          hoursUntilExpiry <= 0
            ? 'Token de acesso expirado'
            : `Token expira em ${hoursUntilExpiry} horas`,
        expires_at: auth.expires_at,
        suggested_action: 'Renovar autorização da loja',
        created_at: new Date().toISOString(),
      });
    });

    // Ordenar por urgência
    const urgencyOrder = { crítica: 3, alta: 2, média: 1, baixa: 0 };
    alerts.sort((a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]);

    // Estatísticas
    const alertStats = {
      total: alerts.length,
      critica: alerts.filter(a => a.urgency === 'crítica').length,
      alta: alerts.filter(a => a.urgency === 'alta').length,
      media: alerts.filter(a => a.urgency === 'média').length,
      baixa: alerts.filter(a => a.urgency === 'baixa').length,
    };

    res.json({
      success: true,
      data: {
        alerts,
        statistics: alertStats,
        summary: {
          requires_immediate_action: alertStats.critica + alertStats.alta,
          total_products_affected: new Set(
            alerts.filter(a => a.product_id).map(a => a.product_id)
          ).size,
          last_generated: new Date().toISOString(),
        },
      },
      message: `${alerts.length} alerta(s) gerado(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao gerar alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível gerar alertas',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// DASHBOARD DE NOTIFICAÇÕES
// ========================================
const getNotificationDashboard = async (req, res) => {
  try {
    // Reutilizar lógica de alertas
    const alertsResponse = await generateAlerts(req, res);

    // Se chegou aqui, não houve resposta ainda (não deveria acontecer)
    // Esta função é mais para demonstrar estrutura
  } catch (error) {
    console.error('❌ Erro no dashboard de notificações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar dashboard de notificações',
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  generateAlerts,
  getNotificationDashboard,
};
