import { ClusterPatternService } from '@/services/clusterPatternService';

describe('ClusterPatternService', () => {
  describe('flattenRelationalData', () => {
    it('should flatten simple objects', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      
      const result = ClusterPatternService.flattenRelationalData(data);
      
      expect(result).toContainEqual({ fieldName: 'name', value: 'John' });
      expect(result).toContainEqual({ fieldName: 'age', value: '30' });
      expect(result).toContainEqual({ fieldName: 'name', value: 'Jane' });
      expect(result).toContainEqual({ fieldName: 'age', value: '25' });
    });

    it('should flatten nested objects', () => {
      const data = [{
        customer: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        address: {
          street: '123 Main St',
          city: 'Boston'
        }
      }];
      
      const result = ClusterPatternService.flattenRelationalData(data);
      
      expect(result).toContainEqual({ fieldName: 'customer.name', value: 'John Doe' });
      expect(result).toContainEqual({ fieldName: 'customer.email', value: 'john@example.com' });
      expect(result).toContainEqual({ fieldName: 'address.street', value: '123 Main St' });
      expect(result).toContainEqual({ fieldName: 'address.city', value: 'Boston' });
    });

    it('should flatten arrays', () => {
      const data = [{
        name: 'Order 1',
        items: ['Item A', 'Item B', 'Item C']
      }];
      
      const result = ClusterPatternService.flattenRelationalData(data);
      
      expect(result).toContainEqual({ fieldName: 'name', value: 'Order 1' });
      expect(result).toContainEqual({ fieldName: 'items[0]', value: 'Item A' });
      expect(result).toContainEqual({ fieldName: 'items[1]', value: 'Item B' });
      expect(result).toContainEqual({ fieldName: 'items[2]', value: 'Item C' });
    });

    it('should handle arrays of objects', () => {
      const data = [{
        orders: [
          { id: 1, total: 100 },
          { id: 2, total: 200 }
        ]
      }];
      
      const result = ClusterPatternService.flattenRelationalData(data);
      
      expect(result).toContainEqual({ fieldName: 'orders[0].id', value: '1' });
      expect(result).toContainEqual({ fieldName: 'orders[0].total', value: '100' });
      expect(result).toContainEqual({ fieldName: 'orders[1].id', value: '2' });
      expect(result).toContainEqual({ fieldName: 'orders[1].total', value: '200' });
    });

    it('should skip null and undefined values', () => {
      const data = [{
        name: 'John',
        age: null,
        email: undefined,
        phone: ''
      }];
      
      const result = ClusterPatternService.flattenRelationalData(data);
      
      expect(result).toContainEqual({ fieldName: 'name', value: 'John' });
      expect(result).toContainEqual({ fieldName: 'phone', value: '' });
      expect(result).not.toContainEqual(expect.objectContaining({ fieldName: 'age' }));
      expect(result).not.toContainEqual(expect.objectContaining({ fieldName: 'email' }));
    });
  });

  describe('detectClusters', () => {
    it('should detect personal identity cluster in flattened data', () => {
      // Test data with various field name formats that should map to the same base fields
      const flattenedData = [
        { fieldName: 'customer.fullName', value: 'John Doe' },
        { fieldName: 'customer.email_address', value: 'john@example.com' },
        { fieldName: 'customer.phoneNumber', value: '555-1234' },
        { fieldName: 'address.street', value: '123 Main St' }
      ];
      
      const result = ClusterPatternService.detectClusters(flattenedData);
      
      expect(result.length).toBeGreaterThanOrEqual(1);
      const personalCluster = result.find(c => c.name === 'Personal Identity Information');
      expect(personalCluster).toBeDefined();
      // The fields will contain the original field names
      expect(personalCluster!.fields).toContain('customer.fullName');
      expect(personalCluster!.fields).toContain('customer.email_address');
      expect(personalCluster!.fields).toContain('customer.phoneNumber');
      expect(personalCluster!.confidence).toBeGreaterThan(0.5);
    });

    it('should detect complete address cluster', () => {
      // Use field names that will match the alternate names for address fields
      const flattenedData = [
        { fieldName: 'billing.street_address', value: '123 Main St' },
        { fieldName: 'billing.city', value: 'Boston' },
        { fieldName: 'billing.state', value: 'MA' },
        { fieldName: 'billing.postal_code', value: '02101' }
      ];
      
      const result = ClusterPatternService.detectClusters(flattenedData);
      
      expect(result.length).toBeGreaterThanOrEqual(1);
      const addressCluster = result.find(c => c.name === 'Complete Address');
      expect(addressCluster).toBeDefined();
      expect(addressCluster!.fields.length).toBe(4);
    });

    it('should detect payment card cluster', () => {
      // Use field names that match the payment card alternate names
      const flattenedData = [
        { fieldName: 'payment.credit_card', value: '4111111111111111' },
        { fieldName: 'payment.name_on_card', value: 'John Doe' },
        { fieldName: 'payment.exp_date', value: '12/25' },
        { fieldName: 'payment.security_code', value: '123' }
      ];
      
      const result = ClusterPatternService.detectClusters(flattenedData);
      
      expect(result.length).toBeGreaterThanOrEqual(1);
      const paymentCluster = result.find(c => c.name === 'Payment Card Information');
      expect(paymentCluster).toBeDefined();
      expect(paymentCluster!.confidence).toBeGreaterThan(0.8);
    });

    it('should handle data with array indices', () => {
      const flattenedData = [
        { fieldName: 'orders[0].customer.fullName', value: 'John Doe' },
        { fieldName: 'orders[0].customer.emailAddress', value: 'john@example.com' },
        { fieldName: 'orders[1].customer.fullName', value: 'Jane Smith' },
        { fieldName: 'orders[1].customer.emailAddress', value: 'jane@example.com' }
      ];
      
      const result = ClusterPatternService.detectClusters(flattenedData);
      
      // The detection should work as it extracts base names
      expect(result.length).toBeGreaterThanOrEqual(1);
      const personalCluster = result.find(c => c.name === 'Personal Identity Information');
      expect(personalCluster).toBeDefined();
      // Check that all original field names are preserved
      expect(personalCluster!.fields).toContain('orders[0].customer.fullName');
      expect(personalCluster!.fields).toContain('orders[0].customer.emailAddress');
      expect(personalCluster!.fields).toContain('orders[1].customer.fullName');
      expect(personalCluster!.fields).toContain('orders[1].customer.emailAddress');
    });

    it('should not detect clusters with missing required fields', () => {
      const flattenedData = [
        { fieldName: 'contact.email', value: 'john@example.com' },
        { fieldName: 'contact.phone', value: '555-1234' }
        // Missing name/fullName, which is required for personal identity cluster
      ];
      
      const result = ClusterPatternService.detectClusters(flattenedData);
      
      const personalCluster = result.find(c => c.name === 'Personal Identity Information');
      expect(personalCluster).toBeUndefined();
    });
  });

  describe('detectClustersLegacy', () => {
    it('should detect clusters in a flat object', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St'
      };
      
      const result = ClusterPatternService.detectClustersLegacy(data);
      
      expect(result.length).toBeGreaterThanOrEqual(1);
      const personalCluster = result.find(c => c.clusterName === 'Personal Identity Information');
      expect(personalCluster).toBeDefined();
      expect(personalCluster!.detectedFields).toHaveLength(4);
    });
  });

  describe('createClusterFromRelationships', () => {
    it('should create a custom cluster pattern', () => {
      const relatedFields = [
        { fieldName: 'email', pattern: 'Email' },
        { fieldName: 'phone', pattern: 'Phone' }
      ];
      
      const cluster = ClusterPatternService.createClusterFromRelationships(
        'customerName',
        relatedFields,
        'Customer Contact Info',
        'CUSTOM'
      );
      
      expect(cluster.name).toBe('Customer Contact Info');
      expect(cluster.category).toBe('CUSTOM');
      expect(cluster.fields).toHaveLength(3);
      expect(cluster.fields[0].fieldName).toBe('customerName');
      expect(cluster.fields[0].required).toBe(true);
      expect(cluster.fields[1].fieldName).toBe('email');
      expect(cluster.fields[1].required).toBe(false);
    });
  });

  describe('clustersToPatterns', () => {
    it('should convert detected clusters to sensitive patterns', () => {
      const clusters = ClusterPatternService.detectClustersLegacy({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234'
      });
      
      const patterns = ClusterPatternService.clustersToPatterns(clusters);
      
      expect(patterns.length).toBeGreaterThanOrEqual(1);
      const pattern = patterns[0];
      expect(pattern.label).toBe('Personal Identity Information');
      expect(pattern.type).toBe('PII');
      expect(pattern.color).toBe('bg-red-100 text-red-800');
      expect(pattern.examples).toContain('John Doe');
      expect(pattern.examples).toContain('john@example.com');
      expect(pattern.examples).toContain('555-1234');
      expect((pattern as any).isCluster).toBe(true);
      expect((pattern as any).clusterFields).toContain('name');
      expect((pattern as any).clusterFields).toContain('email');
      expect((pattern as any).clusterFields).toContain('phone');
    });
  });
});