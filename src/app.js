// ========================================
// SHOPEE MANAGER API - Servidor Principal
// Desenvolvido por: Raphael (DRossi)
// ========================================
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar configuração do banco de dados
const { testConnection, syncDatabase } = require('./config/database');
const models = require('./models');

// Importar rotas
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const syncRoutes = require('./routes/sync');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notifications');
const automationRoutes = require('./routes/automation');
const reportsRoutes = require('./routes/reports');
const benchmarkingRoutes = require('./routes/benchmarking');
// Inicializando a aplicação Express
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARES DE SEGURANÇA E CONFIGURAÇÃO
// ========================================

// Helmet - Proteção de headers de segurança
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS - Permitir requisições cross-origin
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://seudominio.com']
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);

// Morgan - Logging de requisições
app.use(morgan('combined'));

// Body parsing (DEVE vir antes das rotas da API)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting - Proteção contra spam
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP
  message: {
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});
app.use('/api/', limiter);

// ========================================
// ROTAS DA API
// ========================================

// Registrar rotas da API
app.use('/api/products', productRoutes);
app.use('/auth', authRoutes);
app.use('/sync', syncRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/ai', aiRoutes);
app.use('/notifications', notificationRoutes);
app.use('/automation', automationRoutes);
app.use('/reports', reportsRoutes);
app.use('/benchmarking', benchmarkingRoutes);
// ========================================
// CONFIGURAÇÃO DE CSP (Content Security Policy)
// ========================================
app.use((req, res, next) => {
  // CSP mais permissivo para desenvolvimento
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
      "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com; " +
      "img-src 'self' data: https: http:; " +
      "connect-src 'self' https:; " +
      "frame-src 'none';"
  );
  next();
});

console.log('🔒 CSP configurado para permitir CDNs externos');
// ========================================
// SERVIR ARQUIVOS ESTÁTICOS E INTERFACE WEB
// ========================================

// Servir arquivos estáticos (CSS, JS, imagens)
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/assets', express.static(path.join(__dirname, 'public')));

// Rotas da Interface Web
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/interface', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// ========================================
// ROTAS PRINCIPAIS
// ========================================

// Rota de boas-vindas
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Shopee Manager API está online!',
    version: '2.0.0',
    status: 'operational',
    developer: 'Raphael (DRossi)',
    description: 'Sistema inteligente para gerenciamento completo da Shopee',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      products: '/api/products',
      auth: '/auth/shopee',
      dashboard: '/dashboard',
      interface: '/app',
      docs: '/api/docs',
    },
    web_interface: {
      dashboard: 'http://localhost:3000/dashboard',
      alternative: 'http://localhost:3000/app',
      status: 'Interface web disponível!',
    },
  });
});

// Health Check - Monitoramento do sistema
app.get('/health', async (req, res) => {
  try {
    // Testar conexão com banco de dados
    await models.sequelize.authenticate();

    const healthData = {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: {
        status: 'connected',
        type: 'SQLite',
        models: ['Product', 'Order', 'ShopeeAuth'],
      },
      api_routes: {
        products: '/api/products',
        product_stats: '/api/products/stats',
        auth_shopee: '/auth/shopee',
        auth_status: '/auth/status',
      },
    };

    res.json(healthData);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Rota de informações da API
// Rota de informações da API
app.get('/api', (req, res) => {
  res.json({
    name: 'Shopee Manager API',
    version: '2.0.0',
    description: 'API Inteligente para gerenciamento completo da Shopee com IA',
    features: [
      '🛍️ Gestão Completa de Produtos',
      '📦 Controle de Pedidos',
      '🔐 Integração com Shopee API',
      '🔄 Sincronização Automática',
      '📊 Analytics Avançados',
      '🤖 Inteligência Artificial',
      '🔔 Notificações Inteligentes',
      '💰 Otimização de Preços',
      '📈 Previsão de Demanda',
      '🎯 Dashboard Executivo',
    ],
    endpoints: {
      // Produtos
      products: '/api/products',
      product_stats: '/api/products/stats',

      // Autenticação Shopee
      auth_shopee: '/auth/shopee',
      auth_callback: '/auth/shopee/callback',
      auth_status: '/auth/status',

      // Sincronização
      sync_status: '/sync/status',
      sync_products: '/sync/products/:shop_id',
      sync_push: '/sync/push/:id',

      // Analytics
      dashboard: '/analytics/dashboard',
      products_report: '/analytics/products',

      // Inteligência Artificial
      ai_pricing: '/ai/pricing',
      ai_demand: '/ai/demand',
      ai_categories: '/ai/categories',

      // Notificações
      alerts: '/notifications/alerts',
      notifications_dashboard: '/notifications/dashboard',
    },
    ai_capabilities: {
      pricing_optimization:
        'Análise inteligente de preços com recomendações baseadas em performance',
      demand_forecasting: 'Previsão de demanda e necessidades de reposição',
      category_analysis:
        'Otimização de categorias e identificação de oportunidades',
      smart_alerts: 'Alertas inteligentes para estoque, vendas e tokens',
    },
    shopee_integration: {
      status: 'Aguardando validação da Shopee Open Platform',
      current_phase: 'Sistema completo com IA implementado',
      ready_features: [
        '✅ Sistema de produtos completo',
        '✅ Autenticação preparada',
        '✅ Sincronização estruturada',
        '✅ Analytics implementado',
        '✅ IA para otimização de preços',
        '✅ Previsão de demanda',
        '✅ Notificações inteligentes',
        '⏳ Aguardando credenciais da Shopee',
      ],
    },
    status:
      'Sistema completo com IA - Pronto para revolucionar seu e-commerce!',
  });
});

// ========================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ========================================

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    message: `A rota ${req.method} ${req.originalUrl} não existe`,
    suggestion: 'Verifique a documentação da API em /api',
    available_endpoints: [
      'GET /',
      'GET /health',
      'GET /api',
      'GET /dashboard',
      'GET /app',
      'GET /interface',
      'GET /api/products',
      'POST /api/products',
      'GET /api/products/:id',
      'PUT /api/products/:id',
      'DELETE /api/products/:id',
      'GET /api/products/stats',
      'GET /auth/shopee',
      'GET /auth/shopee/callback',
      'GET /auth/status',
      'GET /sync/status',
      'GET /analytics/dashboard',
      'GET /ai/pricing',
      'GET /notifications/alerts',
    ],
    web_interface: {
      dashboard: '/dashboard',
      alternative: '/app',
    },
    timestamp: new Date().toISOString(),
  });
});

