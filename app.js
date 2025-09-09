const express = require('express');
const path = require('path');
const app = express();

console.log('�� Shopee Manager - Versão Completa');

app.use(express.json());

// ========================================
// ARQUIVOS ESTÁTICOS
// ========================================
app.use('/css', express.static(path.join(__dirname, 'src', 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'src', 'public', 'js')));
app.use(
  '/images',
  express.static(path.join(__dirname, 'src', 'public', 'images'))
);

console.log('✅ Arquivos estáticos configurados');
console.log('📁 CSS:', path.join(__dirname, 'src', 'public', 'css'));
console.log('📁 JS:', path.join(__dirname, 'src', 'public', 'js'));

// ========================================
// ROTAS PRINCIPAIS
// ========================================
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, 'src', 'views', 'dashboard.html');
  console.log('📊 Servindo dashboard:', dashboardPath);
  res.sendFile(dashboardPath);
});

// ========================================
// APIs
// ========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'COMPLETO_V1',
    timestamp: new Date().toISOString(),
    message: 'Shopee Manager funcionando perfeitamente!',
    features: ['dashboard', 'products', 'benchmarking', 'reports'],
  });
});

app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    message: 'API de produtos funcionando',
    products: [
      {
        id: 1,
        name: 'Sofá 3 Lugares',
        category: 'Móveis e Estofados',
        price: 899.9,
        stock: 15,
      },
      {
        id: 2,
        name: 'Mesa de Centro',
        category: 'Móveis e Estofados',
        price: 299.9,
        stock: 8,
      },
    ],
  });
});

app.get('/api/benchmarking', (req, res) => {
  res.json({
    success: true,
    message: 'API de benchmarking funcionando',
    data: {
      category: 'Móveis e Estofados',
      competitors: 3,
      last_update: new Date().toISOString(),
    },
  });
});

app.get('/api/reports', (req, res) => {
  res.json({
    success: true,
    message: 'API de relatórios funcionando',
    available_reports: ['sales', 'inventory', 'competitors'],
  });
});

// ========================================
// DEBUG ROUTES
// ========================================
app.get('/debug/files', (req, res) => {
  const fs = require('fs');

  try {
    const srcPath = path.join(__dirname, 'src');
    const files = fs.readdirSync(srcPath, { recursive: true });

    res.json({
      success: true,
      src_directory: srcPath,
      files: files,
      total_files: files.length,
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      src_directory: path.join(__dirname, 'src'),
    });
  }
});

// ========================================
// 404 HANDLER
// ========================================
app.use((req, res) => {
  res.status(404).json({
    error: '404 - Não encontrado',
    path: req.path,
    method: req.method,
    available_routes: [
      '/',
      '/dashboard',
      '/api/health',
      '/api/products',
      '/api/benchmarking',
      '/api/reports',
      '/debug/files',
    ],
  });
});

module.exports = app;
