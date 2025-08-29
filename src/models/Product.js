// ========================================
// MODELO PRODUCT - Produtos da Shopee
// ========================================

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define(
  'Product',
  {
    // ID único do produto
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // ID do produto na Shopee
    shopee_product_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: true,
      comment: 'ID do produto na plataforma Shopee',
    },

    // Informações básicas do produto
    name: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Nome do produto',
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição detalhada do produto',
    },

    // Categoria e classificação
    category_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'ID da categoria na Shopee',
    },

    category_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Nome da categoria',
    },

    // Preços e valores
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: 'Preço atual do produto',
    },

    original_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Preço original (antes de promoções)',
    },

    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Preço de custo do produto',
    },

    // Estoque e disponibilidade
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Quantidade em estoque',
    },

    min_stock_alert: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Alerta de estoque mínimo',
    },

    // Status e configurações
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'draft', 'suspended'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Status do produto',
    },

    is_promoted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Produto está em promoção',
    },

    // Métricas e performance
    views_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Número de visualizações',
    },

    sales_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Número de vendas',
    },

    rating_average: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Avaliação média (0.00 - 5.00)',
    },

    rating_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Número total de avaliações',
    },

    // Informações técnicas
    weight: {
      type: DataTypes.DECIMAL(8, 3),
      allowNull: true,
      comment: 'Peso do produto em kg',
    },

    dimensions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Dimensões do produto (comprimento, largura, altura)',
    },

    // URLs e imagens
    main_image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL da imagem principal',
    },

    images_urls: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array com URLs de todas as imagens',
    },

    shopee_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL do produto na Shopee',
    },

    // Dados de sincronização
    last_sync_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última sincronização com a Shopee',
    },

    sync_status: {
      type: DataTypes.ENUM('pending', 'synced', 'error', 'manual'),
      allowNull: false,
      defaultValue: 'manual',
      comment: 'Status da sincronização',
    },

    // Metadados adicionais
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Tags e palavras-chave do produto',
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas internas sobre o produto',
    },
  },
  {
    // Configurações da tabela
    tableName: 'products',

    // Índices para otimização
    indexes: [
      {
        fields: ['shopee_product_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['category_id'],
      },
      {
        fields: ['name'],
      },
      {
        fields: ['last_sync_at'],
      },
    ],

    // Hooks do modelo
    hooks: {
      beforeCreate: (product, options) => {
        // Validações antes de criar
        if (product.price < 0) {
          throw new Error('Preço não pode ser negativo');
        }
      },

      beforeUpdate: (product, options) => {
        // Atualizar timestamp de modificação
        product.changed('updated_at', true);
      },
    },
  }
);

// Métodos de instância
Product.prototype.calculateProfit = function () {
  if (this.cost_price && this.price) {
    return this.price - this.cost_price;
  }
  return null;
};

Product.prototype.calculateProfitMargin = function () {
  const profit = this.calculateProfit();
  if (profit !== null && this.price > 0) {
    return (profit / this.price) * 100;
  }
  return null;
};

Product.prototype.isLowStock = function () {
  return this.stock_quantity <= (this.min_stock_alert || 5);
};

// Métodos estáticos
Product.getActiveProducts = function () {
  return this.findAll({
    where: { status: 'active' },
  });
};

Product.getLowStockProducts = function () {
  return this.findAll({
    where: sequelize.where(
      sequelize.col('stock_quantity'),
      '<=',
      sequelize.col('min_stock_alert')
    ),
  });
};

module.exports = Product;