// Middleware global de tratamento de erros
app.use((err, req, res, next) => {
  console.error('🚨 Erro capturado:', err.stack);

  const errorResponse = {
    error: 'Erro interno do servidor',
    message:
      process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

// ========================================
// FUNÇÕES DE INICIALIZAÇÃO
// ========================================

// Função para inicializar o banco de dados
const initializeDatabase = async () => {
  console.log('🗄️  Inicializando banco de dados...');

  // Testar conexão
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.error('❌ Falha na conexão com o banco de dados');
    throw new Error('Database connection failed');
  }

  // Sincronizar modelos
  const syncOk = await syncDatabase(false); // false = não recriar tabelas
  if (!syncOk) {
    console.error('❌ Falha na sincronização do banco de dados');
    throw new Error('Database sync failed');
  }

  console.log('✅ Banco de dados inicializado com sucesso!');
};

// Função para inicializar o servidor
const startServer = async () => {
  try {
    // Inicializar banco de dados primeiro
    await initializeDatabase();

    // Depois iniciar o servidor
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 SHOPEE MANAGER API INICIADA COM SUCESSO!');
      console.log('='.repeat(60));
      console.log(`📍 Servidor rodando na porta: ${PORT}`);
      console.log(`🌐 URL local: http://localhost:${PORT}`);
      console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
      console.log('='.repeat(60));
      console.log('📋 Endpoints de Produtos:');
      console.log(`   • GET  /api/products        - Listar produtos`);
      console.log(`   • POST /api/products        - Criar produto`);
      console.log(`   • GET  /api/products/:id    - Buscar produto`);
      console.log(`   • PUT  /api/products/:id    - Atualizar produto`);
      console.log(`   • DELETE /api/products/:id  - Remover produto`);
      console.log(`   • GET  /api/products/stats  - Estatísticas`);
      console.log('='.repeat(60));
      console.log('🔐 Endpoints de Autenticação Shopee:');
      console.log(`   • GET  /auth/shopee         - URL de autorização`);
      console.log(`   • GET  /auth/shopee/callback- Callback autorização`);
      console.log(`   • GET  /auth/status         - Status das conexões`);
      console.log('='.repeat(60));
      console.log('📖 Endpoints de Documentação:');
      console.log(`   • GET  /                    - Informações gerais`);
      console.log(`   • GET  /health              - Status do sistema`);
      console.log(`   • GET  /api                 - Documentação da API`);
      console.log('='.repeat(60));
      console.log('💡 Para parar o servidor: Ctrl+C');
      console.log('🔄 Para reiniciar: digite "rs" e pressione Enter');
      console.log('🛒 Para conectar Shopee: acesse /auth/shopee\n');
    });

    // Configurar graceful shutdown
    const gracefulShutdown = async signal => {
      console.log(
        `\n🛑 Recebido ${signal}, encerrando servidor graciosamente...`
      );

      server.close(async () => {
        console.log('🔌 Servidor HTTP encerrado');

        try {
          await models.sequelize.close();
          console.log('🗄️  Conexão com banco de dados fechada');
        } catch (error) {
          console.error('❌ Erro ao fechar banco de dados:', error.message);
        }

        console.log('✅ Servidor encerrado com sucesso!');
        process.exit(0);
      });
    };

    // Listeners para graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error.message);
    process.exit(1);
  }
};

// ========================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ========================================

// Verificar se este arquivo está sendo executado diretamente
if (require.main === module) {
  startServer();
}

module.exports = app;
