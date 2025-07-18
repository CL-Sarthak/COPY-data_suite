import { describe, it, expect } from '@jest/globals';
import { getQualityColor, getQualityLabel } from '../utils';

describe('DataProfilingViewer utils', () => {
  describe('getQualityColor', () => {
    it('should return green color for excellent quality (>0.9)', () => {
      expect(getQualityColor(0.95)).toBe('text-green-600 bg-green-100');
      expect(getQualityColor(0.91)).toBe('text-green-600 bg-green-100');
      expect(getQualityColor(1.0)).toBe('text-green-600 bg-green-100');
    });

    it('should return blue color for good quality (>0.7-0.9)', () => {
      expect(getQualityColor(0.8)).toBe('text-blue-600 bg-blue-100');
      expect(getQualityColor(0.71)).toBe('text-blue-600 bg-blue-100');
      expect(getQualityColor(0.9)).toBe('text-blue-600 bg-blue-100');
    });

    it('should return yellow color for fair quality (>0.5-0.7)', () => {
      expect(getQualityColor(0.6)).toBe('text-yellow-600 bg-yellow-100');
      expect(getQualityColor(0.51)).toBe('text-yellow-600 bg-yellow-100');
      expect(getQualityColor(0.7)).toBe('text-yellow-600 bg-yellow-100');
    });

    it('should return red color for poor quality (<=0.5)', () => {
      expect(getQualityColor(0.5)).toBe('text-red-600 bg-red-100');
      expect(getQualityColor(0.3)).toBe('text-red-600 bg-red-100');
      expect(getQualityColor(0)).toBe('text-red-600 bg-red-100');
    });
  });

  describe('getQualityLabel', () => {
    it('should return "Excellent" for score >0.9', () => {
      expect(getQualityLabel(0.95)).toBe('Excellent');
      expect(getQualityLabel(0.91)).toBe('Excellent');
      expect(getQualityLabel(1.0)).toBe('Excellent');
    });

    it('should return "Good" for score >0.7-0.9', () => {
      expect(getQualityLabel(0.8)).toBe('Good');
      expect(getQualityLabel(0.71)).toBe('Good');
      expect(getQualityLabel(0.9)).toBe('Good');
    });

    it('should return "Fair" for score >0.5-0.7', () => {
      expect(getQualityLabel(0.6)).toBe('Fair');
      expect(getQualityLabel(0.51)).toBe('Fair');
      expect(getQualityLabel(0.7)).toBe('Fair');
    });

    it('should return "Poor" for score <=0.5', () => {
      expect(getQualityLabel(0.5)).toBe('Poor');
      expect(getQualityLabel(0.3)).toBe('Poor');
      expect(getQualityLabel(0)).toBe('Poor');
    });
  });
});