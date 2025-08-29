// ========================================
// ÍNDICE DOS MODELOS - Shopee Manager
// ========================================

const { sequelize } = require('../config/database');

// Importar todos os modelos
const Product = require('./Product');
const Order = require('./Order');
const ShopeeAuth = require('./ShopeeAuth');

// Definir relacionamentos entre modelos
const defineAssociations = () => {
  // Futuramente implementaremos relacionamentos
  // Product.belongsToMany(Order, { through: 'OrderItems' });
  // Order.belongsToMany(Product, { through: 'OrderItems' });
};

// Executar definição de relacionamentos
defineAssociations();

// Exportar todos os modelos e a instância do Sequelize
module.exports = {
  sequelize,
  Product,
  Order,
  ShopeeAuth,
};
