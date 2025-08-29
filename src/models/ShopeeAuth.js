// ========================================
// MODELO SHOPEE AUTH - Tokens de Autenticação
// ========================================

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ShopeeAuth = sequelize.define(
  'ShopeeAuth',
  {
    // ID único
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // ID da loja na Shopee
    shop_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      comment: 'ID da loja na Shopee',
    },

    // Nome da loja
    shop_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Nome da loja',
    },

    // Tokens de acesso
    access_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Token de acesso atual',
    },

    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Token para renovação',
    },

    // Validade dos tokens
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Data de expiração do access token',
    },

    refresh_expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Data de expiração do refresh token',
    },

    // Status da autorização
    status: {
      type: DataTypes.ENUM('active', 'expired', 'revoked'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Status da autorização',
    },

    // Última sincronização
    last_sync_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última sincronização realizada',
    },
  },
  {
    tableName: 'shopee_auth',

    indexes: [
      {
        fields: ['shop_id'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

// Método para verificar se o token está válido
ShopeeAuth.prototype.isTokenValid = function () {
  return new Date() < this.expires_at && this.status === 'active';
};

// Método para verificar se precisa renovar
ShopeeAuth.prototype.needsRefresh = function () {
  const now = new Date();
  const timeUntilExpiry = this.expires_at - now;
  const oneHour = 60 * 60 * 1000; // 1 hora em ms

  return timeUntilExpiry < oneHour;
};

module.exports = ShopeeAuth;
