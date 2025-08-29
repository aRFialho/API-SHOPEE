// ========================================
// ROTAS DE IA - Shopee Manager
// ========================================

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// GET /ai/pricing - Análise de preços com IA
router.get('/pricing', aiController.analyzePricing);

// GET /ai/demand - Previsão de demanda
router.get('/demand', aiController.predictDemand);

// GET /ai/categories - Otimização de categorias
router.get('/categories', aiController.optimizeCategories);

module.exports = router;
