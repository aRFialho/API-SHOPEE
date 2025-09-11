const express = require('express');
const path = require('path');
const app = express();

console.log('🚀 Iniciando Shopee Manager - Versão Completa');

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
  console.log('📄 Servindo dashboard:', dashboardPath);
  res.sendFile(dashboardPath);
});

// Callback da Shopee
app.get('/auth/shopee/callback', (req, res) => {
  const { code, shop_id } = req.query;

  if (code && shop_id) {
    console.log('✅ Autorização Shopee recebida:', {
      code: code.substring(0, 10) + '...',
      shop_id,
    });

    res.send(`
      <html>
        <head>
          <title>Shopee - Autorização Concluída</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              margin: 0;
            }
            .container {
              background: rgba(255,255,255,0.1);
              padding: 40px;
              border-radius: 15px;
              backdrop-filter: blur(10px);
              max-width: 500px;
              margin: 0 auto;
            }
            h1 { font-size: 2.5em; margin-bottom: 20px; }
            .success-icon { font-size: 4em; margin-bottom: 20px; }
            .info { background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; margin: 20px 0; }
            .countdown { font-size: 1.2em; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">🎉</div>
            <h1>Autorização Shopee Concluída!</h1>
            <div class="info">
              <p><strong>Shop ID:</strong> ${shop_id}</p>
              <p><strong>Code:</strong> ${code.substring(0, 20)}...</p>
            </div>
            <p>Sua loja foi conectada com sucesso ao Shopee Manager!</p>
            <div class="countdown">
              Esta janela será fechada em <span id="timer">5</span> segundos...
            </div>
          </div>
          <script>
            let countdown = 5;
            const timer = document.getElementById('timer');
            const interval = setInterval(() => {
              countdown--;
              timer.textContent = countdown;
              if (countdown <= 0) {
                clearInterval(interval);
                window.close();
              }
            }, 1000);
          </script>
        </body>
      </html>
    `);
  } else {
    res.status(400).send(`
      <html>
        <head>
          <title>Shopee - Erro na Autorização</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              color: white;
              margin: 0;
            }
            .container {
              background: rgba(255,255,255,0.1);
              padding: 40px;
              border-radius: 15px;
              backdrop-filter: blur(10px);
              max-width: 500px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Erro na Autorização</h1>
            <p>Parâmetros inválidos recebidos da Shopee.</p>
            <p>Tente novamente ou entre em contato com o suporte.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// ========================================
// APIs - INCLUINDO SHOPEE
// ========================================

// Carregar rotas da Shopee
try {
  const shopeeRoutes = require('./src/routes/shopee');
  app.use('/api/shopee', shopeeRoutes);
  console.log('✅ Rotas da Shopee carregadas com sucesso');
} catch (error) {
  console.error('❌ Erro ao carregar rotas da Shopee:', error.message);
}

// Carregar rotas da SUA loja Shopee
try {
  const myShopeeRoutes = require('./src/routes/my-shopee');
  app.use('/api/my-shopee', myShopeeRoutes);
  console.log('✅ Rotas da SUA loja Shopee carregadas com sucesso');
} catch (error) {
  console.error('❌ Erro ao carregar rotas da sua loja:', error.message);
}
try {
  const shopeeRoutes = require('./src/routes/shopee');
  app.use('/api/shopee', shopeeRoutes);
  console.log('✅ Rotas da Shopee carregadas com sucesso');
} catch (error) {
  console.error('❌ Erro ao carregar rotas da Shopee:', error.message);
}

// Carregar rotas da SUA loja Shopee
try {
  const myShopeeRoutes = require('./src/routes/my-shopee');
  app.use('/api/my-shopee', myShopeeRoutes);
  console.log('✅ Rotas da SUA loja Shopee carregadas com sucesso');
} catch (error) {
  console.error('❌ Erro ao carregar rotas da sua loja:', error.message);
}
try {
  const shopeeRoutes = require('./src/routes/shopee');
  app.use('/api/shopee', shopeeRoutes);
  console.log('✅ Rotas da Shopee carregadas com sucesso');
} catch (error) {
  console.error('❌ Erro ao carregar rotas da Shopee:', error.message);

  // Fallback: criar rotas básicas da Shopee
  app.get('/api/shopee/status', (req, res) => {
    res.json({
      success: false,
      message: 'Arquivo de rotas da Shopee não encontrado',
      error: error.message,
      fix: 'Verifique se o arquivo src/routes/shopee.js existe',
    });
  });

  app.get('/api/shopee/auth/url', (req, res) => {
    res.json({
      success: false,
      message: 'Arquivo de rotas da Shopee não encontrado',
      error: error.message,
    });
  });
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'COMPLETO_V2',
    timestamp: new Date().toISOString(),
    message: 'Shopee Manager funcionando perfeitamente!',
    features: [
      'dashboard',
      'shopee_integration',
      'real_time_scraping',
      'price_analysis',
      'benchmarking',
      'reports',
    ],
    environment: process.env.NODE_ENV || 'development',
    shopee_config: {
      partner_id: process.env.SHOPEE_PARTNER_ID ? '***' : 'NOT_SET',
      environment:
        process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    },
    routes_loaded: {
      shopee:
        !!require.cache[
          require.resolve('./src/routes/shopee.js', { paths: [__dirname] })
        ],
    },
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

app.get('/debug/shopee', (req, res) => {
  const fs = require('fs');

  try {
    const shopeeRoutesPath = path.join(__dirname, 'src', 'routes', 'shopee.js');
    const shopeeConfigPath = path.join(__dirname, 'src', 'config', 'shopee.js');

    res.json({
      success: true,
      files_check: {
        routes_exists: fs.existsSync(shopeeRoutesPath),
        config_exists: fs.existsSync(shopeeConfigPath),
        routes_path: shopeeRoutesPath,
        config_path: shopeeConfigPath,
      },
      environment_vars: {
        partner_id: process.env.SHOPEE_PARTNER_ID ? '***' : 'NOT_SET',
        partner_key: process.env.SHOPEE_PARTNER_KEY ? '***' : 'NOT_SET',
        node_env: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
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
      '/api/shopee/status',
      '/api/shopee/auth/url',
      '/api/shopee/test',
      '/api/shopee/products/search',
      '/api/shopee/analysis/prices',
      '/auth/shopee/callback',
      '/debug/files',
      '/debug/shopee',
    ],
  });
});

// ========================================
// SERVIDOR
// ========================================
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🌟 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🛍️ Shopee Status: http://localhost:${PORT}/api/shopee/status`);
    console.log(`🔧 Debug Shopee: http://localhost:${PORT}/debug/shopee`);
  });
}

module.exports = app;
