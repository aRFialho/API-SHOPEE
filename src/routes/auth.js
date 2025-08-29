// ========================================
// ROTAS DE AUTENTICAÇÃO SHOPEE
// ========================================

const express = require('express');
const router = express.Router();
const { generateAuthUrl, getAccessToken } = require('../config/shopee');
const { ShopeeAuth } = require('../models');

// GET /auth/shopee - Iniciar processo de autorização
router.get('/shopee', (req, res) => {
  try {
    const authUrl = generateAuthUrl();

    res.json({
      success: true,
      message: 'URL de autorização gerada com sucesso',
      data: {
        auth_url: authUrl,
        instructions: [
          '1. Clique no link de autorização',
          '2. Faça login na sua conta Shopee',
          '3. Autorize o aplicativo',
          '4. Você será redirecionado de volta',
        ],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao gerar URL de autorização:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível gerar URL de autorização',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /auth/shopee/callback - Callback da autorização
router.get('/shopee/callback', async (req, res) => {
  try {
    const { code, shop_id, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Autorização negada',
        message: 'Usuário negou a autorização ou ocorreu um erro',
        details: error,
        timestamp: new Date().toISOString(),
      });
    }

    if (!code || !shop_id) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros ausentes',
        message: 'Code ou shop_id não fornecidos',
        timestamp: new Date().toISOString(),
      });
    }

    // Obter tokens
    const tokenResponse = await getAccessToken(code, shop_id);

    if (!tokenResponse.access_token) {
      throw new Error('Token não recebido da Shopee');
    }

    // Salvar no banco de dados
    const expiresAt = new Date(Date.now() + tokenResponse.expire_in * 1000);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    await ShopeeAuth.upsert({
      shop_id: parseInt(shop_id),
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: expiresAt,
      refresh_expires_at: refreshExpiresAt,
      status: 'active',
    });

    res.json({
      success: true,
      message: 'Autorização concluída com sucesso!',
      data: {
        shop_id: parseInt(shop_id),
        expires_at: expiresAt,
        status: 'Loja conectada e pronta para sincronização',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro no callback de autorização:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível completar a autorização',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /auth/status - Verificar status da autorização
router.get('/status', async (req, res) => {
  try {
    const auths = await ShopeeAuth.findAll({
      attributes: [
        'shop_id',
        'shop_name',
        'status',
        'expires_at',
        'last_sync_at',
      ],
      order: [['updated_at', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        connected_shops: auths.length,
        shops: auths.map(auth => ({
          shop_id: auth.shop_id,
          shop_name: auth.shop_name || 'Nome não definido',
          status: auth.status,
          is_token_valid: auth.isTokenValid(),
          needs_refresh: auth.needsRefresh(),
          expires_at: auth.expires_at,
          last_sync_at: auth.last_sync_at,
        })),
      },
      message: `${auths.length} loja(s) conectada(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível verificar status da autorização',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
