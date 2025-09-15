const express = require('express');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const app = express();

app.use(express.json());

// ========================================
// STORAGE SIMPLES (EM MEMÓRIA)
// ========================================
let connectionStore = {
  connected: false,
  shop_id: null,
  auth_code: null,
  access_token: null,
  refresh_token: null,
  connected_at: null,
  shop_info: null,
};

// ========================================
// CONFIGURAÇÃO COM DOMÍNIO FIXO
// ========================================
const FIXED_DOMAIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

const SHOPEE_CONFIG = {
  partner_id: '2012740',
  partner_key:
    'shpk4c4b4e655a6b54536853704e48646470634d734258695765684b42624e43',
  redirect_url: `${FIXED_DOMAIN}/auth/shopee/callback`,
  base_domain: FIXED_DOMAIN,
  environment: 'production',
  api_base: 'https://partner.shopeemobile.com',
};

console.log('🌐 Domínio fixo configurado:', FIXED_DOMAIN);

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

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

// Função para gerar access token (COM DEBUG)
// Função para gerar access token (ENDPOINT CORRETO)
const generateAccessToken = async (code, shopId) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/auth/access_token'; // ENDPOINT CORRETO
    const signature = generateSignature(path, timestamp);

    const requestData = {
      code: code,
      shop_id: parseInt(shopId),
      partner_id: parseInt(SHOPEE_CONFIG.partner_id),
    };

    const requestParams = {
      partner_id: SHOPEE_CONFIG.partner_id,
      timestamp: timestamp,
      sign: signature,
    };

    const fullUrl = `${SHOPEE_CONFIG.api_base}${path}`;

    console.log('🔑 GERANDO ACCESS TOKEN - ENDPOINT CORRETO:');
    console.log('📍 URL:', fullUrl);
    console.log('�� Body:', requestData);
    console.log('🔗 Params:', requestParams);

    const response = await axios.post(fullUrl, requestData, {
      params: requestParams,
      timeout: 30000,
    });

    console.log('✅ Access token gerado com sucesso!');
    return response.data;
  } catch (error) {
    console.error('❌ ERRO DETALHADO:');
    console.error('🌐 URL:', `${SHOPEE_CONFIG.api_base}${path}`);
    console.error('📊 Status:', error.response?.status);
    console.error('💬 Data:', error.response?.data);

    throw new Error(
      `Erro ao gerar access token: ${error.response?.status} - ${JSON.stringify(error.response?.data) || error.message}`
    );
  }
};

// Função para buscar informações da loja
const getShopInfo = async (accessToken, shopId) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/shop/get_shop_info';
    const signature = generateSignature(path, timestamp, accessToken, shopId);

    console.log('🏪 Buscando informações da loja...', { shopId });

    const response = await axios.get(`${SHOPEE_CONFIG.api_base}${path}`, {
      params: {
        partner_id: SHOPEE_CONFIG.partner_id,
        timestamp: timestamp,
        access_token: accessToken,
        shop_id: shopId,
        sign: signature,
      },
    });

    console.log('✅ Informações da loja obtidas!');
    return response.data;
  } catch (error) {
    console.error(
      '❌ Erro ao buscar info da loja:',
      error.response?.data || error.message
    );
    return { shop_name: `Loja ${shopId}`, status: 'connected' };
  }
};

// Função para salvar conexão
const saveConnection = async (shopId, authCode, tokenData, shopInfo) => {
  connectionStore = {
    connected: true,
    shop_id: shopId,
    auth_code: authCode,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    connected_at: new Date().toISOString(),
    shop_info: shopInfo,
  };

  console.log('💾 Conexão salva:', {
    shop_id: shopId,
    shop_name: shopInfo?.shop_name || 'N/A',
    connected: true,
  });
};

