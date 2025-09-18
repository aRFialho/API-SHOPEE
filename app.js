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
// CONFIGURAÇÃO COM VARIÁVEIS DE AMBIENTE
// ========================================
require('dotenv').config();

const FIXED_DOMAIN = process.env.API_BASE_URL || 'https://shopee-manager-604z8x8wp-raphaels-projects-11cd9f6b.vercel.app';

const SHOPEE_CONFIG = {
  partner_id: process.env.SHOPEE_PARTNER_ID || '2012740',
  partner_key: process.env.SHOPEE_PARTNER_KEY || 'shpk4c4b4e655a6b54536853704e48646470634d734258695765684b42624e43',
  redirect_url: process.env.SHOPEE_REDIRECT_URI || `${FIXED_DOMAIN}/auth/shopee/callback`,
  base_domain: FIXED_DOMAIN,
  environment: process.env.NODE_ENV || 'production',
  api_base: process.env.SHOPEE_API_BASE || 'https://partner.shopeemobile.com',
};

console.log('🔑 Credenciais carregadas:');
console.log('📍 Partner ID:', SHOPEE_CONFIG.partner_id);
console.log('🔐 Partner Key:', SHOPEE_CONFIG.partner_key.substring(0, 10) + '...');
console.log('🌐 Domínio:', FIXED_DOMAIN);
console.log('🔗 Callback:', SHOPEE_CONFIG.redirect_url);

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

// Função para gerar access token (ENDPOINT CORRETO DA DOCUMENTAÇÃO)
// Função para gerar access token (ENDPOINT CORRETO DA DOCUMENTAÇÃO)
const generateAccessToken = async (code, shopId) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/auth/token/get'; // ✅ CORRETO conforme documentação
    const signature = generateSignature(path, timestamp);

    const requestData = {
      code: code,
      shop_id: parseInt(shopId),
      partner_id: parseInt(SHOPEE_CONFIG.partner_id),
    };

    const requestParams = {
    partner_id: parseInt(SHOPEE_CONFIG.partner_id),  // ✅ CONVERTER PARA NUMBER
    timestamp: timestamp,
    sign: signature,
};

    const fullUrl = `${SHOPEE_CONFIG.api_base}${path}`;

    console.log('🔑 GERANDO ACCESS TOKEN - ENDPOINT CORRETO DA DOCUMENTAÇÃO:');
    console.log('📍 URL:', fullUrl);
    console.log('�� Body:', requestData);
    console.log('🔗 Params:', requestParams);
    console.log('🔐 Signature:', signature);
    console.log('⏰ Timestamp:', timestamp);

    const response = await axios.post(fullUrl, requestData, {
      params: requestParams,
      timeout: 30000,
    });

    console.log('✅ Access token gerado com sucesso!');
    console.log('📋 Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ ERRO DETALHADO:');
    console.error('🌐 URL:', `${SHOPEE_CONFIG.api_base}/api/v2/auth/token/get`); // CORRIGIDO
    console.error('📊 Status:', error.response?.status);
    console.error('📋 Headers:', error.response?.headers);
    console.error('💬 Data:', error.response?.data);
    console.error('🔍 Config:', error.config);

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
// ENDPOINTS DE TESTE
// ========================================

// Teste de endpoints Shopee
app.get('/api/test-shopee', async (req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

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
      fixed_domain: FIXED_DOMAIN,
      results: results,
    });
  } catch (error) {
    res.json({
      error: 'Erro no teste',
      message: error.message,
    });
  }
});

// Teste com diferentes partners
app.get('/api/test-partners', (req, res) => {
  const partners = [
    {
      id: '2012740',
      key: 'shpk4c4b4e655a6b54536853704e48646470634d734258695765684b42624e43',
      name: 'Partner Atual',
    },
    {
      id: '1185765',
      key: 'shpk52447844616d65636e77716a6a676d696c646947466d67496c4c584c6e52',
      name: 'Partner do Contexto',
    },
  ];

  const results = partners.map(partner => {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/shop/auth_partner';

    const baseString = `${partner.id}${path}${timestamp}`;
    const signature = crypto
      .createHmac('sha256', partner.key)
      .update(baseString)
      .digest('hex');

    const authUrl = `https://partner.shopeemobile.com${path}?partner_id=${partner.id}&timestamp=${timestamp}&sign=${signature}&redirect=${encodeURIComponent(SHOPEE_CONFIG.redirect_url)}`;

    return {
      name: partner.name,
      partner_id: partner.id,
      auth_url: authUrl,
      signature: signature,
      callback_url: SHOPEE_CONFIG.redirect_url,
    };
  });

  res.json({
    message: 'Teste com diferentes partners',
    current_domain: FIXED_DOMAIN,
    callback_configured: SHOPEE_CONFIG.redirect_url,
    partners: results,
  });
});

