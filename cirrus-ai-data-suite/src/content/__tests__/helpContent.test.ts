import { getHelpContent, helpContent } from '../helpContent';

describe('helpContent', () => {
  describe('getHelpContent', () => {
    it('should return dashboard help content', () => {
      const content = getHelpContent('dashboard');
      
      expect(content.title).toBe('Dashboard Help');
      expect(content.sections).toHaveLength(3);
      expect(content.sections[0].heading).toBe('Overview');
    });

    it('should return discovery help content', () => {
      const content = getHelpContent('discovery');
      
      expect(content.title).toBe('Data Discovery Help');
      expect(content.sections.length).toBeGreaterThan(5); // Should have at least 6 sections now
      expect(content.sections[0].heading).toBe('Overview');
      
      // Check for new sections
      const sectionHeadings = content.sections.map(s => s.heading);
      expect(sectionHeadings).toContain('Table View & Navigation');
      expect(sectionHeadings).toContain('Data Previews & Toggles');
      expect(sectionHeadings).toContain('Tagging & Organization');
      expect(sectionHeadings).toContain('Managing Files & Sources');
    });

    it('should return redaction help content', () => {
      const content = getHelpContent('redaction');
      
      expect(content.title).toBe('Pattern Definition & Annotation Help');
      expect(content.sections.length).toBeGreaterThan(0);
      expect(content.sections[0].heading).toBe('Overview');
    });

    it('should return synthetic help content', () => {
      const content = getHelpContent('synthetic');
      
      expect(content.title).toBe('Synthetic Data Generation Help');
      expect(content.sections.length).toBeGreaterThan(0);
    });

    it('should return quality help content', () => {
      const content = getHelpContent('quality');
      
      expect(content.title).toBe('Data Quality Help');
      expect(content.sections.length).toBeGreaterThan(0);
    });

    it('should return compliance help content', () => {
      const content = getHelpContent('compliance');
      
      expect(content.title).toBe('Compliance Management Help');
      expect(content.sections.length).toBeGreaterThan(0);
    });

    it('should return assembly help content', () => {
      const content = getHelpContent('assembly');
      
      expect(content.title).toBe('Data Assembly Help');
      expect(content.sections.length).toBeGreaterThan(0);
    });

    it('should return environments help content', () => {
      const content = getHelpContent('environments');
      
      expect(content.title).toBe('Environment Management Help');
      expect(content.sections.length).toBeGreaterThan(0);
    });
  });

  describe('help content structure', () => {
    it('should have valid structure for all help content', () => {
      Object.keys(helpContent).forEach((key) => {
        const content = helpContent[key as keyof typeof helpContent];
        
        // Check required properties
        expect(content).toHaveProperty('title');
        expect(content).toHaveProperty('sections');
        expect(Array.isArray(content.sections)).toBe(true);
        expect(content.sections.length).toBeGreaterThan(0);
        
        // Check each section
        content.sections.forEach((section) => {
          expect(section).toHaveProperty('heading');
          expect(section).toHaveProperty('content');
          expect(typeof section.heading).toBe('string');
          expect(typeof section.content).toBe('string');
          expect(section.heading.length).toBeGreaterThan(0);
          expect(section.content.length).toBeGreaterThan(0);
          
          // Optional properties should be arrays if present
          if (section.tips) {
            expect(Array.isArray(section.tips)).toBe(true);
            section.tips.forEach((tip) => {
              expect(typeof tip).toBe('string');
              expect(tip.length).toBeGreaterThan(0);
            });
          }
          
          if (section.warnings) {
            expect(Array.isArray(section.warnings)).toBe(true);
            section.warnings.forEach((warning) => {
              expect(typeof warning).toBe('string');
              expect(warning.length).toBeGreaterThan(0);
            });
          }
          
          if (section.steps) {
            expect(Array.isArray(section.steps)).toBe(true);
            section.steps.forEach((step) => {
              expect(typeof step).toBe('string');
              expect(step.length).toBeGreaterThan(0);
            });
          }
        });
      });
    });

    it('should have helpful tips for complex pages', () => {
      // Discovery page should have tips
      const discoveryContent = getHelpContent('discovery');
      const hasTips = discoveryContent.sections.some(section => section.tips && section.tips.length > 0);
      expect(hasTips).toBe(true);
      
      // Redaction page should have tips
      const redactionContent = getHelpContent('redaction');
      const hasRedactionTips = redactionContent.sections.some(section => section.tips && section.tips.length > 0);
      expect(hasRedactionTips).toBe(true);
    });

    it('should have warnings for critical features', () => {
      // Compliance page should have warnings
      const complianceContent = getHelpContent('compliance');
      const hasWarnings = complianceContent.sections.some(section => section.warnings && section.warnings.length > 0);
      expect(hasWarnings).toBe(true);
      
      // Synthetic data should have warnings
      const syntheticContent = getHelpContent('synthetic');
      const hasSyntheticWarnings = syntheticContent.sections.some(section => section.warnings && section.warnings.length > 0);
      expect(hasSyntheticWarnings).toBe(true);
    });

    it('should have step-by-step instructions for complex workflows', () => {
      // Discovery page should have steps
      const discoveryContent = getHelpContent('discovery');
      const hasSteps = discoveryContent.sections.some(section => section.steps && section.steps.length > 0);
      expect(hasSteps).toBe(true);
      
      // Dashboard should have steps
      const dashboardContent = getHelpContent('dashboard');
      const hasDashboardSteps = dashboardContent.sections.some(section => section.steps && section.steps.length > 0);
      expect(hasDashboardSteps).toBe(true);
    });
  });

  describe('content quality', () => {
    it('should have meaningful content lengths', () => {
      Object.keys(helpContent).forEach((key) => {
        const content = helpContent[key as keyof typeof helpContent];
        
        // Title should be reasonable length
        expect(content.title.length).toBeGreaterThan(5);
        expect(content.title.length).toBeLessThan(100);
        
        content.sections.forEach((section) => {
          // Headings should be reasonable length
          expect(section.heading.length).toBeGreaterThan(3);
          expect(section.heading.length).toBeLessThan(50);
          
          // Content should be substantial
          expect(section.content.length).toBeGreaterThan(20);
        });
      });
    });

    it('should not have placeholder content', () => {
      Object.keys(helpContent).forEach((key) => {
        const content = helpContent[key as keyof typeof helpContent];
        
        // Check for common placeholder text
        expect(content.title.toLowerCase()).not.toContain('lorem');
        expect(content.title.toLowerCase()).not.toContain('placeholder');
        expect(content.title.toLowerCase()).not.toContain('todo');
        
        content.sections.forEach((section) => {
          expect(section.heading.toLowerCase()).not.toContain('lorem');
          expect(section.content.toLowerCase()).not.toContain('lorem');
          expect(section.content.toLowerCase()).not.toContain('placeholder');
          expect(section.content.toLowerCase()).not.toContain('todo');
        });
      });
    });
  });
});