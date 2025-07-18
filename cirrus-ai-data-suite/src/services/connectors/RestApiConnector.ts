import { BaseApiConnector } from './BaseApiConnector';
import { ApiConnection, ApiConnectorOptions } from '@/types/apiConnector';
import { logger } from '@/utils/logger';

export class RestApiConnector extends BaseApiConnector {
  constructor(connection: ApiConnection, options?: ApiConnectorOptions) {
    super(connection, options);
    logger.info(`Initializing REST API connector for ${connection.name}`);
  }

  // REST API specific implementations can be added here
  // The base class handles most common REST API patterns
  
  // Override methods if needed for specific REST API behaviors
}