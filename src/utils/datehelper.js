// ========================================
// UTILITÁRIOS PARA MANIPULAÇÃO DE DATAS
// ========================================

/**
 * Converte data UTC para horário de Brasília
 * @param {Date|string} utcDate - Data em UTC
 * @returns {Date} Data convertida para horário local
 */
const toLocalTime = utcDate => {
  if (!utcDate) return null;

  const date = new Date(utcDate);
  return new Date(date.getTime() - 3 * 60 * 60 * 1000); // UTC-3
};

/**
 * Formata data para exibição em português brasileiro
 * @param {Date|string} date - Data para formatar
 * @returns {string} Data formatada
 */
const formatBR = date => {
  if (!date) return null;

  const localDate = toLocalTime(date);
  return localDate.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Obtém data atual no horário de Brasília
 * @returns {Date} Data atual local
 */
const now = () => {
  return toLocalTime(new Date());
};

/**
 * Verifica se uma data está dentro de um intervalo
 * @param {Date} date - Data para verificar
 * @param {Date} start - Data de início
 * @param {Date} end - Data de fim
 * @returns {boolean} True se estiver no intervalo
 */
const isInRange = (date, start, end) => {
  const checkDate = new Date(date);
  return checkDate >= start && checkDate <= end;
};

module.exports = {
  toLocalTime,
  formatBR,
  now,
  isInRange,
};
