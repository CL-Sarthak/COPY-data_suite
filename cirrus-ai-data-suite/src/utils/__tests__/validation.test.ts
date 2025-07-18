// Test utility functions and validation logic
describe('Validation Utilities', () => {
  describe('Email validation', () => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name+tag@domain.co.uk',
        'admin@subdomain.example.org',
      ];
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });
    
    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test.example.com',
        'test@.com',
      ];
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('Phone number validation', () => {
    const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
    
    it('should validate correct phone numbers', () => {
      const validPhones = [
        '123-456-7890',
        '555-123-4567',
        '999-888-7777',
      ];
      
      validPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(true);
      });
    });
    
    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '1234567890',
        '123-45-6789',
        'abc-def-ghij',
        '123-456-789',
      ];
      
      invalidPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(false);
      });
    });
  });

  describe('SSN validation', () => {
    const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
    
    it('should validate correct SSN format', () => {
      const validSSNs = [
        '123-45-6789',
        '555-12-3456',
        '999-88-7777',
      ];
      
      validSSNs.forEach(ssn => {
        expect(ssnRegex.test(ssn)).toBe(true);
      });
    });
    
    it('should reject invalid SSN format', () => {
      const invalidSSNs = [
        '123456789',
        '123-456-789',
        'abc-de-fghi',
        '1234-56-789',
      ];
      
      invalidSSNs.forEach(ssn => {
        expect(ssnRegex.test(ssn)).toBe(false);
      });
    });
  });
});