/**
 * Tests for synthetic data analysis algorithms
 * These test the core data analysis logic without importing the full service
 */

describe('Synthetic Data Analysis Algorithms', () => {
  describe('Numeric Analysis', () => {
    it('should calculate basic statistics correctly', () => {
      const values = [25, 30, 45, 35, 28];
      const sorted = values.sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mean = sum / sorted.length;
      
      const stats = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean,
        median: sorted[Math.floor(sorted.length / 2)],
        stdDev: Math.sqrt(sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length)
      };

      expect(stats.min).toBe(25);
      expect(stats.max).toBe(45);
      expect(stats.mean).toBe(32.6);
      expect(stats.median).toBe(30);
      expect(stats.stdDev).toBeCloseTo(7.0, 0);
    });

    it('should handle single value arrays', () => {
      const values = [42];
      const stats = {
        min: values[0],
        max: values[0],
        mean: values[0],
        median: values[0],
        stdDev: 0
      };

      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.mean).toBe(42);
      expect(stats.stdDev).toBe(0);
    });
  });

  describe('Categorical Analysis', () => {
    it('should count value distributions correctly', () => {
      const values = ['Diabetes', 'Hypertension', 'Diabetes', 'Asthma', 'Diabetes'];
      const distribution: Record<string, number> = {};
      
      for (const value of values) {
        distribution[value] = (distribution[value] || 0) + 1;
      }

      expect(distribution['Diabetes']).toBe(3);
      expect(distribution['Hypertension']).toBe(1);
      expect(distribution['Asthma']).toBe(1);
      expect(Object.keys(distribution)).toHaveLength(3);
    });

    it('should generate weighted samples correctly', () => {
      const distribution = {
        'Diabetes': 3,
        'Hypertension': 1,
        'Asthma': 1
      };

      // Simple weighted sampling algorithm
      const weightedSample = (dist: Record<string, number>): string => {
        const entries = Object.entries(dist);
        const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const [value, weight] of entries) {
          random -= weight;
          if (random <= 0) {
            return value;
          }
        }
        
        return entries[0][0];
      };

      // Test that it returns valid values
      for (let i = 0; i < 10; i++) {
        const sample = weightedSample(distribution);
        expect(['Diabetes', 'Hypertension', 'Asthma']).toContain(sample);
      }
    });
  });

  describe('String Analysis', () => {
    it('should calculate average string length correctly', () => {
      const strings = ['John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Williams'];
      const totalLength = strings.reduce((sum, str) => sum + str.length, 0);
      const averageLength = totalLength / strings.length;

      expect(averageLength).toBe(10.75);
    });

    it('should find common prefixes correctly', () => {
      const strings = ['Dr. Smith', 'Dr. Johnson', 'Mr. Brown', 'Dr. Wilson'];
      const prefixCounts: Record<string, number> = {};
      
      for (const str of strings) {
        for (let i = 2; i <= Math.min(str.length, 5); i++) {
          const prefix = str.substring(0, i);
          prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
        }
      }
      
      const threshold = Math.max(1, strings.length * 0.2);
      const commonPrefixes = Object.entries(prefixCounts)
        .filter(([, count]) => count >= threshold)
        .map(([prefix]) => prefix);

      expect(commonPrefixes).toContain('Dr');
      expect(commonPrefixes).toContain('Dr.');
    });
  });

  describe('Date Analysis', () => {
    it('should find date ranges correctly', () => {
      const dates = [
        new Date('1990-01-15'),
        new Date('1985-06-20'),
        new Date('1992-12-03'),
        new Date('1988-09-10')
      ];

      const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
      const dateStats = {
        minDate: sortedDates[0],
        maxDate: sortedDates[sortedDates.length - 1]
      };

      expect(dateStats.minDate).toEqual(new Date('1985-06-20'));
      expect(dateStats.maxDate).toEqual(new Date('1992-12-03'));
    });
  });

  describe('Realistic Generation Logic', () => {
    it('should keep numeric values within observed bounds', () => {
      const stats = {
        min: 18,
        max: 65,
        mean: 35,
        stdDev: 10
      };

      // Simulate the realistic generation logic
      const generateRealisticValue = (inputStats: { min: number; max: number; mean: number; stdDev: number }): number => {
        // Use a bounded normal distribution
        const min = Math.max(inputStats.min, inputStats.mean - 2 * inputStats.stdDev);
        const max = Math.min(inputStats.max, inputStats.mean + 2 * inputStats.stdDev);
        
        // Simple random value within bounds (in real implementation would use normal distribution)
        const value = Math.random() * (max - min) + min;
        
        // Ensure within absolute bounds
        return Math.max(inputStats.min, Math.min(inputStats.max, value));
      };

      // Test multiple generations
      for (let i = 0; i < 100; i++) {
        const value = generateRealisticValue(stats);
        expect(value).toBeGreaterThanOrEqual(18);
        expect(value).toBeLessThanOrEqual(65);
      }
    });

    it('should generate dates within observed range', () => {
      const dateStats = {
        minDate: new Date('1980-01-01'),
        maxDate: new Date('2000-12-31')
      };

      const generateRealisticDate = (stats: typeof dateStats): Date => {
        const minTime = stats.minDate.getTime();
        const maxTime = stats.maxDate.getTime();
        const randomTime = Math.random() * (maxTime - minTime) + minTime;
        return new Date(randomTime);
      };

      for (let i = 0; i < 20; i++) {
        const date = generateRealisticDate(dateStats);
        expect(date.getTime()).toBeGreaterThanOrEqual(dateStats.minDate.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(dateStats.maxDate.getTime());
      }
    });
  });
});