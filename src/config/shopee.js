// ========================================
// CONFIGURAÇÃO DA API SHOPEE
// Shopee Open Platform Integration
// ========================================

const crypto = require('crypto-js');
const axios = require('axios');

// URLs da API Shopee
const SHOPEE_API_BASE = {
  production: 'https://partner.shopeemobile.com',
  sandbox: 'https://partner.test-stable.shopeemobile.com',
};

// Configurações da aplicação
const SHOPEE_CONFIG = {
  partner_id: process.env.SHOPEE_PARTNER_ID,
  partner_key: process.env.SHOPEE_PARTNER_KEY,
  redirect_url:
    process.env.SHOPEE_REDIRECT_URL ||
    'http://localhost:3000/auth/shopee/callback',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',

  // Scopes necessários
  scopes: [
    'item.base', // Informações básicas de produtos
    'item.fullinfo', // Informações completas de produtos
    'order.base', // Informações básicas de pedidos
    'order.details', // Detalhes completos de pedidos
    'logistics.base', // Informações de logística
    'shop.base', // Informações básicas da loja
    'promotion.base', // Informações de promoções
  ],
};

// Função para gerar assinatura
const generateSignature = (path, timestamp, accessToken = '', shopId = '') => {
  const partnerId = SHOPEE_CONFIG.partner_id;
  const partnerKey = SHOPEE_CONFIG.partner_key;

  let baseString = `${partnerId}${path}${timestamp}`;

  if (accessToken) {
    baseString += accessToken;
  }

  if (shopId) {
    baseString += shopId;
  }

  return crypto.HmacSHA256(baseString, partnerKey).toString();
};

// Função para gerar URL de autorização
const generateAuthUrl = () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const path = '/api/v2/shop/auth_partner';
  const signature = generateSignature(path, timestamp);

  const baseUrl = SHOPEE_API_BASE[SHOPEE_CONFIG.environment];
  const scopes = SHOPEE_CONFIG.scopes.join(',');

  return `${baseUrl}${path}?partner_id=${SHOPEE_CONFIG.partner_id}&timestamp=${timestamp}&sign=${signature}&redirect=${encodeURIComponent(SHOPEE_CONFIG.redirect_url)}`;
};

// Função para fazer requisições autenticadas
const makeAuthenticatedRequest = async (
  path,
  method = 'GET',
  data = null,
  accessToken = '',
  shopId = ''
) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(path, timestamp, accessToken, shopId);

    const baseUrl = SHOPEE_API_BASE[SHOPEE_CONFIG.environment];
    const url = `${baseUrl}${path}`;

    const params = {
      partner_id: SHOPEE_CONFIG.partner_id,
      timestamp,
      sign: signature,
    };

    if (accessToken) params.access_token = accessToken;
    if (shopId) params.shop_id = shopId;

    const config = {
      method,
      url,
      params,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(
      '❌ Erro na requisição Shopee:',
      error.response?.data || error.message
    );
    throw error;
  }
};

// Função para obter access token
const getAccessToken = async (code, shopId) => {
  const path = '/api/v2/auth/token/get';
  const data = {
    code,
    shop_id: parseInt(shopId),
    partner_id: parseInt(SHOPEE_CONFIG.partner_id),
  };

  return await makeAuthenticatedRequest(path, 'POST', data);
};

// Função para renovar access token
const refreshAccessToken = async (refreshToken, shopId) => {
  const path = '/api/v2/auth/access_token/get';
  const data = {
    refresh_token: refreshToken,
    shop_id: parseInt(shopId),
    partner_id: parseInt(SHOPEE_CONFIG.partner_id),
  };

  return await makeAuthenticatedRequest(path, 'POST', data);
};

module.exports = {
  SHOPEE_CONFIG,
  generateAuthUrl,
  makeAuthenticatedRequest,
  getAccessToken,
  refreshAccessToken,
  generateSignature,
};
