// ========================================
// CONTROLLER DE AUTOMAÇÃO - Shopee Manager
// Automação inteligente para e-commerce
// ========================================

const { Product, ShopeeAuth } = require('../models/index');
const { Op } = require('sequelize');

// ========================================
// AUTOMAÇÃO DE PREÇOS DINÂMICOS
// ========================================
const runPriceAutomation = async (req, res) => {
  try {
    const { dry_run = true, confidence_threshold = 80 } = req.query;

    // Buscar produtos ativos para automação
    const products = await Product.findAll({
      where: {
        status: 'active',
        cost_price: { [Op.not]: null },
      },
      attributes: [
        'id',
        'name',
        'price',
        'cost_price',
        'sales_count',
        'views_count',
        'rating_average',
        'stock_quantity',
      ],
    });

    const automationResults = [];
    let totalAdjustments = 0;
    let totalRevenueImpact = 0;

    for (const product of products) {
      // Algoritmo de IA para automação de preços
      const currentPrice = parseFloat(product.price);
      const costPrice = parseFloat(product.cost_price);
      const currentMargin = ((currentPrice - costPrice) / currentPrice) * 100;

      // Calcular score de performance
      const salesScore = Math.min((product.sales_count / 50) * 25, 25);
      const viewsScore = Math.min((product.views_count / 500) * 20, 20);
      const ratingScore = (product.rating_average || 3) * 11; // Max 55
      const performanceScore = salesScore + viewsScore + ratingScore;

      // Determinar ajuste de preço
      let priceAdjustment = 0;
      let newPrice = currentPrice;
      let confidence = 50;
      let action = 'manter';

      // Lógica de automação inteligente
      if (performanceScore > 80 && currentMargin < 35) {
        // Alta performance, margem baixa - aumentar preço
        priceAdjustment = 0.08; // 8%
        action = 'aumentar';
        confidence = 85;
      } else if (performanceScore < 40 && currentMargin > 25) {
        // Baixa performance, margem alta - reduzir preço
        priceAdjustment = -0.05; // -5%
        action = 'reduzir';
        confidence = 75;
      } else if (product.stock_quantity > 100 && performanceScore < 60) {
        // Muito estoque, performance média - preço promocional
        priceAdjustment = -0.1; // -10%
        action = 'promocional';
        confidence = 70;
      }

      if (priceAdjustment !== 0) {
        newPrice = currentPrice * (1 + priceAdjustment);

        // Garantir margem mínima de 15%
        const minPrice = costPrice * 1.15;
        if (newPrice < minPrice) {
          newPrice = minPrice;
          priceAdjustment = (newPrice - currentPrice) / currentPrice;
          action = 'margem_minima';
          confidence = 90;
        }

        // Aplicar mudança se confiança for alta o suficiente
        if (confidence >= parseFloat(confidence_threshold)) {
          if (!JSON.parse(dry_run)) {
            await product.update({
              price: parseFloat(newPrice.toFixed(2)),
              updated_at: new Date(),
            });
          }

          totalAdjustments++;
          totalRevenueImpact +=
            (newPrice - currentPrice) * (product.sales_count / 30); // Estimativa mensal
        }
      }

      automationResults.push({
        product_id: product.id,
        name: product.name,
        current_price: currentPrice,
        new_price: parseFloat(newPrice.toFixed(2)),
        price_change_percent: parseFloat((priceAdjustment * 100).toFixed(2)),
        current_margin: parseFloat(currentMargin.toFixed(2)),
        new_margin: parseFloat(
          (((newPrice - costPrice) / newPrice) * 100).toFixed(2)
        ),
        performance_score: parseFloat(performanceScore.toFixed(1)),
        action,
        confidence: parseFloat(confidence.toFixed(1)),
        applied:
          confidence >= parseFloat(confidence_threshold) &&
          !JSON.parse(dry_run),
        reasoning: getAutomationReasoning(
          action,
          performanceScore,
          currentMargin,
          product.stock_quantity
        ),
      });
    }

    res.json({
      success: true,
      data: {
        automation_summary: {
          total_products_analyzed: products.length,
          adjustments_made: totalAdjustments,
          estimated_revenue_impact: parseFloat(totalRevenueImpact.toFixed(2)),
          dry_run: JSON.parse(dry_run),
          confidence_threshold: parseFloat(confidence_threshold),
        },
        results: automationResults.sort((a, b) => b.confidence - a.confidence),
      },
      message: `Automação ${JSON.parse(dry_run) ? 'simulada' : 'executada'} para ${products.length} produtos`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na automação de preços:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível executar automação de preços',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// AUTOMAÇÃO DE ESTOQUE
// ========================================
const runStockAutomation = async (req, res) => {
  try {
    const { auto_reorder = false, safety_stock_days = 7 } = req.query;

    const products = await Product.findAll({
      where: { status: 'active' },
      attributes: [
        'id',
        'name',
        'stock_quantity',
        'min_stock_alert',
        'sales_count',
        'cost_price',
        'price',
      ],
    });

    const stockActions = [];
    let totalReorderValue = 0;

    for (const product of products) {
      // Calcular vendas diárias médias
      const avgDailySales = (product.sales_count || 0) / 30;
      const safetyStock = avgDailySales * parseInt(safety_stock_days);
      const reorderPoint = safetyStock + avgDailySales * 5; // 5 dias de lead time

      // Calcular quantidade ideal de pedido (EOQ simplificado)
      const demandRate = avgDailySales * 30; // Mensal
      const orderingCost = 50; // Custo fixo de pedido
      const holdingCost = (product.cost_price || product.price) * 0.02; // 2% ao mês

      const eoq = Math.sqrt((2 * demandRate * orderingCost) / holdingCost);
      const suggestedOrderQty = Math.max(
        Math.ceil(eoq),
        Math.ceil(reorderPoint - product.stock_quantity)
      );

      let action = 'ok';
      let urgency = 'baixa';
      let shouldReorder = false;

      if (product.stock_quantity <= 0) {
        action = 'sem_estoque';
        urgency = 'critica';
        shouldReorder = true;
      } else if (product.stock_quantity <= reorderPoint) {
        action = 'reabastecer';
        urgency = product.stock_quantity <= safetyStock ? 'alta' : 'media';
        shouldReorder = true;
      } else if (product.stock_quantity > eoq * 3) {
        action = 'excesso_estoque';
        urgency = 'baixa';
      }

      if (shouldReorder && JSON.parse(auto_reorder)) {
        // Aqui integraria com fornecedores automaticamente
        // Por enquanto, apenas registra a necessidade
        totalReorderValue +=
          suggestedOrderQty * (product.cost_price || product.price * 0.7);
      }

      stockActions.push({
        product_id: product.id,
        name: product.name,
        current_stock: product.stock_quantity,
        reorder_point: Math.ceil(reorderPoint),
        safety_stock: Math.ceil(safetyStock),
        suggested_order_qty: shouldReorder ? suggestedOrderQty : 0,
        estimated_cost: shouldReorder
          ? parseFloat(
              (
                suggestedOrderQty * (product.cost_price || product.price * 0.7)
              ).toFixed(2)
            )
          : 0,
        avg_daily_sales: parseFloat(avgDailySales.toFixed(2)),
        days_until_stockout:
          avgDailySales > 0
            ? Math.floor(product.stock_quantity / avgDailySales)
            : 999,
        action,
        urgency,
        auto_reorder_triggered: shouldReorder && JSON.parse(auto_reorder),
      });
    }

    res.json({
      success: true,
      data: {
        stock_summary: {
          total_products: products.length,
          need_reorder: stockActions.filter(a => a.action === 'reabastecer')
            .length,
          out_of_stock: stockActions.filter(a => a.action === 'sem_estoque')
            .length,
          excess_stock: stockActions.filter(a => a.action === 'excesso_estoque')
            .length,
          total_reorder_value: parseFloat(totalReorderValue.toFixed(2)),
          auto_reorder_enabled: JSON.parse(auto_reorder),
        },
        actions: stockActions.sort((a, b) => {
          const urgencyOrder = { critica: 4, alta: 3, media: 2, baixa: 1 };
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        }),
      },
      message: `Análise de estoque concluída para ${products.length} produtos`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na automação de estoque:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível executar automação de estoque',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// AUTOMAÇÃO DE PROMOÇÕES
// ========================================
const runPromotionAutomation = async (req, res) => {
  try {
    const { create_promotions = false, max_discount = 20 } = req.query;

    const products = await Product.findAll({
      where: {
        status: 'active',
        is_promoted: false,
      },
      attributes: [
        'id',
        'name',
        'price',
        'cost_price',
        'stock_quantity',
        'sales_count',
        'views_count',
        'rating_average',
        'updated_at',
      ],
    });

    const promotionSuggestions = [];

    for (const product of products) {
      const daysSinceUpdate = Math.floor(
        (new Date() - new Date(product.updated_at)) / (1000 * 60 * 60 * 24)
      );
      const salesVelocity = (product.sales_count || 0) / 30; // Vendas por dia
      const viewToSalesRatio =
        product.views_count > 0
          ? (product.sales_count || 0) / product.views_count
          : 0;

      let shouldPromote = false;
      let suggestedDiscount = 0;
      let reason = '';
      let priority = 'baixa';

      // Critérios para promoção automática
      if (product.stock_quantity > 50 && salesVelocity < 1) {
        // Muito estoque, vendas baixas
        shouldPromote = true;
        suggestedDiscount = Math.min(15, parseFloat(max_discount));
        reason = 'Reduzir estoque excessivo';
        priority = 'alta';
      } else if (daysSinceUpdate > 30 && salesVelocity < 2) {
        // Produto parado há muito tempo
        shouldPromote = true;
        suggestedDiscount = Math.min(10, parseFloat(max_discount));
        reason = 'Reativar produto sem movimento';
        priority = 'media';
      } else if (viewToSalesRatio < 0.02 && product.views_count > 100) {
        // Muitas visualizações, poucas vendas
        shouldPromote = true;
        suggestedDiscount = Math.min(12, parseFloat(max_discount));
        reason = 'Converter visualizações em vendas';
        priority = 'media';
      } else if (product.rating_average && product.rating_average < 3.5) {
        // Rating baixo, precisa de incentivo
        shouldPromote = true;
        suggestedDiscount = Math.min(8, parseFloat(max_discount));
        reason = 'Compensar rating baixo';
        priority = 'baixa';
      }

      if (shouldPromote) {
        const discountedPrice = product.price * (1 - suggestedDiscount / 100);
        const marginAfterDiscount = product.cost_price
          ? ((discountedPrice - product.cost_price) / discountedPrice) * 100
          : 0;

        // Verificar se a margem ainda é viável (mínimo 10%)
        if (!product.cost_price || marginAfterDiscount >= 10) {
          if (JSON.parse(create_promotions)) {
            // Aqui criaria a promoção automaticamente
            await product.update({
              is_promoted: true,
              original_price: product.price,
              price: parseFloat(discountedPrice.toFixed(2)),
            });
          }

          promotionSuggestions.push({
            product_id: product.id,
            name: product.name,
            current_price: product.price,
            suggested_price: parseFloat(discountedPrice.toFixed(2)),
            discount_percent: suggestedDiscount,
            margin_after_discount: parseFloat(marginAfterDiscount.toFixed(2)),
            reason,
            priority,
            metrics: {
              stock_quantity: product.stock_quantity,
              sales_velocity: parseFloat(salesVelocity.toFixed(2)),
              view_to_sales_ratio: parseFloat(viewToSalesRatio.toFixed(4)),
              days_since_update: daysSinceUpdate,
            },
            promotion_created: JSON.parse(create_promotions),
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        promotion_summary: {
          total_products_analyzed: products.length,
          promotion_suggestions: promotionSuggestions.length,
          high_priority: promotionSuggestions.filter(p => p.priority === 'alta')
            .length,
          medium_priority: promotionSuggestions.filter(
            p => p.priority === 'media'
          ).length,
          low_priority: promotionSuggestions.filter(p => p.priority === 'baixa')
            .length,
          promotions_created: JSON.parse(create_promotions),
        },
        suggestions: promotionSuggestions.sort((a, b) => {
          const priorityOrder = { alta: 3, media: 2, baixa: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }),
      },
      message: `${promotionSuggestions.length} sugestões de promoção geradas`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na automação de promoções:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível executar automação de promoções',
      timestamp: new Date().toISOString(),
    });
  }
};

// Função auxiliar para explicações de automação
const getAutomationReasoning = (action, performanceScore, margin, stock) => {
  switch (action) {
    case 'aumentar':
      return `Alta performance (${performanceScore.toFixed(1)}/100) permite aumento de preço. Margem atual: ${margin.toFixed(1)}%`;
    case 'reduzir':
      return `Performance baixa (${performanceScore.toFixed(1)}/100) indica necessidade de preço mais competitivo`;
    case 'promocional':
      return `Alto estoque (${stock} unidades) justifica preço promocional para acelerar vendas`;
    case 'margem_minima':
      return `Preço ajustado para manter margem mínima de 15% sobre o custo`;
    default:
      return `Preço atual adequado para performance e condições de mercado`;
  }
};

// ========================================
// AUTOMAÇÃO ESPECÍFICA POR PRODUTO
// ========================================
const runProductSpecificAutomation = async (req, res) => {
  try {
    const {
      product_ids,
      action_type = 'price', // 'price', 'stock', 'promotion'
      dry_run = true,
      apply_changes = false,
    } = req.body;

    // Validar que product_ids foi fornecido
    if (!product_ids || !Array.isArray(product_ids)) {
      return res.status(400).json({
        success: false,
        error: 'IDs de produtos obrigatórios',
        message: 'Forneça um array de product_ids para automação específica',
        example: {
          product_ids: [1, 2, 3],
          action_type: 'price',
          dry_run: true,
          apply_changes: false,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Buscar apenas os produtos especificados
    const products = await Product.findAll({
      where: {
        id: { [Op.in]: product_ids },
        status: 'active',
      },
      attributes: [
        'id',
        'name',
        'price',
        'cost_price',
        'sales_count',
        'views_count',
        'rating_average',
        'stock_quantity',
        'is_promoted',
      ],
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum produto encontrado',
        message: 'Nenhum produto ativo encontrado com os IDs fornecidos',
        provided_ids: product_ids,
        timestamp: new Date().toISOString(),
      });
    }

    const results = [];
    let changesApplied = 0;

    for (const product of products) {
      let result = {
        product_id: product.id,
        name: product.name,
        current_values: {},
        suggested_values: {},
        changes_applied: false,
        reasoning: '',
        safety_checks: [],
      };

      // Executar automação baseada no tipo
      switch (action_type) {
        case 'price':
          result = await processPriceAutomation(
            product,
            result,
            apply_changes && !JSON.parse(dry_run)
          );
          break;
        case 'stock':
          result = await processStockAutomation(
            product,
            result,
            apply_changes && !JSON.parse(dry_run)
          );
          break;
        case 'promotion':
          result = await processPromotionAutomation(
            product,
            result,
            apply_changes && !JSON.parse(dry_run)
          );
          break;
        default:
          result.reasoning = 'Tipo de ação não reconhecido';
      }

      if (result.changes_applied) {
        changesApplied++;
      }

      results.push(result);
    }

    res.json({
      success: true,
      data: {
        automation_type: action_type,
        products_processed: products.length,
        changes_applied: changesApplied,
        dry_run: JSON.parse(dry_run),
        apply_changes: apply_changes,
        safety_note: 'Nenhuma alteração foi feita sem sua permissão explícita',
        results,
      },
      message: `Automação ${action_type} ${JSON.parse(dry_run) ? 'simulada' : apply_changes ? 'executada' : 'analisada'} para ${products.length} produto(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na automação específica:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível executar automação específica',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// FUNÇÕES AUXILIARES DE PROCESSAMENTO
// ========================================
async function processPriceAutomation(product, result, applyChanges) {
  const currentPrice = parseFloat(product.price);
  const costPrice = parseFloat(product.cost_price) || 0;
  const currentMargin =
    costPrice > 0 ? ((currentPrice - costPrice) / currentPrice) * 100 : 0;

  result.current_values = {
    price: currentPrice,
    margin: parseFloat(currentMargin.toFixed(2)),
  };

  // Calcular sugestão de preço
  const performanceScore = calculatePerformanceScore(product);
  let suggestedPrice = currentPrice;
  let shouldChange = false;

  if (performanceScore > 80 && currentMargin < 35) {
    suggestedPrice = currentPrice * 1.08;
    shouldChange = true;
    result.reasoning = 'Alta performance permite aumento de preço';
  } else if (performanceScore < 40 && currentMargin > 25) {
    suggestedPrice = currentPrice * 0.95;
    shouldChange = true;
    result.reasoning =
      'Baixa performance indica necessidade de preço mais competitivo';
  }

  // Verificações de segurança
  const minPrice = costPrice * 1.15; // Margem mínima 15%
  if (suggestedPrice < minPrice) {
    suggestedPrice = minPrice;
    result.safety_checks.push(
      'Preço ajustado para manter margem mínima de 15%'
    );
  }

  const maxIncrease = currentPrice * 1.2; // Máximo 20% de aumento
  if (suggestedPrice > maxIncrease) {
    suggestedPrice = maxIncrease;
    result.safety_checks.push(
      'Aumento limitado a 20% para evitar choque de preço'
    );
  }

  result.suggested_values = {
    price: parseFloat(suggestedPrice.toFixed(2)),
    margin:
      costPrice > 0
        ? parseFloat(
            (((suggestedPrice - costPrice) / suggestedPrice) * 100).toFixed(2)
          )
        : 0,
    change_percent: parseFloat(
      (((suggestedPrice - currentPrice) / currentPrice) * 100).toFixed(2)
    ),
  };

  // Aplicar mudança apenas se autorizado
  if (
    shouldChange &&
    applyChanges &&
    Math.abs(suggestedPrice - currentPrice) > 0.01
  ) {
    await product.update({
      price: parseFloat(suggestedPrice.toFixed(2)),
      updated_at: new Date(),
    });
    result.changes_applied = true;
    result.reasoning += ' - ALTERAÇÃO APLICADA';
  } else if (!applyChanges) {
    result.reasoning += ' - SIMULAÇÃO APENAS';
  }

  return result;
}

async function processStockAutomation(product, result, applyChanges) {
  const currentStock = product.stock_quantity;
  const avgDailySales = (product.sales_count || 0) / 30;
  const reorderPoint = Math.ceil(avgDailySales * 7); // 7 dias de segurança

  result.current_values = {
    stock: currentStock,
    daily_sales: parseFloat(avgDailySales.toFixed(2)),
  };

  let action = 'ok';
  let suggestedOrder = 0;

  if (currentStock <= 0) {
    action = 'urgente_reabastecer';
    suggestedOrder = Math.max(50, Math.ceil(avgDailySales * 30));
  } else if (currentStock <= reorderPoint) {
    action = 'reabastecer';
    suggestedOrder = Math.ceil(avgDailySales * 30);
  }

  result.suggested_values = {
    action,
    reorder_point: reorderPoint,
    suggested_order_quantity: suggestedOrder,
    days_until_stockout:
      avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999,
  };

  result.reasoning = `Estoque atual: ${currentStock}, Ponto de reposição: ${reorderPoint}`;

  // Para estoque, não aplicamos mudanças automaticamente
  // Apenas sugerimos ações
  if (applyChanges && action !== 'ok') {
    result.reasoning +=
      ' - AÇÃO SUGERIDA (requer aprovação manual para pedidos)';
  }

  return result;
}

async function processPromotionAutomation(product, result, applyChanges) {
  const currentPrice = parseFloat(product.price);
  const isPromoted = product.is_promoted;

  result.current_values = {
    price: currentPrice,
    is_promoted: isPromoted,
  };

  let shouldPromote = false;
  let suggestedDiscount = 0;
  let reason = '';

  if (
    !isPromoted &&
    product.stock_quantity > 50 &&
    (product.sales_count || 0) < 30
  ) {
    shouldPromote = true;
    suggestedDiscount = 10;
    reason = 'Alto estoque com baixas vendas';
  }

  const promotionalPrice = currentPrice * (1 - suggestedDiscount / 100);

  result.suggested_values = {
    should_promote: shouldPromote,
    discount_percent: suggestedDiscount,
    promotional_price: parseFloat(promotionalPrice.toFixed(2)),
  };

  result.reasoning =
    reason || 'Produto não atende critérios para promoção automática';

  // Aplicar promoção apenas se autorizado
  if (shouldPromote && applyChanges) {
    await product.update({
      is_promoted: true,
      original_price: currentPrice,
      price: parseFloat(promotionalPrice.toFixed(2)),
    });
    result.changes_applied = true;
    result.reasoning += ' - PROMOÇÃO APLICADA';
  } else if (!applyChanges) {
    result.reasoning += ' - SIMULAÇÃO APENAS';
  }

  return result;
}

function calculatePerformanceScore(product) {
  const salesScore = Math.min((product.sales_count / 100) * 30, 30);
  const viewsScore = Math.min((product.views_count / 1000) * 20, 20);
  const ratingScore = (product.rating_average || 0) * 10;
  const stockScore =
    product.stock_quantity > 10 ? 20 : (product.stock_quantity / 10) * 20;

  return salesScore + viewsScore + ratingScore + stockScore;
}

// Adicionar ao module.exports
module.exports = {
  runPriceAutomation,
  runStockAutomation,
  runPromotionAutomation,
  runProductSpecificAutomation, // Nova função
};
