import { ApiConnection, IApiConnector } from '@/types/apiConnector';
import { RestApiConnector } from './RestApiConnector';
// Import other API connector types as they are implemented
// import { GraphQLConnector } from './GraphQLConnector';
// import { SOAPConnector } from './SOAPConnector';

export type ApiType = 'rest' | 'graphql' | 'soap' | 'webhook';

export function createApiConnector(connection: ApiConnection, apiType: ApiType = 'rest'): IApiConnector {
  switch (apiType) {
    case 'rest':
      return new RestApiConnector(connection);
    
    case 'graphql':
      throw new Error('GraphQL connector not yet implemented');
    
    case 'soap':
      throw new Error('SOAP connector not yet implemented');
    
    case 'webhook':
      throw new Error('Webhook connector not yet implemented');
    
    default:
      throw new Error(`Unsupported API type: ${apiType}`);
  }
}

export function getSupportedApiTypes(): ApiType[] {
  return ['rest']; // Add more as they are implemented
}

export function isApiTypeSupported(type: ApiType): boolean {
  return getSupportedApiTypes().includes(type);
}