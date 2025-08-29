// ========================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// SQLite + Sequelize para Shopee Manager
// ========================================

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Configurações do banco de dados
const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Criando instância do Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: NODE_ENV === 'development' ? console.log : false,

  // Configurações de pool de conexões
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },

  // Configurações SQLite específicas
  dialectOptions: {
    // Timeout para operações
    timeout: 20000,
  },

  // Configurações gerais
  define: {
    // Timestamps automáticos
    timestamps: true,
    // Usar snake_case para nomes de tabelas
    underscored: true,
    // Não deletar fisicamente, apenas marcar como deletado
    paranoid: true,
    // Pluralizar nomes de tabelas automaticamente
    freezeTableName: false,
  },
});

// Função para testar conexão
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com SQLite estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error.message);
    return false;
  }
};

// Função para sincronizar modelos
const syncDatabase = async (force = false) => {
  try {
    console.log('🔄 Sincronizando banco de dados...');

    await sequelize.sync({
      force, // Se true, recria todas as tabelas
      alter: !force, // Se true, altera tabelas existentes
    });

    console.log('✅ Banco de dados sincronizado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao sincronizar banco de dados:', error.message);
    return false;
  }
};

// Função para fechar conexão graciosamente
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('✅ Conexão com banco de dados fechada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao fechar conexão:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  closeConnection,
  Sequelize,
};
