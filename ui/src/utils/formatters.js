// Shared formatting utilities

export const formatTruth = (truth) => {
  if (!truth) return 'N/A';
  return `${(truth.frequency * 100).toFixed(1)}% @ ${(truth.confidence * 100).toFixed(1)}%`;
};

export const formatBudget = (budget) => {
  if (!budget) return 'N/A';
  return `P:${budget.priority.toFixed(2)} D:${budget.durability.toFixed(2)} Q:${budget.quality.toFixed(2)}`;
};

export const formatDate = (timestamp) => 
  new Date(timestamp).toLocaleTimeString();

export const formatNumber = (num, decimals = 2) => 
  num?.toFixed(decimals) || 'N/A';