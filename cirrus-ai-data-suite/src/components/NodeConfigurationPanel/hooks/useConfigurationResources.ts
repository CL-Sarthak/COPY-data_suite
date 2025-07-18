import { useState, useEffect } from 'react';
import { ConfigurationResources } from '../types/configuration.types';

const SYNTHETIC_TEMPLATES = {
  customer_records: {
    id: { type: 'uuid' },
    firstName: { type: 'firstName' },
    lastName: { type: 'lastName' },
    email: { type: 'email' },
    phone: { type: 'phoneNumber' },
    address: { type: 'streetAddress' },
    city: { type: 'city' },
    state: { type: 'state' },
    zipCode: { type: 'zipCode' },
    creditCard: { type: 'creditCardNumber' },
    ssn: { type: 'ssn' }
  },
  medical_records: {
    patientId: { type: 'uuid' },
    firstName: { type: 'firstName' },
    lastName: { type: 'lastName' },
    dateOfBirth: { type: 'dateOfBirth' },
    ssn: { type: 'ssn' },
    diagnosis: { type: 'medicalDiagnosis' },
    medication: { type: 'medication' },
    provider: { type: 'doctorName' },
    insuranceId: { type: 'insuranceNumber' }
  },
  financial_transactions: {
    transactionId: { type: 'uuid' },
    accountNumber: { type: 'bankAccount' },
    amount: { type: 'money' },
    date: { type: 'recentDate' },
    description: { type: 'transactionDescription' },
    merchantName: { type: 'companyName' },
    category: { type: 'transactionCategory' }
  }
};

export function useConfigurationResources() {
  const [resources, setResources] = useState<ConfigurationResources>({
    dataSources: [],
    patterns: [],
    syntheticTemplates: SYNTHETIC_TEMPLATES,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      setResources(prev => ({ ...prev, isLoading: true, error: null }));

      const [dataSourcesRes, patternsRes] = await Promise.all([
        fetch('/api/data-sources'),
        fetch('/api/patterns')
      ]);

      if (!dataSourcesRes.ok || !patternsRes.ok) {
        throw new Error('Failed to fetch resources');
      }

      const dataSources = await dataSourcesRes.json();
      const patterns = await patternsRes.json();

      setResources({
        dataSources,
        patterns,
        syntheticTemplates: SYNTHETIC_TEMPLATES,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to load configuration resources:', error);
      setResources(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load configuration resources. Please try again.'
      }));
    }
  };

  const retry = () => {
    loadResources();
  };

  return {
    resources,
    retry
  };
}