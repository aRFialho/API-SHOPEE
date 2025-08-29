// ========================================
// MIDDLEWARE DE VALIDAÇÃO
// Validações customizadas para requisições
// ========================================

// Validar ID numérico
const validateId = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      error: 'ID inválido',
      message: 'O ID deve ser um número válido',
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

// Validar dados de produto
const validateProductData = (req, res, next) => {
  const { name, price } = req.body;
  const errors = [];

  // Validar nome
  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    errors.push('Nome deve ter pelo menos 3 caracteres');
  }

  // Validar preço
  if (price !== undefined) {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.push('Preço deve ser um número válido e não negativo');
    }
  }

  // Validar estoque
  if (req.body.stock_quantity !== undefined) {
    const stock = parseInt(req.body.stock_quantity);
    if (isNaN(stock) || stock < 0) {
      errors.push(
        'Quantidade em estoque deve ser um número válido e não negativo'
      );
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      message: errors.join(', '),
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

// Sanitizar dados de entrada
const sanitizeProductData = (req, res, next) => {
  if (req.body.name) {
    req.body.name = req.body.name.trim();
  }

  if (req.body.description) {
    req.body.description = req.body.description.trim();
  }

  if (req.body.category_name) {
    req.body.category_name = req.body.category_name.trim();
  }

  next();
};

module.exports = {
  validateId,
  validateProductData,
  sanitizeProductData,
};
