export const getQualityColor = (score: number): string => {
  if (score > 0.9) return 'text-green-600 bg-green-100';
  if (score > 0.7) return 'text-blue-600 bg-blue-100';
  if (score > 0.5) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

export const getQualityLabel = (score: number): string => {
  if (score > 0.9) return 'Excellent';
  if (score > 0.7) return 'Good';
  if (score > 0.5) return 'Fair';
  return 'Poor';
};