// ========================================
// ENDPOINT DE TESTE SHOPEE
// ========================================
app.get('/api/test-api-bases', async (req, res) => {
  const apiBases = [
    'https://partner.shopeemobile.com',
    'https://partner.test-stable.shopeemobile.com', // Sandbox
    'https://partner.uat.shopeemobile.com', // UAT
  ];

  const results = [];

  for (const apiBase of apiBases) {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/auth/access_token';
    const signature = generateSignature(path, timestamp);

    try {
      const response = await axios.get(`${apiBase}${path}`, {
        params: {
          partner_id: SHOPEE_CONFIG.partner_id,
          timestamp: timestamp,
          sign: signature,
        },
        timeout: 10000,
      });

      results.push({
        api_base: apiBase,
        status: 'success',
        data: response.data,
      });
    } catch (error) {
      results.push({
        api_base: apiBase,
        status: 'error',
        error: error.response?.status,
        message: error.response?.data || error.message,
      });
    }
  }

  res.json({
    message: 'Teste de diferentes API bases',
    results: results,
  });
});
app.get('/api/test-shopee', async (req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    // Testar diferentes endpoints
    const endpoints = [
      '/api/v2/auth/token',
      '/api/v2/auth/access_token',
      '/api/v1/auth/token',
    ];

    const results = [];

    for (const path of endpoints) {
      const signature = generateSignature(path, timestamp);
      const testUrl = `${SHOPEE_CONFIG.api_base}${path}`;

      try {
        const response = await axios.get(testUrl, {
          params: {
            partner_id: SHOPEE_CONFIG.partner_id,
            timestamp: timestamp,
            sign: signature,
          },
          timeout: 10000,
        });

        results.push({
          endpoint: path,
          status: 'success',
          data: response.data,
        });
      } catch (error) {
        results.push({
          endpoint: path,
          status: 'error',
          error: error.response?.status,
          message: error.response?.data || error.message,
        });
      }
    }

    res.json({
      message: 'Teste de endpoints Shopee',
      partner_id: SHOPEE_CONFIG.partner_id,
      api_base: SHOPEE_CONFIG.api_base,
      results: results,
    });
  } catch (error) {
    res.json({
      error: 'Erro no teste',
      message: error.message,
    });
  }
});

