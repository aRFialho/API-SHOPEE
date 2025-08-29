// ========================================
// ROTAS DE RELATÓRIOS - Shopee Manager
// ========================================

const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

// GET /reports/executive - Relatório executivo completo
router.get('/executive', reportsController.generateExecutiveReport);

// GET /reports/products - Relatório detalhado de produtos
router.get('/products', reportsController.generateProductReport);

module.exports = router;
