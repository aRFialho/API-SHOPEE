const express = require('express');
const router = express.Router();
const {
  generateAuthUrl,
  makeAuthenticatedRequest,
  getAccessToken,
  SHOPEE_CONFIG,
} = require('../config/shopee');

// ========================================
// CONECTAR SUA LOJA SHOPEE
// ========================================

// Gerar URL para conectar SUA loja
router.get('/connect', (req, res) => {
  try {
    const authUrl = generateAuthUrl();

    res.json({
      success: true,
      auth_url: authUrl,
      message: 'Clique no link para conectar sua loja Shopee',
      instructions: [
        '1. Clique no auth_url abaixo',
        '2. Faça login na SUA conta Shopee',
        '3. Autorize o acesso aos seus produtos',
        '4. Volte aqui para gerenciar sua loja',
      ],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar URL de conexão',
      error: error.message,
    });
  }
});

// Status da conexão da SUA loja
router.get('/status', (req, res) => {
  try {
    // Verificar se tem access_token salvo (você vai implementar storage)
    const isConnected = false; // Por enquanto false, depois implementamos storage

    res.json({
      success: true,
      connected: isConnected,
      message: isConnected
        ? 'Sua loja está conectada!'
        : 'Conecte sua loja primeiro',
      features: {
        manage_products: isConnected,
        update_prices: isConnected,
        manage_promotions: isConnected,
        control_stock: isConnected,
        delivery_settings: isConnected,
      },
      next_step: isConnected
        ? 'Gerencie seus produtos'
        : 'Conecte sua loja usando /api/my-shopee/connect',
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
// GERENCIAR SEUS PRODUTOS
// ========================================

// Listar SEUS produtos
router.get('/products', async (req, res) => {
  try {
    // Por enquanto retorna exemplo, depois implementamos com access_token real
    res.json({
      success: true,
      message: 'Conecte sua loja primeiro para ver seus produtos reais',
      products: [],
      total: 0,
      pagination: {
        page: 1,
        limit: 50,
        total_pages: 0,
      },
      actions_available: [
        'Conectar loja',
        'Listar produtos',
        'Atualizar preços',
        'Gerenciar estoque',
        'Controlar promoções',
      ],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar seus produtos',
      error: error.message,
    });
  }
});

// Atualizar preço de um produto SEU
router.put('/products/:product_id/price', async (req, res) => {
  try {
    const { product_id } = req.params;
    const { new_price } = req.body;

    if (!new_price) {
      return res.status(400).json({
        success: false,
        message: 'Novo preço é obrigatório',
      });
    }

    // Aqui implementaremos a chamada real da API Shopee
    res.json({
      success: true,
      message: `Preço do produto ${product_id} será atualizado para R$ ${new_price}`,
      product_id,
      old_price: 'A definir',
      new_price,
      status: 'pending_connection',
      note: 'Conecte sua loja primeiro para atualizar preços reais',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar preço',
      error: error.message,
    });
  }
});

// Atualizar estoque
router.put('/products/:product_id/stock', async (req, res) => {
  try {
    const { product_id } = req.params;
    const { new_stock } = req.body;

    res.json({
      success: true,
      message: `Estoque do produto ${product_id} será atualizado para ${new_stock}`,
      product_id,
      new_stock,
      status: 'pending_connection',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar estoque',
      error: error.message,
    });
  }
});

// Gerenciar promoções
router.post('/products/:product_id/promotion', async (req, res) => {
  try {
    const { product_id } = req.params;
    const { discount_percentage, start_date, end_date } = req.body;

    res.json({
      success: true,
      message: `Promoção criada para produto ${product_id}`,
      promotion: {
        product_id,
        discount_percentage,
        start_date,
        end_date,
        status: 'pending_connection',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar promoção',
      error: error.message,
    });
  }
});

// ========================================
// DASHBOARD DA SUA LOJA
// ========================================

// Dados do dashboard da SUA loja
router.get('/dashboard', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Dashboard da sua loja Shopee',
      data: {
        total_products: 0,
        total_orders: 0,
        total_revenue: 0,
        pending_orders: 0,
        low_stock_products: 0,
        active_promotions: 0,
      },
      status: 'awaiting_connection',
      note: 'Conecte sua loja para ver dados reais',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar dashboard',
      error: error.message,
    });
  }
});

// Pedidos da SUA loja
router.get('/orders', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Pedidos da sua loja',
      orders: [],
      total: 0,
      status: 'awaiting_connection',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pedidos',
      error: error.message,
    });
  }
});

module.exports = router;
