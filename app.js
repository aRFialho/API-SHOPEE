const express = require('express');
const path = require('path');

const app = express();

console.log('🚀 TESTE DEFINITIVO - Shopee Manager');

app.use(express.json());

// ========================================
// ROTAS DE TESTE
// ========================================

app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, 'src', 'views', 'dashboard.html');
  const fs = require('fs');

  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.status(404).json({
      error: 'Dashboard não encontrado',
      path: dashboardPath,
    });
  }
});

// TESTE CSS - ROTA SIMPLES
app.get('/test-css', (req, res) => {
  const fs = require('fs');
  const cssPath = path.join(__dirname, 'src', 'public', 'css');

  try {
    const files = fs.readdirSync(cssPath);
    res.json({
      success: true,
      message: 'TESTE CSS FUNCIONANDO!',
      css_directory: cssPath,
      files: files,
      dashboard_css_exists: fs.existsSync(path.join(cssPath, 'dashboard.css')),
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      css_directory: cssPath,
    });
  }
});

// SERVIR CSS DIRETAMENTE
app.get('/css/dashboard.css', (req, res) => {
  const fs = require('fs');
  const cssPath = path.join(__dirname, 'src', 'public', 'css', 'dashboard.css');

  console.log('🎨 Servindo CSS:', cssPath);

  if (fs.existsSync(cssPath)) {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(cssPath);
  } else {
    res.status(404).json({
      error: 'CSS não encontrado',
      path: cssPath,
    });
  }
});

// SERVIR JS DIRETAMENTE
app.get('/js/dashboard.js', (req, res) => {
  const fs = require('fs');
  const jsPath = path.join(__dirname, 'src', 'public', 'js', 'dashboard.js');

  console.log('⚡ Servindo JS:', jsPath);

  if (fs.existsSync(jsPath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(jsPath);
  } else {
    res.status(404).json({
      error: 'JS não encontrado',
      path: jsPath,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'TESTE_DEFINITIVO_123',
    timestamp: new Date().toISOString(),
    message: 'Se você vê esta versão, o deploy funcionou!',
  });
});

// 404 handler (sempre por último)
app.use((req, res) => {
  res.status(404).json({
    error: '404',
    path: req.path,
    available_routes: [
      '/',
      '/dashboard',
      '/test-css',
      '/css/dashboard.css',
      '/js/dashboard.js',
      '/api/health',
    ],
  });
});

module.exports = app;