// Teste do endpoint correto de auth
app.get('/api/test-auth-real', async (req, res) => {
  const endpoints = [
    { path: '/api/v2/auth/token', method: 'POST' },
    { path: '/api/v2/auth/access_token', method: 'POST' },
    { path: '/api/v2/public/auth/token', method: 'POST' },
    { path: '/api/v1/auth/token', method: 'POST' },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(endpoint.path, timestamp);

    const testData = {
      code: 'test_code_12345',
      shop_id: 123456789,
      partner_id: parseInt(SHOPEE_CONFIG.partner_id),
    };

    try {
      const response = await axios.post(
        `${SHOPEE_CONFIG.api_base}${endpoint.path}`,
        testData,
        {
          params: {
            partner_id: SHOPEE_CONFIG.partner_id,
            timestamp: timestamp,
            sign: signature,
          },
          timeout: 10000,
        }
      );

      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 'success',
        data: response.data,
      });
    } catch (error) {
      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 'error',
        error: error.response?.status,
        message: error.response?.data || error.message,
        url: `${SHOPEE_CONFIG.api_base}${endpoint.path}`,
      });
    }
  }

  res.json({
    message: 'Teste de endpoints de auth reais',
    partner_id: SHOPEE_CONFIG.partner_id,
    fixed_domain: FIXED_DOMAIN,
    test_data: testData,
    results: results,
  });
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

  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Shopee Manager Dashboard</title>
          <style>
              body { font-family: Arial; margin: 0; padding: 20px; background: #f8f9fa; }
              .container { max-width: 800px; margin: 0 auto; }
              .header { background: #28a745; color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
              .info { background: #d4edda; color: #155724; padding: 20px; border-radius: 10px; margin: 20px 0; }
              .debug { background: #fff3cd; color: #856404; padding: 20px; border-radius: 10px; margin: 20px 0; }
              a { color: #007bff; text-decoration: none; margin: 10px; display: inline-block; }
              a:hover { text-decoration: underline; }
              .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; text-decoration: none; display: inline-block; margin: 5px; }
              .btn:hover { background: #0056b3; color: white; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🛍️ Shopee Manager</h1>
                  <p><strong>Domínio:</strong> ${FIXED_DOMAIN}</p>
                  <p><strong>Status:</strong> ${connectionStore.connected ? '🟢 CONECTADO' : '🔴 AGUARDANDO CONEXÃO'}</p>
              </div>

              <div class="info">
                  <h3>📋 Configuração Atual:</h3>
                  <p><strong>🌐 Domínio Fixo:</strong> shopee-manager.vercel.app</p>
                  <p><strong>🔑 Partner ID:</strong> ${SHOPEE_CONFIG.partner_id}</p>
                  <p><strong>🔗 Callback URL:</strong> ${SHOPEE_CONFIG.redirect_url}</p>
                  <p><strong>🏪 Loja:</strong> ${connectionStore.shop_info?.shop_name || 'Não conectada'}</p>
              </div>

              <div class="debug">
                  <h3>🔧 Testes e Debug:</h3>
                  <a href="/api/test-partners" target="_blank" class="btn">Testar Partners</a>
                  <a href="/api/test-auth-real" target="_blank" class="btn">Testar Auth</a>
                  <a href="/api/my-shopee/connect" target="_blank" class="btn">Conectar Loja</a>
                  <a href="/api/my-shopee/status" target="_blank" class="btn">Status</a>
                  <a href="/debug/files" target="_blank" class="btn">Debug Files</a>
              </div>

              <div class="info">
                  <h3>📝 Próximos Passos:</h3>
                  <ol>
                      <li>Configure o domínio <strong>shopee-manager.vercel.app</strong> no Shopee Open Platform</li>
                      <li>Use <strong>/api/my-shopee/connect</strong> para gerar auth_url</li>
                      <li>Clique na auth_url para conectar sua loja</li>
                      <li>Aguarde redirecionamento automático</li>
                  </ol>
              </div>
          </div>
      </body>
      </html>
    `);
  }
});

// ========================================
// CALLBACK DA SHOPEE
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

    const tokenData = await generateAccessToken(code, shop_id);
    const shopInfo = await getShopInfo(tokenData.access_token, shop_id);
    await saveConnection(shop_id, code, tokenData, shopInfo);

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
// ROTAS DA SUA LOJA SHOPEE
// ========================================

app.get('/api/my-shopee/setup', (req, res) => {
  res.json({
    success: true,
    configured: true,
    domain_fixed: true,
    partner_id_set: true,
    partner_key_set: true,
    message: 'SUA loja configurada com domínio personalizado!',
    config: {
      partner_id: SHOPEE_CONFIG.partner_id,
      environment: SHOPEE_CONFIG.environment,
      fixed_domain: FIXED_DOMAIN,
      redirect_url: SHOPEE_CONFIG.redirect_url,
    },
    shopee_configuration: {
      domain_to_set: 'shopee-manager.vercel.app',
      callback_endpoint: `${FIXED_DOMAIN}/auth/shopee/callback`,
    },
    status: 'ready_to_connect',
  });
});

app.get('/api/my-shopee/connect', (req, res) => {
  try {
    const authUrl = generateAuthUrl();

    res.json({
      success: true,
      auth_url: authUrl,
      message: 'Clique no auth_url para conectar SUA loja Shopee',
      instructions: [
        '1. Configure o domínio shopee-manager.vercel.app na Shopee Open Platform',
        '2. Clique no auth_url abaixo',
        '3. Faça login na SUA conta Shopee (a que tem milhares de produtos)',
        '4. Autorize o acesso aos seus produtos',
        '5. Aguarde o redirecionamento automático',
      ],
      domain_info: {
        fixed_domain: FIXED_DOMAIN,
        configure_in_shopee: 'shopee-manager.vercel.app',
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
      message:
        'Configure o domínio shopee-manager.vercel.app na Shopee e conecte sua loja',
      domain_status: 'fixed_domain_ready',
      fixed_domain: FIXED_DOMAIN,
      configure_in_shopee: 'shopee-manager.vercel.app',
      next_steps: [
        '1. Configure o domínio shopee-manager.vercel.app na Shopee Open Platform',
        '2. Use /api/my-shopee/connect para gerar auth_url',
        '3. Clique na auth_url para conectar sua loja',
      ],
    });
  }
});

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
    });
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/product/get_item_list';
    const signature = generateSignature(
      path,
      timestamp,
      connectionStore.access_token,
      connectionStore.shop_id
    );

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

// ========================================
// APIs ORIGINAIS
// ========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'API V6 DOMÍNIO FORÇADO',
    timestamp: new Date().toISOString(),
    message: 'Shopee Manager - SUA Loja Real com domínio personalizado!',
    fixed_domain: FIXED_DOMAIN,
    vercel_url_env: process.env.VERCEL_URL || 'not_set',
    connection_status: connectionStore.connected ? 'connected' : 'disconnected',
    shopee_config: {
      partner_id: SHOPEE_CONFIG.partner_id,
      environment: SHOPEE_CONFIG.environment,
      domain_fixed: true,
      custom_domain: 'shopee-manager.vercel.app',
      callback_url: SHOPEE_CONFIG.redirect_url,
    },
    available_tests: [
      '/api/test-auth-real - Teste auth endpoints',
      '/api/test-partners - Teste partners',
      '/api/my-shopee/connect - Conectar loja',
    ],
  });
});

app.get('/api/products', (req, res) => {
  res.redirect('/api/my-shopee/products');
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
      '/dashboard - Dashboard principal',
      '/debug/files - Debug de arquivos',
      '/api/test-partners - Teste partners',
      '/api/test-auth-real - Teste auth real',
      '/api/my-shopee/setup',
      '/api/my-shopee/connect',
      '/api/my-shopee/status',
      '/api/my-shopee/products',
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
    console.log(`🌐 Domínio personalizado: ${FIXED_DOMAIN}`);
  });
}

module.exports = app;
