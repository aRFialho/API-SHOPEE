// ========================================
// ROTAS DE BENCHMARKING - Shopee Manager
// ========================================

const express = require('express');
const router = express.Router();
const benchmarkingController = require('../controllers/benchmarkingController');

// GET /benchmarking/category - Benchmarking por categoria
router.get('/category', benchmarkingController.analyzeCategoryBenchmark);

// GET /benchmarking/product/:id - Benchmarking de produto específico
router.get('/product/:id', benchmarkingController.analyzeProductBenchmark);

// GET /benchmarking/trends - Análise de tendências de mercado
router.get('/trends', benchmarkingController.analyzeMarketTrends);

module.exports = router;