// ========================================
// DEBUG ENDPOINT
// ========================================
app.get('/debug/files', (req, res) => {
  const fs = require('fs');

  const checkPaths = [
    path.join(__dirname, 'src', 'public', 'css', 'dashboard.css'),
    path.join(__dirname, 'src', 'views', 'dashboard.html'),
    path.join(__dirname, 'src'),
    path.join(__dirname, 'src', 'public'),
    path.join(__dirname, 'src', 'views'),
    __dirname,
  ];

  const results = checkPaths.map(filePath => ({
    path: filePath,
    exists: fs.existsSync(filePath),
    isFile: fs.existsSync(filePath) ? fs.statSync(filePath).isFile() : false,
    isDirectory: fs.existsSync(filePath)
      ? fs.statSync(filePath).isDirectory()
      : false,
  }));

  let directoryContents = {};
  try {
    directoryContents.root = fs.readdirSync(__dirname);
    if (fs.existsSync(path.join(__dirname, 'src'))) {
      directoryContents.src = fs.readdirSync(path.join(__dirname, 'src'));
    }
    if (fs.existsSync(path.join(__dirname, 'src', 'public'))) {
      directoryContents.srcPublic = fs.readdirSync(
        path.join(__dirname, 'src', 'public')
      );
    }
    if (fs.existsSync(path.join(__dirname, 'src', 'views'))) {
      directoryContents.srcViews = fs.readdirSync(
        path.join(__dirname, 'src', 'views')
      );
    }
  } catch (error) {
    directoryContents.error = error.message;
  }

  res.json({
    __dirname,
    environment: process.env.NODE_ENV || 'development',
    vercel_url: process.env.VERCEL_URL || 'not_set',
    fixed_domain: FIXED_DOMAIN,
    files_check: results,
    directory_contents: directoryContents,
    static_routes_configured: {
      css: '/css -> ' + path.join(__dirname, 'src', 'public', 'css'),
      js: '/js -> ' + path.join(__dirname, 'src', 'public', 'js'),
      images: '/images -> ' + path.join(__dirname, 'src', 'public', 'images'),
    },
  });
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
app.get('/', (req, res) => res.redirect('/dashboard'));

app.get('/dashboard', (req, res) => {
  const fs = require('fs');
  const dashboardPath = path.join(__dirname, 'src', 'views', 'dashboard.html');

  console.log('📁 Dashboard path:', dashboardPath);
  console.log('📁 __dirname:', __dirname);

  // Verificar se arquivo existe
  if (fs.existsSync(dashboardPath)) {
    console.log('✅ dashboard.html encontrado!');
    res.sendFile(dashboardPath);
  } else {
    console.log('❌ dashboard.html NÃO encontrado!');
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Dashboard - Arquivo não encontrado</title>
          <style>
              body { font-family: Arial; margin: 0; padding: 20px; background: #f8f9fa; }
              .container { max-width: 800px; margin: 0 auto; }
              .error { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 10px; margin: 20px 0; }
              .info { background: #d4edda; color: #155724; padding: 20px; border-radius: 10px; margin: 20px 0; }
              .debug { background: #fff3cd; color: #856404; padding: 20px; border-radius: 10px; margin: 20px 0; }
              pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>❌ Dashboard não encontrado</h1>

              <div class="error">
                  <h3>Arquivo não encontrado:</h3>
                  <p><strong>Caminho procurado:</strong> ${dashboardPath}</p>
                  <p><strong>__dirname:</strong> ${__dirname}</p>
              </div>

              <div class="info">
                  <h3>✅ Loja Conectada:</h3>
                  <p><strong>Status:</strong> ${connectionStore.connected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}</p>
                  <p><strong>Shop ID:</strong> ${connectionStore.shop_id || 'N/A'}</p>
                  <p><strong>Loja:</strong> ${connectionStore.shop_info?.shop_name || 'N/A'}</p>
              </div>

              <div class="debug">
                  <h3>🔧 Debug Info:</h3>
                  <p><a href="/debug/files" target="_blank">Ver Debug Completo</a></p>
                  <p><a href="/api/my-shopee/status" target="_blank">Status da Conexão</a></p>
                  <p><a href="/api/my-shopee/products" target="_blank">Ver Produtos</a></p>
              </div>
          </div>
      </body>
      </html>
    `);
  }
});

// ========================================
// CALLBACK DA SHOPEE (IMPLEMENTAÇÃO COMPLETA)
// ========================================
app.get('/auth/shopee/callback', async (req, res) => {
  const { code, shop_id, error } = req.query;

  console.log('🔄 Callback recebido:', {
    code: code?.substring(0, 10) + '...',
    shop_id,
    error,
    domain: FIXED_DOMAIN,
  });

  if (error) {
    return res.send(`
      <html>
        <head><title>Erro na Autorização</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #ff6b6b; color: white;">
          <h1>❌ Erro na Autorização</h1>
          <p><strong>Erro:</strong> ${error}</p>
          <p><strong>Domínio:</strong> ${FIXED_DOMAIN}</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: white; color: #ff6b6b; border: none; border-radius: 5px; cursor: pointer;">Fechar</button>
        </body>
      </html>
    `);
  }

  if (!code || !shop_id) {
    return res.status(400).send(`
      <html>
        <head><title>Parâmetros Inválidos</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Parâmetros Inválidos</h1>
          <p>Code: ${code || 'Não recebido'}</p>
          <p>Shop ID: ${shop_id || 'Não recebido'}</p>
          <p>Domínio: ${FIXED_DOMAIN}</p>
          <button onclick="window.close()">Fechar</button>
        </body>
      </html>
    `);
  }

  try {
    console.log('🚀 Processando autorização...');

    // 1. GERAR ACCESS TOKEN
    const tokenData = await generateAccessToken(code, shop_id);

    // 2. BUSCAR INFO DA LOJA
    const shopInfo = await getShopInfo(tokenData.access_token, shop_id);

    // 3. SALVAR CONEXÃO
    await saveConnection(shop_id, code, tokenData, shopInfo);

    console.log('🎉 SUCESSO! SUA LOJA CONECTADA:', {
      shop_id,
      shop_name: shopInfo?.shop_name || 'N/A',
      access_token: tokenData.access_token ? 'Gerado ✅' : 'Erro ❌',
    });

    res.send(`
      <html>
        <head><title>🎉 SUA Loja Conectada!</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white;">
          <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 15px; max-width: 700px; margin: 0 auto;">
            <div style="font-size: 6em; margin-bottom: 20px;">🎉</div>
            <h1>SUA LOJA SHOPEE CONECTADA!</h1>
            <div style="background: rgba(255,255,255,0.2); padding: 25px; border-radius: 10px; margin: 25px 0;">
              <p><strong>🏪 Shop ID:</strong> ${shop_id}</p>
              <p><strong>🏬 Loja:</strong> ${shopInfo?.shop_name || 'Carregando...'}</p>
              <p><strong>🔑 Access Token:</strong> Gerado com sucesso! ✅</p>
              <p><strong>🌐 Domínio:</strong> ${FIXED_DOMAIN}</p>
              <p><strong>✅ Status:</strong> CONECTADO E FUNCIONANDO!</p>
            </div>
            <h2>🚀 AGORA VOCÊ PODE:</h2>
            <div style="text-align: left; max-width: 500px; margin: 20px auto; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
              <ul style="list-style: none; padding: 0;">
                <li>📦 Gerenciar seus milhares de produtos</li>
                <li>💰 Atualizar preços em lote</li>
                <li>📊 Controlar estoque</li>
                <li>🎯 Gerenciar promoções</li>
                <li>📈 Monitorar vendas</li>
                <li>🔄 Sincronizar dados</li>
              </ul>
            </div>
            <div style="margin-top: 30px;">
              <button onclick="window.close()" style="padding: 15px 30px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; margin: 10px; font-size: 16px;">
                Fechar Janela
              </button>
              <button onclick="window.location.href='/dashboard'" style="padding: 15px 30px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; margin: 10px; font-size: 16px;">
                Ir para Dashboard
              </button>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Erro no callback:', error);
    res.status(500).send(`
      <html>
        <head><title>Erro no Processamento</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #ff6b6b; color: white;">
          <h1>❌ Erro no Processamento</h1>
          <p><strong>Shop ID:</strong> ${shop_id}</p>
          <p><strong>Erro:</strong> ${error.message}</p>
          <p><strong>Domínio:</strong> ${FIXED_DOMAIN}</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: white; color: #ff6b6b; border: none; border-radius: 5px; cursor: pointer;">Fechar</button>
        </body>
      </html>
    `);
  }
});

// ========================================
// ROTAS DA SUA LOJA SHOPEE (ATUALIZADAS)
// ========================================

// Configuração e status
app.get('/api/my-shopee/setup', (req, res) => {
  res.json({
    success: true,
    configured: true,
    domain_fixed: true,
    partner_id_set: true,
    partner_key_set: true,
    message: 'SUA loja configurada com domínio fixo!',
    config: {
      partner_id: SHOPEE_CONFIG.partner_id,
      environment: SHOPEE_CONFIG.environment,
      fixed_domain: FIXED_DOMAIN,
      redirect_url: SHOPEE_CONFIG.redirect_url,
    },
    shopee_configuration: {
      domain_to_set: FIXED_DOMAIN,
      callback_endpoint: `${FIXED_DOMAIN}/auth/shopee/callback`,
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
      message: 'Clique no auth_url para conectar SUA loja Shopee',
      instructions: [
        '1. Configure o domínio na Shopee Open Platform primeiro',
        '2. Clique no auth_url abaixo',
        '3. Faça login na SUA conta Shopee (a que tem milhares de produtos)',
        '4. Autorize o acesso aos seus produtos',
        '5. Aguarde o redirecionamento automático',
      ],
      domain_info: {
        fixed_domain: FIXED_DOMAIN,
        configure_in_shopee: FIXED_DOMAIN,
        callback_url: SHOPEE_CONFIG.redirect_url,
        partner_id: SHOPEE_CONFIG.partner_id,
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

// Status da SUA loja (ATUALIZADO)
app.get('/api/my-shopee/status', (req, res) => {
  if (connectionStore.connected) {
    res.json({
      success: true,
      connected: true,
      shop_id: connectionStore.shop_id,
      shop_name: connectionStore.shop_info?.shop_name || 'N/A',
      connected_at: connectionStore.connected_at,
      access_token_status: connectionStore.access_token ? 'active' : 'missing',
      message: 'Loja conectada com sucesso!',
      fixed_domain: FIXED_DOMAIN,
    });
  } else {
    res.json({
      success: true,
      connected: false,
      message: 'Configure o domínio na Shopee e conecte sua loja',
      domain_status: 'fixed_domain_ready',
      fixed_domain: FIXED_DOMAIN,
      configure_in_shopee: FIXED_DOMAIN,
      next_steps: [
        '1. Configure o domínio na Shopee Open Platform',
        '2. Use /api/my-shopee/connect para gerar auth_url',
        '3. Clique na auth_url para conectar sua loja',
      ],
    });
  }
});

// SEUS produtos (ATUALIZADO)
app.get('/api/my-shopee/products', async (req, res) => {
  if (!connectionStore.connected) {
    return res.json({
      success: true,
      message:
        'Conecte sua loja primeiro para ver seus milhares de produtos reais',
      products: [],
      total: 0,
      status: 'awaiting_connection',
      fixed_domain: FIXED_DOMAIN,
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
  }

  try {
    // Buscar produtos reais da API Shopee
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/product/get_item_list';
    const signature = generateSignature(
      path,
      timestamp,
      connectionStore.access_token,
      connectionStore.shop_id
    );

    console.log('📦 Buscando produtos da loja...', {
      shop_id: connectionStore.shop_id,
    });

    const response = await axios.get(`${SHOPEE_CONFIG.api_base}${path}`, {
      params: {
        partner_id: SHOPEE_CONFIG.partner_id,
        timestamp: timestamp,
        access_token: connectionStore.access_token,
        shop_id: connectionStore.shop_id,
        sign: signature,
        page_size: 50,
        offset: 0,
      },
    });

    const products = response.data.response?.item || [];

    console.log('✅ Produtos encontrados:', products.length);

    res.json({
      success: true,
      connected: true,
      shop_id: connectionStore.shop_id,
      shop_name: connectionStore.shop_info?.shop_name || 'N/A',
      products: products,
      total: products.length,
      status: 'connected',
      message: `${products.length} produtos encontrados na sua loja!`,
      fixed_domain: FIXED_DOMAIN,
    });
  } catch (error) {
    console.error(
      '❌ Erro ao buscar produtos:',
      error.response?.data || error.message
    );
    res.json({
      success: false,
      connected: true,
      shop_id: connectionStore.shop_id,
      error: 'Erro ao buscar produtos',
      message: error.response?.data?.message || error.message,
      fixed_domain: FIXED_DOMAIN,
    });
  }
});

// Dashboard da SUA loja (ATUALIZADO)
app.get('/api/my-shopee/dashboard', (req, res) => {
  if (connectionStore.connected) {
    res.json({
      success: true,
      connected: true,
      message: 'Dashboard da SUA loja Shopee',
      fixed_domain: FIXED_DOMAIN,
      shop_info: {
        shop_id: connectionStore.shop_id,
        shop_name: connectionStore.shop_info?.shop_name || 'N/A',
        connected_at: connectionStore.connected_at,
        access_token_status: 'active',
      },
      your_store_data: {
        total_products: 'Use /api/my-shopee/products para ver',
        total_orders: 'Implementar endpoint de pedidos',
        total_revenue: 'Implementar endpoint de vendas',
        pending_orders: 'Implementar endpoint de pedidos',
        low_stock_products: 'Implementar verificação de estoque',
        active_promotions: 'Implementar endpoint de promoções',
      },
      status: 'connected_and_ready',
      available_endpoints: [
        '/api/my-shopee/products - Ver produtos reais',
        '/api/my-shopee/status - Status da conexão',
        '/api/my-shopee/connect - Reconectar se necessário',
      ],
    });
  } else {
    res.json({
      success: true,
      connected: false,
      message: 'Dashboard da SUA loja Shopee',
      fixed_domain: FIXED_DOMAIN,
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
  }
});

// ========================================
// APIs ORIGINAIS
// ========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'API V2 DEBUG',
    timestamp: new Date().toISOString(),
    message: 'Shopee Manager - SUA Loja Real com domínio fixo!',
    fixed_domain: FIXED_DOMAIN,
    connection_status: connectionStore.connected ? 'connected' : 'disconnected',
    shopee_config: {
      partner_id: SHOPEE_CONFIG.partner_id,
      environment: SHOPEE_CONFIG.environment,
      domain_fixed: true,
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
    note: connectionStore.connected
      ? 'Loja conectada! Implemente análise de produtos'
      : 'Conecte sua loja para análise dos seus produtos',
    connected: connectionStore.connected,
    shop_id: connectionStore.shop_id,
    fixed_domain: FIXED_DOMAIN,
  });
});

app.get('/api/reports', (req, res) => {
  res.json({
    success: true,
    message: 'Relatórios da SUA loja',
    connected: connectionStore.connected,
    shop_id: connectionStore.shop_id,
    available_reports: [
      'vendas_sua_loja',
      'estoque_seus_produtos',
      'performance_produtos',
    ],
    fixed_domain: FIXED_DOMAIN,
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
    fixed_domain: FIXED_DOMAIN,
    connection_status: connectionStore.connected ? 'connected' : 'disconnected',
    available_routes: [
      '/debug/files - Debug de arquivos',
      '/api/test-shopee - Teste endpoints Shopee',
      '/api/my-shopee/setup',
      '/api/my-shopee/connect',
      '/api/my-shopee/status',
      '/api/my-shopee/products',
      '/api/my-shopee/dashboard',
      '/api/health',
      '/auth/shopee/callback',
    ],
  });
});

// ========================================
// SERVIDOR
// ========================================
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`🌐 Domínio fixo: ${FIXED_DOMAIN}`);
  });
}

module.exports = app;
