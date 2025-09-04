// ========================================
// SHOPEE REAL-TIME SERVICE
// ========================================

const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

class ShopeeService {
  constructor() {
    this.baseURL = 'https://shopee.com.br';
    this.searchURL = 'https://shopee.com.br/search';
    this.headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
  }

  // ========================================
  // BUSCAR PRODUTOS REAIS DA SHOPEE
  // ========================================
  async searchProductsByCategory(category = 'móveis e estofados', limit = 50) {
    try {
      console.log(`🔍 Buscando produtos reais da Shopee: ${category}`);

      const queries = this.getCategoryQueries(category);
      let allProducts = [];

      for (const query of queries.slice(0, 3)) {
        // Limitar para não sobrecarregar
        console.log(`   📦 Buscando: ${query}`);
        const products = await this.scrapeShopeeSearch(
          query,
          Math.ceil(limit / 3)
        );
        allProducts = allProducts.concat(products);

        // Delay entre requisições para evitar bloqueio
        await this.delay(2000);
      }

      // Remover duplicatas e limitar
      const uniqueProducts = this.removeDuplicates(allProducts);
      console.log(`✅ Encontrados ${uniqueProducts.length} produtos únicos`);

      return uniqueProducts.slice(0, limit);
    } catch (error) {
      console.error('❌ Erro ao buscar produtos da Shopee:', error);
      throw error;
    }
  }

