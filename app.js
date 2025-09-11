const express = require('express');
const path = require('path');
const app = express();

console.log('🚀 Iniciando Shopee Manager - Gerenciador da SUA Loja');

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
          <title>Shopee - Sua Loja Conectada!</title>
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">🎉</div>
            <h1>SUA Loja Shopee Conectada!</h1>
            <div class="info">
              <p><strong>Shop ID:</strong> ${shop_id}</p>
              <p><strong>Code:</strong> ${code.substring(0, 20)}...</p>
            </div>
            <p>Agora você pode gerenciar seus produtos, preços e estoque!</p>
            <button onclick="window.close()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">
              Fechar e Voltar ao Dashboard
            </button>
          </div>
        </body>
      </html>
    `);
  } else {
    res.status(400).send('Erro na autorização da sua loja Shopee');
  }
});

// ========================================
// ROTAS DA SUA LOJA SHOPEE
// ========================================

// Conectar SUA loja
app.get('/api/my-shopee/connect', (req, res) => {
  try {
    // Gerar URL de autorização para SUA loja
    const timestamp = Math.floor(Date.now() / 1000);
    const partner_id = process.env.SHOPEE_PARTNER_ID || '1185765';
    const redirect_url =
      'https://shopee-manager-38y4vipxp-raphaels-projects-11cd9f6b.vercel.app/auth/shopee/callback';

    const authUrl = `https://partner.test-stable.shopeemobile.com/api/v2/shop/auth_partner?partner_id=${partner_id}&timestamp=${timestamp}&redirect=${encodeURIComponent(redirect_url)}`;

    res.json({
      success: true,
      auth_url: authUrl,
      message: 'Clique no link para conectar SUA loja Shopee',
      instructions: [
        '1. Clique no auth_url abaixo',
        '2. Faça login na SUA conta Shopee (a que tem milhares de produtos)',
        '3. Autorize o acesso aos seus produtos',
        '4. Volte aqui para gerenciar sua loja',
      ],
      shop_info: {
        partner_id: partner_id,
        environment: 'sandbox',
        redirect_url: redirect_url,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar URL de conexão',
      error: error.message,
    });
  }
});

// Status da SUA loja
app.get('/api/my-shopee/status', (req, res) => {
  try {
    const isConnected = false; // Por enquanto false, depois implementamos storage do access_token

    res.json({
      success: true,
      connected: isConnected,
      message: isConnected
        ? 'Sua loja está conectada!'
        : 'Conecte sua loja primeiro',
      your_store: {
        products_count: isConnected ? 'Carregando...' : 'Não conectado',
        orders_pending: isConnected ? 'Carregando...' : 'Não conectado',
        revenue_today: isConnected ? 'Carregando...' : 'Não conectado',
      },
      features: {
        manage_products: isConnected,
        update_prices: isConnected,
        manage_promotions: isConnected,
        control_stock: isConnected,
        view_orders: isConnected,
      },
      next_step: isConnected
        ? 'Gerencie seus produtos'
        : 'Conecte sua loja usando /api/my-shopee/connect',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status',
      error: error.message,
    });
  }
});

// SEUS produtos
app.get('/api/my-shopee/products', (req, res) => {
  try {
    res.json({
      success: true,
      message:
        'Conecte sua loja primeiro para ver seus milhares de produtos reais',
      products: [],
      total: 0,
      pagination: {
        page: 1,
        limit: 50,
        total_pages: 0,
      },
      when_connected: {
        available_actions: [
          'Listar todos os seus produtos',
          'Atualizar preços em lote',
          'Gerenciar estoque',
          'Controlar promoções',
          'Monitorar vendas',
        ],
      },
      status: 'awaiting_connection',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar seus produtos',
      error: error.message,
    });
  }
});

// Dashboard da SUA loja
app.get('/api/my-shopee/dashboard', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Dashboard da SUA loja Shopee',
      your_store_data: {
        total_products: 'Conecte sua loja',
        total_orders: 'Conecte sua loja',
        total_revenue: 'Conecte sua loja',
        pending_orders: 'Conecte sua loja',
        low_stock_products: 'Conecte sua loja',
        active_promotions: 'Conecte sua loja',
      },
      status: 'awaiting_connection',
      note: 'Conecte sua loja para ver os dados reais dos seus milhares de produtos',
      connect_url: '/api/my-shopee/connect',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar dashboard',
      error: error.message,
    });
  }
});

// SEUS pedidos
app.get('/api/my-shopee/orders', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Pedidos da SUA loja',
      orders: [],
      total: 0,
      status: 'awaiting_connection',
      note: 'Conecte sua loja para ver seus pedidos reais',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pedidos',
      error: error.message,
    });
  }
});

// Atualizar preço (placeholder)
app.put('/api/my-shopee/products/:product_id/price', (req, res) => {
  const { product_id } = req.params;
  const { new_price } = req.body;

  res.json({
    success: true,
    message: `Preço do produto ${product_id} será atualizado para R$ ${new_price}`,
    status: 'pending_connection',
    note: 'Conecte sua loja primeiro para atualizar preços reais',
  });
});

// ========================================
// APIs ORIGINAIS
// ========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'SUA_LOJA_V1',
    timestamp: new Date().toISOString(),
    message: 'Shopee Manager - Gerenciador da SUA Loja funcionando!',
    features: [
      'sua_loja_shopee',
      'gerenciar_produtos',
      'atualizar_precos',
      'controlar_estoque',
    ],
    environment: process.env.NODE_ENV || 'development',
    shopee_config: {
      partner_id: process.env.SHOPEE_PARTNER_ID ? '***' : 'NOT_SET',
      environment:
        process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    },
  });
});

app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    message: 'Use /api/my-shopee/products para ver SEUS produtos reais',
    redirect_to: '/api/my-shopee/products',
  });
});

app.get('/api/benchmarking', (req, res) => {
  res.json({
    success: true,
    message: 'API de benchmarking funcionando',
    data: {
      category: 'Seus Produtos',
      competitors: 'Análise disponível após conectar sua loja',
      last_update: new Date().toISOString(),
    },
  });
});

app.get('/api/reports', (req, res) => {
  res.json({
    success: true,
    message: 'Relatórios da SUA loja',
    available_reports: [
      'vendas_sua_loja',
      'estoque_seus_produtos',
      'performance_produtos',
    ],
    note: 'Conecte sua loja para gerar relatórios reais',
  });
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
      '/api/my-shopee/connect',
      '/api/my-shopee/status',
      '/api/my-shopee/products',
      '/api/my-shopee/dashboard',
      '/api/my-shopee/orders',
      '/api/products',
      '/api/benchmarking',
      '/api/reports',
      '/auth/shopee/callback',
      '/debug/files',
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
    console.log(
      `🔗 Conectar SUA loja: http://localhost:${PORT}/api/my-shopee/connect`
    );
  });
}

module.exports = app;
