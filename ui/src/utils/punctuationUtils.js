export const getPunctuationClass = (punctuation) => {
  const punctMap = {
    '.': 'punct-statement',
    '?': 'punct-question',
    '!': 'punct-goal',
    '@': 'punct-achievement'
  };
  
  return punctMap[punctuation] ?? 'punct-achievement';
};

export const punctMap = {
  '.': 'punct-statement',
  '?': 'punct-question',
  '!': 'punct-goal',
  '@': 'punct-achievement'
};