  // ========================================
  // SCRAPING COM PLAYWRIGHT (MAIS EFICAZ)
  // ========================================
  async scrapeShopeeSearch(query, limit = 20) {
    let browser = null;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Configurar user agent e viewport
      await page.setUserAgent(this.headers['User-Agent']);
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navegar para página de busca
      const searchUrl = `${this.searchURL}?keyword=${encodeURIComponent(query)}`;
      console.log(`   🌐 Acessando: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle' });

      // Aguardar carregamento dos produtos
      await page.waitForSelector('[data-sqe="item"]', { timeout: 10000 });

      // Extrair dados dos produtos
      const products = await page.evaluate(query => {
        const items = document.querySelectorAll('[data-sqe="item"]');
        const results = [];

        items.forEach((item, index) => {
          if (index >= 20) return; // Limitar para performance

          try {
            const nameElement = item.querySelector('[data-sqe="name"]');
            const priceElement = item.querySelector('[data-sqe="price"]');
            const soldElement = item.querySelector('._1cEkb');
            const ratingElement = item.querySelector('._3Oj5_');
            const imageElement = item.querySelector('img');
            const linkElement = item.querySelector('a');

            if (nameElement && priceElement) {
              const name = nameElement.textContent.trim();
              const priceText = priceElement.textContent.trim();
              const price = this.extractPrice(priceText);
              const sold = this.extractSoldCount(
                soldElement?.textContent || '0'
              );
              const rating = this.extractRating(
                ratingElement?.textContent || '0'
              );

              results.push({
                name: name,
                price: price,
                sold_count: sold,
                rating: rating,
                image: imageElement?.src || '',
                url: linkElement?.href || '',
                search_query: query,
                scraped_at: new Date().toISOString(),
              });
            }
          } catch (err) {
            console.log('Erro ao processar item:', err);
          }
        });

        return results;
      }, query);

      // Processar e formatar produtos
      const formattedProducts = products.map(product =>
        this.formatScrapedProduct(product)
      );

      console.log(
        `   ✅ Extraídos ${formattedProducts.length} produtos para "${query}"`
      );
      return formattedProducts;
    } catch (error) {
      console.error(`❌ Erro no scraping para "${query}":`, error);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // ========================================
  // ANÁLISE DE PREÇOS REAL
  // ========================================
  async analyzeCategoryPrices(category = 'móveis e estofados') {
    try {
      console.log(`📊 Iniciando análise real de preços: ${category}`);

      const products = await this.searchProductsByCategory(category, 60);

      if (products.length === 0) {
        throw new Error('Nenhum produto encontrado na Shopee para análise');
      }

      const analysis = {
        category: category,
        total_products: products.length,
        analysis_date: new Date().toISOString(),
        price_statistics: this.calculateRealPriceStatistics(products),
        top_performers: this.getRealTopPerformers(products),
        price_distribution: this.getRealPriceDistribution(products),
        competitive_insights: this.getRealCompetitiveInsights(products),
        market_position: this.determineMarketPosition(products),
        recommendations: this.generateRealRecommendations(products, category),
      };

      console.log(
        `✅ Análise concluída: ${products.length} produtos analisados`
      );
      return analysis;
    } catch (error) {
      console.error('❌ Erro na análise real de preços:', error);
      throw error;
    }
  }

  // ========================================
  // ANÁLISE COMPETITIVA REAL
  // ========================================
  async analyzeProductCompetition(productName, currentPrice = null) {
    try {
      console.log(`🎯 Análise competitiva real para: ${productName}`);

      // Buscar produtos similares
      const competitors = await this.scrapeShopeeSearch(productName, 25);

      if (currentPrice) {
        // Filtrar por faixa de preço similar
        const priceRange = {
          min: currentPrice * 0.6,
          max: currentPrice * 1.4,
        };

        const filteredCompetitors = competitors.filter(
          p => p.price >= priceRange.min && p.price <= priceRange.max
        );

        return this.analyzeRealCompetitors(
          filteredCompetitors,
          productName,
          currentPrice
        );
      }

      return this.analyzeRealCompetitors(
        competitors,
        productName,
        currentPrice
      );
    } catch (error) {
      console.error('❌ Erro na análise competitiva real:', error);
      throw error;
    }
  }

  // ========================================
  // FUNÇÕES DE PROCESSAMENTO
  // ========================================

  formatScrapedProduct(product) {
    return {
      id: this.generateProductId(product.name, product.price),
      name: product.name,
      price: product.price,
      sold_count: product.sold_count,
      rating: product.rating,
      image: product.image,
      url: product.url,
      performance_score: this.calculateRealPerformanceScore(product),
      category: this.inferCategory(product.name),
      search_query: product.search_query,
      scraped_at: product.scraped_at,
      source: 'shopee_real',
    };
  }

  calculateRealPerformanceScore(product) {
    // Score baseado em vendas (40%), rating (30%), preço competitivo (30%)
    const soldScore = Math.min((product.sold_count / 100) * 40, 40);
    const ratingScore = (product.rating / 5) * 30;
    const priceScore = product.price > 0 ? 30 : 0;

    return Math.round(soldScore + ratingScore + priceScore);
  }

  calculateRealPriceStatistics(products) {
    const prices = products
      .map(p => p.price)
      .filter(p => p > 0)
      .sort((a, b) => a - b);
    const total = prices.length;

    if (total === 0) return null;

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average:
        Math.round(
          (prices.reduce((sum, price) => sum + price, 0) / total) * 100
        ) / 100,
      median:
        total % 2 === 0
          ? Math.round(
              ((prices[total / 2 - 1] + prices[total / 2]) / 2) * 100
            ) / 100
          : prices[Math.floor(total / 2)],
      quartile_1: prices[Math.floor(total * 0.25)],
      quartile_3: prices[Math.floor(total * 0.75)],
      standard_deviation: this.calculateStandardDeviation(prices),
    };
  }

  getRealTopPerformers(products) {
    return products
      .filter(p => p.performance_score > 0)
      .sort((a, b) => b.performance_score - a.performance_score)
      .slice(0, 10)
      .map((product, index) => ({
        rank: index + 1,
        name: product.name,
        price: product.price,
        sold_count: product.sold_count,
        rating: product.rating,
        performance_score: product.performance_score,
        category: product.category,
        competitive_advantage: this.identifyCompetitiveAdvantage(
          product,
          products
        ),
      }));
  }

  getRealPriceDistribution(products) {
    const prices = products.map(p => p.price).filter(p => p > 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;

    const segments = {
      budget: { min: min, max: min + range * 0.33, count: 0 },
      mid_range: { min: min + range * 0.33, max: min + range * 0.67, count: 0 },
      premium: { min: min + range * 0.67, max: max, count: 0 },
    };

    prices.forEach(price => {
      if (price <= segments.budget.max) segments.budget.count++;
      else if (price <= segments.mid_range.max) segments.mid_range.count++;
      else segments.premium.count++;
    });

    return segments;
  }

  generateRealRecommendations(products, category) {
    const stats = this.calculateRealPriceStatistics(products);
    const topPerformers = this.getRealTopPerformers(products);

    const recommendations = [];

    // Recomendação de preço
    if (stats) {
      recommendations.push({
        type: 'pricing',
        priority: 'alta',
        title: 'Oportunidade de Precificação',
        description: `Preço médio do mercado: ${this.formatCurrency(stats.average)}. Faixa competitiva: ${this.formatCurrency(stats.quartile_1)} - ${this.formatCurrency(stats.quartile_3)}`,
        action:
          'Posicionar produtos na faixa do Q1-Q3 para máxima competitividade',
        data_source: 'shopee_real_time',
      });
    }

    // Recomendação baseada em top performers
    if (topPerformers.length > 0) {
      const bestPerformer = topPerformers[0];
      recommendations.push({
        type: 'benchmarking',
        priority: 'alta',
        title: 'Benchmark de Sucesso',
        description: `"${bestPerformer.name}" lidera com ${bestPerformer.sold_count} vendas e nota ${bestPerformer.rating}`,
        action:
          'Analisar estratégias do líder: preço, descrição, imagens e atendimento',
        data_source: 'shopee_real_time',
      });
    }

    // Recomendação de mercado
    const avgSold =
      products.reduce((sum, p) => sum + p.sold_count, 0) / products.length;
    recommendations.push({
      type: 'market_insight',
      priority: 'média',
      title: 'Insight de Mercado',
      description: `Média de vendas na categoria: ${Math.round(avgSold)} unidades`,
      action: 'Produtos com menos vendas precisam de otimização urgente',
      data_source: 'shopee_real_time',
    });

    return recommendations;
  }

  // ========================================
  // FUNÇÕES AUXILIARES
  // ========================================

  getCategoryQueries(category) {
    const queries = {
      'móveis e estofados': [
        'sofá 3 lugares',
        'poltrona reclinável',
        'mesa jantar',
      ],
      móveis: ['sofá', 'poltrona', 'mesa', 'cadeira', 'guarda roupa'],
      sofás: ['sofá 2 lugares', 'sofá 3 lugares', 'sofá retrátil'],
      poltronas: [
        'poltrona reclinável',
        'poltrona presidente',
        'poltrona decorativa',
      ],
      mesas: ['mesa jantar', 'mesa centro', 'mesa escritório'],
      cadeiras: ['cadeira escritório', 'cadeira gamer', 'cadeira jantar'],
      camas: ['cama box', 'cama solteiro', 'cama casal'],
      'guarda-roupas': ['guarda roupa', 'roupeiro', 'armário quarto'],
    };

    return queries[category.toLowerCase()] || [category];
  }

  extractPrice(priceText) {
    if (!priceText) return 0;

    // Remover símbolos e extrair número
    const cleaned = priceText.replace(/[^\d,]/g, '').replace(',', '.');
    const price = parseFloat(cleaned);

    return isNaN(price) ? 0 : price;
  }

  extractSoldCount(soldText) {
    if (!soldText) return 0;

    const match = soldText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  extractRating(ratingText) {
    if (!ratingText) return 0;

    const match = ratingText.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  removeDuplicates(products) {
    const seen = new Set();
    return products.filter(product => {
      const key = `${product.name}-${product.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  generateProductId(name, price) {
    return `${name.substring(0, 10).replace(/\s/g, '')}_${price}`.toLowerCase();
  }

  inferCategory(productName) {
    const name = productName.toLowerCase();

    if (name.includes('sofá')) return 'Sofás';
    if (name.includes('poltrona')) return 'Poltronas';
    if (name.includes('mesa')) return 'Mesas';
    if (name.includes('cadeira')) return 'Cadeiras';
    if (name.includes('cama')) return 'Camas';
    if (name.includes('guarda') || name.includes('roupeiro'))
      return 'Guarda-roupas';
    if (name.includes('estante')) return 'Estantes';

    return 'Móveis Gerais';
  }

  identifyCompetitiveAdvantage(product, allProducts) {
    const avgPrice =
      allProducts.reduce((sum, p) => sum + p.price, 0) / allProducts.length;
    const avgSold =
      allProducts.reduce((sum, p) => sum + p.sold_count, 0) /
      allProducts.length;

    const advantages = [];

    if (product.price < avgPrice * 0.8) advantages.push('Preço competitivo');
    if (product.sold_count > avgSold * 1.5)
      advantages.push('Alto volume de vendas');
    if (product.rating >= 4.5) advantages.push('Excelente avaliação');

    return advantages.length > 0
      ? advantages.join(', ')
      : 'Performance equilibrada';
  }

  calculateStandardDeviation(prices) {
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const squaredDiffs = prices.map(price => Math.pow(price - avg, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / prices.length;
    return Math.sqrt(avgSquaredDiff);
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  determineMarketPosition(products) {
    const prices = products.map(p => p.price).filter(p => p > 0);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    if (avg < 300) return 'mercado_economico';
    if (avg < 800) return 'mercado_intermediario';
    return 'mercado_premium';
  }

  analyzeRealCompetitors(competitors, productName, currentPrice) {
    const analysis = {
      product_name: productName,
      current_price: currentPrice,
      competitors_found: competitors.length,
      direct_competitors: competitors.slice(0, 10),
      market_position: this.determineMarketPosition(competitors),
      price_comparison: this.comparePrices(competitors, currentPrice),
      performance_comparison: this.comparePerformance(competitors),
      recommendations: this.generateCompetitiveRecommendations(
        competitors,
        currentPrice
      ),
    };

    return analysis;
  }

  comparePrices(competitors, currentPrice) {
    if (!currentPrice) return null;

    const prices = competitors.map(c => c.price).filter(p => p > 0);
    const lowerPriced = prices.filter(p => p < currentPrice).length;
    const higherPriced = prices.filter(p => p > currentPrice).length;

    return {
      lower_priced_competitors: lowerPriced,
      higher_priced_competitors: higherPriced,
      price_position:
        lowerPriced > higherPriced
          ? 'acima_mercado'
          : higherPriced > lowerPriced
            ? 'abaixo_mercado'
            : 'alinhado_mercado',
    };
  }

  comparePerformance(competitors) {
    const avgSold =
      competitors.reduce((sum, c) => sum + c.sold_count, 0) /
      competitors.length;
    const avgRating =
      competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length;

    return {
      average_sales: Math.round(avgSold),
      average_rating: Math.round(avgRating * 10) / 10,
      top_seller: competitors.sort((a, b) => b.sold_count - a.sold_count)[0],
      highest_rated: competitors.sort((a, b) => b.rating - a.rating)[0],
    };
  }

  generateCompetitiveRecommendations(competitors, currentPrice) {
    const recommendations = [];

    if (competitors.length > 0) {
      const topCompetitor = competitors.sort(
        (a, b) => b.performance_score - a.performance_score
      )[0];

      recommendations.push({
        type: 'competitive_analysis',
        priority: 'alta',
        title: 'Análise do Principal Concorrente',
        description: `"${topCompetitor.name}" é o líder com ${topCompetitor.sold_count} vendas`,
        action:
          'Estudar estratégia do concorrente líder para otimizar seu produto',
      });
    }

    return recommendations;
  }
}

module.exports = ShopeeService;
