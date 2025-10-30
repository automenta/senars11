export const formatTruth = (truth) => 
  !truth ? 'N/A' : `${(truth.frequency * 100).toFixed(1)}% @ ${(truth.confidence * 100).toFixed(1)}%`;

export const formatBudget = (budget) => 
  !budget ? 'N/A' : `P:${budget.priority.toFixed(2)} D:${budget.durability.toFixed(2)} Q:${budget.quality.toFixed(2)}`;

export const formatDate = (timestamp) => 
  new Date(timestamp).toLocaleTimeString();

export const formatNumber = (num, decimals = 2) => 
  num?.toFixed(decimals) || 'N/A';