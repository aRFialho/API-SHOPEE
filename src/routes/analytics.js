// ========================================
// ROTAS DE ANALYTICS - Shopee Manager
// ========================================

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /analytics/dashboard - Dashboard principal
router.get('/dashboard', analyticsController.getDashboardData);

// GET /analytics/products - Relatório de produtos
router.get('/products', analyticsController.getProductsReport);

module.exports = router;
