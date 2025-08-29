// ========================================
// ROTAS DE NOTIFICAÇÕES - Shopee Manager
// ========================================

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// GET /notifications/alerts - Gerar alertas inteligentes
router.get('/alerts', notificationController.generateAlerts);

// GET /notifications/dashboard - Dashboard de notificações
router.get('/dashboard', notificationController.getNotificationDashboard);

module.exports = router;
