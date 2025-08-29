// ========================================
// ROTAS DE AUTOMAÇÃO - Shopee Manager
// ========================================

const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');

// POST /automation/prices - Automação de preços
router.post('/prices', automationController.runPriceAutomation);

// POST /automation/stock - Automação de estoque
router.post('/stock', automationController.runStockAutomation);

// POST /automation/promotions - Automação de promoções
router.post('/promotions', automationController.runPromotionAutomation);

// POST /automation/specific - Automação específica por produto
router.post('/specific', automationController.runProductSpecificAutomation);

module.exports = router;
