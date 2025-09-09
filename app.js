const express = require('express');
const path = require('path');

const app = express();

console.log('🚀 Iniciando Shopee Manager...');
console.log('📁 Diretório atual:', __dirname);

app.use(express.json());

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ========================================
// ARQUIVOS ESTÁTICOS
// ========================================

app.use('/css', express.static(path.join(__dirname, 'src', 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'src', 'public', 'js')));
app.use(
  '/images',
  express.static(path.join(__dirname, 'src', 'public', 'images'))
);
app.use(express.static(path.join(__dirname, 'src', 'public')));

console.log('✅ Middleware de arquivos estáticos configurado para src/public');

// ========================================
// ROTAS PRINCIPAIS
// ========================================

app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  try {
    console.log('📊 Acessando dashboard');
    const dashboardPath = path.join(
      __dirname,
      'src',
      'views',
      'dashboard.html'
    );
    console.log('📁 Caminho do dashboard:', dashboardPath);

    const fs = require('fs');

    if (fs.existsSync(dashboardPath)) {
      console.log('✅ Dashboard encontrado, servindo arquivo');
      res.sendFile(dashboardPath);
    } else {
      console.log('❌ Dashboard não encontrado');
      res.status(404).json({
        error: 'Dashboard não encontrado',
        path_tried: dashboardPath,
        message: 'Arquivo src/views/dashboard.html não existe',
      });
    }
  } catch (error) {
    console.error('❌ Erro no dashboard:', error);
    res.status(500).json({
      error: 'Erro no dashboard',
      message: error.message,
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    structure: 'src_based',
    version: 'debug_fixed_order',
    paths: {
      dashboard: '/src/views/dashboard.html',
      css: '/src/public/css/',
      js: '/src/public/js/',
      images: '/src/public/images/',
    },
  });
});

// ========================================
// DEBUG ESPECÍFICO PARA ARQUIVOS ESTÁTICOS
// ========================================

// Debug CSS
app.get('/debug/css', (req, res) => {
  const fs = require('fs');
  const cssPath = path.join(__dirname, 'src', 'public', 'css');

  try {
    const files = fs.readdirSync(cssPath);
    const dashboardCssPath = path.join(cssPath, 'dashboard.css');

    res.json({
      css_directory: cssPath,
      files: files,
      dashboard_css_exists: fs.existsSync(dashboardCssPath),
      dashboard_css_size: fs.existsSync(dashboardCssPath)
        ? fs.statSync(dashboardCssPath).size
        : 0,
    });
  } catch (error) {
    res.json({
      error: error.message,
      css_directory: cssPath,
      directory_exists: fs.existsSync(cssPath),
    });
  }
});

// Debug JS
app.get('/debug/js', (req, res) => {
  const fs = require('fs');
  const jsPath = path.join(__dirname, 'src', 'public', 'js');

  try {
    const files = fs.readdirSync(jsPath);
    const dashboardJsPath = path.join(jsPath, 'dashboard.js');

    res.json({
      js_directory: jsPath,
      files: files,
      dashboard_js_exists: fs.existsSync(dashboardJsPath),
      dashboard_js_size: fs.existsSync(dashboardJsPath)
        ? fs.statSync(dashboardJsPath).size
        : 0,
    });
  } catch (error) {
    res.json({
      error: error.message,
      js_directory: jsPath,
      directory_exists: fs.existsSync(jsPath),
    });
  }
});

// Debug - listar arquivos
app.get('/debug/files', (req, res) => {
  try {
    const fs = require('fs');
    const files = [];

    const listDir = (dir, prefix = '') => {
      try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          if (item.startsWith('.')) return;

          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            files.push(`📁 ${prefix}${item}/`);
            if (item !== 'node_modules' && files.length < 100) {
              listDir(fullPath, prefix + item + '/');
            }
          } else {
            files.push(`📄 ${prefix}${item}`);
          }
        });
      } catch (e) {
        files.push(`❌ Erro ao ler ${dir}: ${e.message}`);
      }
    };

    listDir(__dirname);

    res.json({
      directory: __dirname,
      total_files: files.length,
      files: files,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro no debug',
      message: error.message,
    });
  }
});

// Rota manual para servir CSS (teste)
app.get('/css/dashboard.css', (req, res) => {
  const fs = require('fs');
  const cssPath = path.join(__dirname, 'src', 'public', 'css', 'dashboard.css');

  console.log('🎨 Tentando servir CSS manualmente:', cssPath);

  if (fs.existsSync(cssPath)) {
    console.log('✅ CSS encontrado, servindo...');
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(cssPath);
  } else {
    console.log('❌ CSS não encontrado');
    res.status(404).json({
      error: 'CSS não encontrado',
      path: cssPath,
      directory: __dirname,
    });
  }
});

// Rota manual para servir JS (teste)
app.get('/js/dashboard.js', (req, res) => {
  const fs = require('fs');
  const jsPath = path.join(__dirname, 'src', 'public', 'js', 'dashboard.js');

  console.log('⚡ Tentando servir JS manualmente:', jsPath);

  if (fs.existsSync(jsPath)) {
    console.log('✅ JS encontrado, servindo...');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(jsPath);
  } else {
    console.log('❌ JS não encontrado');
    res.status(404).json({
      error: 'JS não encontrado',
      path: jsPath,
      directory: __dirname,
    });
  }
});

// ========================================
// IMPORTAR ROTAS EXISTENTES
// ========================================

try {
  const benchmarkingRoutes = require('./src/routes/benchmarking');
  const authRoutes = require('./src/routes/auth');
  const productsRoutes = require('./src/routes/products');
  const reportsRoutes = require('./src/routes/reports');
  const syncRoutes = require('./src/routes/sync');
  const analyticsRoutes = require('./src/routes/analytics');
  const notificationsRoutes = require('./src/routes/notifications');

  app.use('/api/benchmarking', benchmarkingRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/notifications', notificationsRoutes);

  console.log('✅ Todas as rotas importadas com sucesso');
} catch (error) {
  console.error('⚠️ Erro ao importar algumas rotas:', error.message);
}

// ========================================
// ROTAS DE API BÁSICAS (FALLBACK)
// ========================================

app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    products: [],
    message: 'API de produtos funcionando',
    source: 'fallback',
  });
});

app.get('/api/benchmarking', (req, res) => {
  res.json({
    success: true,
    benchmarks: [],
    message: 'API de benchmarking funcionando',
    source: 'fallback',
  });
});

app.get('/api/reports', (req, res) => {
  res.json({
    success: true,
    reports: [],
    message: 'API de relatórios funcionando',
    source: 'fallback',
  });
});

// ========================================
// TRATAMENTO DE ERROS (NO FINAL!)
// ========================================

// Error handler global
app.use((error, req, res, next) => {
  console.error('🚨 ERRO GLOBAL:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: error.message,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler (SEMPRE POR ÚLTIMO!)
app.use((req, res) => {
  console.log(`❌ 404: ${req.path}`);
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
      '/debug/css',
      '/debug/js',
    ],
  });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}

console.log('✅ App configurado com estrutura src/, exportando para Vercel...');

module.exports = app;
