// ========================================
// CONTROLLER DE SINCRONIZAÇÃO - Shopee Manager
// Lógica para sincronização com a API Shopee
// ========================================

const { Product, ShopeeAuth } = require('../models/index');
const { makeAuthenticatedRequest } = require('../config/shopee');

// ========================================
// SINCRONIZAR PRODUTOS DA SHOPEE
// ========================================
const syncProductsFromShopee = async (req, res) => {
  try {
    const { shop_id } = req.params;

    // Verificar se temos autorização para esta loja
    const auth = await ShopeeAuth.findOne({
      where: { shop_id, status: 'active' },
    });

    if (!auth) {
      return res.status(404).json({
        success: false,
        error: 'Loja não autorizada',
        message: `Loja ${shop_id} não está conectada ou autorização expirou`,
        timestamp: new Date().toISOString(),
      });
    }

    // Verificar se o token está válido
    if (!auth.isTokenValid()) {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        message: 'Token de acesso expirou. Renove a autorização.',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular sincronização (será implementado quando tivermos as credenciais)
    const simulatedProducts = [
      {
        shopee_product_id: 123456789,
        name: 'Produto Exemplo da Shopee',
        description: 'Descrição do produto sincronizado',
        price: 99.99,
        stock_quantity: 50,
        category_name: 'Eletrônicos',
        status: 'active',
      },
    ];

    let syncedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const productData of simulatedProducts) {
      try {
        const [product, created] = await Product.findOrCreate({
          where: { shopee_product_id: productData.shopee_product_id },
          defaults: {
            ...productData,
            sync_status: 'synced',
            last_sync_at: new Date(),
          },
        });

        if (!created) {
          // Atualizar produto existente
          await product.update({
            ...productData,
            sync_status: 'synced',
            last_sync_at: new Date(),
          });
          updatedCount++;
        } else {
          syncedCount++;
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar produto:', error);
        errorCount++;
      }
    }

    // Atualizar timestamp da última sincronização
    await auth.update({ last_sync_at: new Date() });

    res.json({
      success: true,
      message: 'Sincronização concluída com sucesso',
      data: {
        shop_id,
        products_synced: syncedCount,
        products_updated: updatedCount,
        errors: errorCount,
        total_processed: simulatedProducts.length,
        sync_timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível sincronizar os produtos',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// ENVIAR PRODUTO PARA SHOPEE
// ========================================
const pushProductToShopee = async (req, res) => {
  try {
    const { id } = req.params;
    const { shop_id } = req.body;

    // Buscar produto
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
        message: `Produto com ID ${id} não existe`,
        timestamp: new Date().toISOString(),
      });
    }

    // Verificar autorização
    const auth = await ShopeeAuth.findOne({
      where: { shop_id, status: 'active' },
    });

    if (!auth || !auth.isTokenValid()) {
      return res.status(401).json({
        success: false,
        error: 'Autorização inválida',
        message: 'Loja não autorizada ou token expirado',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular envio para Shopee
    const simulatedShopeeId = Math.floor(Math.random() * 1000000000);

    // Atualizar produto com ID da Shopee
    await product.update({
      shopee_product_id: simulatedShopeeId,
      sync_status: 'synced',
      last_sync_at: new Date(),
    });

    res.json({
      success: true,
      message: 'Produto enviado para Shopee com sucesso',
      data: {
        product_id: product.id,
        shopee_product_id: simulatedShopeeId,
        name: product.name,
        sync_status: 'synced',
        sync_timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao enviar produto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível enviar o produto para a Shopee',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// STATUS DA SINCRONIZAÇÃO
// ========================================
const getSyncStatus = async (req, res) => {
  try {
    // Estatísticas de sincronização
    const totalProducts = await Product.count();
    const syncedProducts = await Product.count({
      where: { sync_status: 'synced' },
    });
    const pendingProducts = await Product.count({
      where: { sync_status: 'pending' },
    });
    const errorProducts = await Product.count({
      where: { sync_status: 'error' },
    });
    const manualProducts = await Product.count({
      where: { sync_status: 'manual' },
    });

    // Lojas conectadas
    const connectedShops = await ShopeeAuth.findAll({
      where: { status: 'active' },
      attributes: ['shop_id', 'shop_name', 'last_sync_at', 'expires_at'],
    });

    // Últimas sincronizações
    const recentSyncs = await Product.findAll({
      where: { sync_status: 'synced' },
      order: [['last_sync_at', 'DESC']],
      limit: 10,
      attributes: ['id', 'name', 'shopee_product_id', 'last_sync_at'],
    });

    res.json({
      success: true,
      data: {
        summary: {
          total_products: totalProducts,
          synced_products: syncedProducts,
          pending_products: pendingProducts,
          error_products: errorProducts,
          manual_products: manualProducts,
          sync_percentage:
            totalProducts > 0
              ? ((syncedProducts / totalProducts) * 100).toFixed(2)
              : 0,
        },
        connected_shops: connectedShops.map(shop => ({
          shop_id: shop.shop_id,
          shop_name: shop.shop_name || 'Nome não definido',
          last_sync_at: shop.last_sync_at,
          token_expires_at: shop.expires_at,
          is_token_valid: shop.isTokenValid(),
        })),
        recent_syncs: recentSyncs,
      },
      message: 'Status de sincronização obtido com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao obter status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível obter status da sincronização',
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  syncProductsFromShopee,
  pushProductToShopee,
  getSyncStatus,
};
