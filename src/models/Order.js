// ========================================
// MODELO ORDER - Pedidos da Shopee
// ========================================

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define(
  'Order',
  {
    // ID único do pedido
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // ID do pedido na Shopee
    shopee_order_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'ID do pedido na plataforma Shopee',
    },

    // Informações do cliente
    customer_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Nome do cliente',
    },

    // Status do pedido
    status: {
      type: DataTypes.ENUM(
        'pending_payment',
        'payment_confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
        'completed'
      ),
      allowNull: false,
      defaultValue: 'pending_payment',
      comment: 'Status atual do pedido',
    },

    // Valores financeiros
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: 'Valor total do pedido',
    },

    // Datas importantes
    order_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Data do pedido',
    },
  },
  {
    tableName: 'orders',
  }
);

module.exports = Order;
