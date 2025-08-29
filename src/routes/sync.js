// ========================================
// ROTAS DE SINCRONIZAÇÃO - Shopee Manager
// ========================================

const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// GET /sync/status - Status geral da sincronização
router.get('/status', syncController.getSyncStatus);

// POST /sync/products/:shop_id - Sincronizar produtos de uma loja
router.post('/products/:shop_id', syncController.syncProductsFromShopee);

// POST /sync/push/:id - Enviar produto específico para Shopee
router.post('/push/:id', syncController.pushProductToShopee);

module.exports = router;
