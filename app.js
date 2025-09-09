const express = require('express');
const path = require('path');

const app = express();

console.log('🚀 CAMINHOS CORRIGIDOS - Shopee Manager');
console.log('📁 Diretório raiz:', __dirname);

app.use(express.json());

// ========================================
// ARQUIVOS ESTÁTICOS - CAMINHOS CORRETOS DA RAIZ
// ========================================

// Servir CSS, JS e Images da pasta src/public
app.use('/css', express.static(path.join(__dirname, 'src', 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'src', 'public', 'js')));
app.use(
  '/images',
  express.static(path.join(__dirname, 'src', 'public', 'images'))
);

console.log('✅ CSS path:', path.join(__dirname, 'src', 'public', 'css'));
console.log('✅ JS path:', path.join(__dirname, 'src', 'public', 'js'));

// ========================================
// ROTAS
// ========================================

app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, 'src', 'views', 'dashboard.html');
  const fs = require('fs');

  console.log('📊 Dashboard path:', dashboardPath);

  if (fs.existsSync(dashboardPath)) {
    console.log('✅ Dashboard encontrado!');
    res.sendFile(dashboardPath);
  } else {
    console.log('❌ Dashboard NÃO encontrado');
    res.status(404).json({
      error: 'Dashboard não encontrado',
      path: dashboardPath,
    });
  }
});

// TESTE CSS
app.get('/test-css', (req, res) => {
  const fs = require('fs');
  const cssDir = path.join(__dirname, 'src', 'public', 'css');
  const cssFile = path.join(cssDir, 'dashboard.css');

  console.log('🎨 Testando CSS...');
  console.log('📁 CSS Dir:', cssDir);
  console.log('�� CSS File:', cssFile);

  try {
    const files = fs.readdirSync(cssDir);
    const cssExists = fs.existsSync(cssFile);
    const cssSize = cssExists ? fs.statSync(cssFile).size : 0;

    res.json({
      success: true,
      message: 'TESTE CSS - CAMINHOS CORRIGIDOS!',
      css_directory: cssDir,
      css_file: cssFile,
      files_in_css_dir: files,
      dashboard_css_exists: cssExists,
      dashboard_css_size: cssSize,
      __dirname: __dirname,
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      css_directory: cssDir,
      directory_exists: fs.existsSync(cssDir),
      __dirname: __dirname,
    });
  }
});

// TESTE JS
app.get('/test-js', (req, res) => {
  const fs = require('fs');
  const jsDir = path.join(__dirname, 'src', 'public', 'js');
  const jsFile = path.join(jsDir, 'dashboard.js');

  try {
    const files = fs.readdirSync(jsDir);
    const jsExists = fs.existsSync(jsFile);
    const jsSize = jsExists ? fs.statSync(jsFile).size : 0;

    res.json({
      success: true,
      message: 'TESTE JS - CAMINHOS CORRIGIDOS!',
      js_directory: jsDir,
      js_file: jsFile,
      files_in_js_dir: files,
      dashboard_js_exists: jsExists,
      dashboard_js_size: jsSize,
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      js_directory: jsDir,
      directory_exists: fs.existsSync(jsDir),
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'CAMINHOS_CORRIGIDOS_V2',
    timestamp: new Date().toISOString(),
    app_location: 'RAIZ',
    src_location: 'src/',
    __dirname: __dirname,
  });
});

// APIs básicas
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    products: [
      { id: 1, name: 'Produto Teste 1', price: 99.9 },
      { id: 2, name: 'Produto Teste 2', price: 149.9 },
    ],
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: '404',
    path: req.path,
    available_routes: [
      '/',
      '/dashboard',
      '/test-css',
      '/test-js',
      '/css/dashboard.css',
      '/js/dashboard.js',
      '/api/health',
      '/api/products',
    ],
  });
});

module.exports = app;
