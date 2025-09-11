const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();

console.log('🚀 Iniciando Shopee Manager - SUA Loja Real');

app.use(express.json());

// ========================================
// CONFIGURAÇÃO SHOPEE
// ========================================
const SHOPEE_CONFIG = {
  partner_id: process.env.SHOPEE_PARTNER_ID || '1185765',
  partner_key:
    process.env.SHOPEE_PARTNER_KEY ||
    'shpk52447844616d65636e77716a6a676d696c646947466d67496c4c584c6e52',
  redirect_url:
    process.env.SHOPEE_REDIRECT_URL ||
    'https://shopee-manager-38y4vipxp-raphaels-projects-11cd9f6b.vercel.app',
  environment: 'sandbox', // Suas credenciais são de teste
  api_base: 'https://partner.test-stable.shopeemobile.com',
};

// Função para gerar assinatura
const generateSignature = (path, timestamp, accessToken = '', shopId = '') => {
  const partnerId = SHOPEE_CONFIG.partner_id;
  const partnerKey = SHOPEE_CONFIG.partner_key;

  let baseString = `${partnerId}${path}${timestamp}`;

  if (accessToken) baseString += accessToken;
  if (shopId) baseString += shopId;

  return crypto
    .createHmac('sha256', partnerKey)
    .update(baseString)
    .digest('hex');
};

// Função para gerar URL de autorização
const generateAuthUrl = () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const path = '/api/v2/shop/auth_partner';
  const signature = generateSignature(path, timestamp);

  return `${SHOPEE_CONFIG.api_base}${path}?partner_id=${SHOPEE_CONFIG.partner_id}&timestamp=${timestamp}&sign=${signature}&redirect=${encodeURIComponent(SHOPEE_CONFIG.redirect_url)}`;
};

console.log('✅ Configuração Shopee carregada:', {
  partner_id: SHOPEE_CONFIG.partner_id,
  environment: SHOPEE_CONFIG.environment,
  api_base: SHOPEE_CONFIG.api_base,
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

// ========================================
// ROTAS PRINCIPAIS
// ========================================
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, 'src', 'views', 'dashboard.html');
  res.sendFile(dashboardPath);
});

// Callback da Shopee
app.get('/auth/shopee/callback', (req, res) => {
  const { code, shop_id, error } = req.query;

  console.log('📞 Callback recebido:', {
    code: code?.substring(0, 10) + '...',
    shop_id,
    error,
  });

  if (error) {
    return res.send(`
      <html>
        <head><title>Erro na Autorização</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Erro na Autorização</h1>
          <p>Erro: ${error}</p>
          <button onclick="window.close()">Fechar</button>
        </body>
      </html>
    `);
  }

  if (code && shop_id) {
    // Aqui você salvaria o code e shop_id para trocar por access_token
    res.send(`
      <html>
        <head><title>SUA Loja Conectada!</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 15px; max-width: 500px; margin: 0 auto;">
            <div style="font-size: 4em; margin-bottom: 20px;">��</div>
            <h1>SUA Loja Shopee Conectada!</h1>
            <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; margin: 20px 0;">
              <p><strong>Shop ID:</strong> ${shop_id}</p>
              <p><strong>Code:</strong> ${code.substring(0, 20)}...</p>
            </div>
            <p>Agora você pode gerenciar seus milhares de produtos!</p>
            <button onclick="window.close()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">
              Fechar e Voltar ao Dashboard
            </button>
          </div>
        </body>
      </html>
    `);
  } else {
    res.status(400).send('Parâmetros inválidos recebidos da Shopee');
  }
});

// ========================================
// ROTAS DA SUA LOJA SHOPEE
// ========================================

// Configuração e status
app.get('/api/my-shopee/setup', (req, res) => {
  res.json({
    success: true,
    configured: true,
    partner_id_set: !!SHOPEE_CONFIG.partner_id,
    partner_key_set: !!SHOPEE_CONFIG.partner_key,
    message: 'Credenciais da SUA loja configuradas!',
    config: {
      partner_id: SHOPEE_CONFIG.partner_id,
      environment: SHOPEE_CONFIG.environment,
      api_base: SHOPEE_CONFIG.api_base,
      redirect_url: SHOPEE_CONFIG.redirect_url,
    },
    status: 'ready_to_connect',
  });
});

// Conectar SUA loja
app.get('/api/my-shopee/connect', (req, res) => {
  try {
    const authUrl = generateAuthUrl();

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
        partner_id: SHOPEE_CONFIG.partner_id,
        environment: SHOPEE_CONFIG.environment,
        redirect_url: SHOPEE_CONFIG.redirect_url,
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
      credentials_status: 'configured',
      your_store: {
        products_count: isConnected ? 'Carregando...' : 'Conecte sua loja',
        orders_pending: isConnected ? 'Carregando...' : 'Conecte sua loja',
        revenue_today: isConnected ? 'Carregando...' : 'Conecte sua loja',
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
  res.json({
    success: true,
    message:
      'Conecte sua loja primeiro para ver seus milhares de produtos reais',
    products: [],
    total: 0,
    status: 'awaiting_connection',
    when_connected: {
      available_actions: [
        'Listar todos os seus produtos',
        'Atualizar preços em lote',
        'Gerenciar estoque',
        'Controlar promoções',
        'Monitorar vendas',
      ],
    },
  });
});

// Dashboard da SUA loja
app.get('/api/my-shopee/dashboard', (req, res) => {
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
  });
});

// ========================================
// APIs ORIGINAIS
// ========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'SUA_LOJA_V2',
    timestamp: new Date().toISOString(),
    message: 'Shopee Manager - SUA Loja Real funcionando!',
    shopee_config: {
      partner_id: SHOPEE_CONFIG.partner_id,
      environment: SHOPEE_CONFIG.environment,
      configured: true,
    },
  });
});

app.get('/api/products', (req, res) => {
  res.redirect('/api/my-shopee/products');
});

app.get('/api/benchmarking', (req, res) => {
  res.json({
    success: true,
    message: 'Benchmarking dos SEUS produtos',
    note: 'Conecte sua loja para análise dos seus produtos',
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
      '/api/my-shopee/setup',
      '/api/my-shopee/connect',
      '/api/my-shopee/status',
      '/api/my-shopee/products',
      '/api/my-shopee/dashboard',
      '/api/health',
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
  });
}

module.exports = app;
