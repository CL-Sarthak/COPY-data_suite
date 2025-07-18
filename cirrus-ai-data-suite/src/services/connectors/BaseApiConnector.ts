import { 
  IApiConnector, 
  ApiConnection, 
  ApiQueryResult, 
  ApiTestResult,
  FetchParams,
  ApiConnectorOptions,
  PaginationConfig 
} from '@/types/apiConnector';
import { logger } from '@/utils/logger';
import { fetchWithRetry } from '@/utils/retryUtils';

export abstract class BaseApiConnector implements IApiConnector {
  protected connection: ApiConnection;
  protected options: ApiConnectorOptions;
  protected isConnected: boolean = false;
  protected rateLimitTracker: { count: number; resetTime: number } = { count: 0, resetTime: 0 };

  constructor(connection: ApiConnection, options: ApiConnectorOptions = {}) {
    this.connection = connection;
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      rateLimitPerMinute: connection.rateLimit || 60,
      userAgent: 'Cirrus Data Suite API Connector/1.0',
      ...options
    };
  }

  async connect(): Promise<void> {
    // Most APIs don't need explicit connection
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<ApiTestResult> {
    try {
      const startTime = Date.now();
      const response = await this.makeRequest({});
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          message: `API returned status ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          responseTime,
          error: await this.extractErrorMessage(response)
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Connection successful',
        statusCode: response.status,
        responseTime,
        sampleData: this.extractSampleData(data)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`API connection test failed:`, error);
      return {
        success: false,
        message: `Connection failed: ${message}`,
        error: message
      };
    }
  }

  async fetchData(params: FetchParams = {}): Promise<ApiQueryResult> {
    await this.checkRateLimit();
    
    try {
      const response = await this.makeRequest(params);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      logger.error('API fetch error:', error);
      throw error;
    }
  }

  async fetchAllData(params: FetchParams = {}): Promise<unknown[]> {
    const allData: unknown[] = [];
    let hasMore = true;
    let currentParams = { ...params };
    
    while (hasMore) {
      const result = await this.fetchData(currentParams);
      allData.push(...result.data);
      
      hasMore = result.hasMore || false;
      
      if (hasMore) {
        // Update params for next page based on pagination type
        currentParams = this.getNextPageParams(currentParams, result);
      }
    }
    
    return allData;
  }

  protected async makeRequest(params: FetchParams): Promise<Response> {
    const url = this.buildUrl(params);
    const headers = this.buildHeaders(params);
    const body = this.buildRequestBody(params);
    const timeout = params.timeout ?? this.connection.timeout ?? this.options.timeout;

    const requestOptions: RequestInit = {
      method: this.connection.method,
      headers,
      ...(body && { body }),
      ...(timeout && { signal: AbortSignal.timeout(timeout) })
    };

    return fetchWithRetry(url, requestOptions, {
      maxRetries: params.maxRetries ?? this.options.maxRetries,
      initialDelay: this.options.retryDelay
    });
  }

  protected buildUrl(params: FetchParams): string {
    const url = new URL(this.connection.endpoint);
    
    // Add query parameters
    if (params.queryParams) {
      Object.entries(params.queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    // Add pagination parameters
    this.addPaginationParams(url, params);
    
    return url.toString();
  }

  protected buildHeaders(params: FetchParams): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.options.userAgent!,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...this.connection.headers,
      ...params.headers
    };

    // Add authentication headers
    this.addAuthHeaders(headers);
    
    return headers;
  }

  protected buildRequestBody(params: FetchParams): string | undefined {
    if (this.connection.method === 'GET' || this.connection.method === 'DELETE') {
      return undefined;
    }

    const body = params.body ?? this.connection.requestBody;
    return body ? JSON.stringify(body) : undefined;
  }

  protected addAuthHeaders(headers: Record<string, string>): void {
    const { authType, authConfig } = this.connection;
    
    if (!authConfig) return;
    
    switch (authType) {
      case 'api-key':
        if (authConfig.apiKey) {
          const headerName = authConfig.apiKeyHeader || 'X-API-Key';
          headers[headerName] = authConfig.apiKey;
        }
        break;
        
      case 'bearer':
        if (authConfig.bearerToken) {
          headers['Authorization'] = `Bearer ${authConfig.bearerToken}`;
        }
        break;
        
      case 'basic':
        if (authConfig.username && authConfig.password) {
          const encoded = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
        }
        break;
        
      case 'oauth2':
        if (authConfig.accessToken) {
          headers['Authorization'] = `Bearer ${authConfig.accessToken}`;
        }
        break;
    }
  }

  protected addPaginationParams(url: URL, params: FetchParams): void {
    const paginationConfig = this.connection.paginationConfig;
    if (!paginationConfig || paginationConfig.type === 'none') return;
    
    switch (paginationConfig.type) {
      case 'offset':
        if (params.offset !== undefined && paginationConfig.offsetParam) {
          url.searchParams.set(paginationConfig.offsetParam, String(params.offset));
        }
        if (params.limit !== undefined && paginationConfig.limitParam) {
          url.searchParams.set(paginationConfig.limitParam, String(params.limit));
        }
        break;
        
      case 'page':
        if (params.page !== undefined && paginationConfig.pageParam) {
          url.searchParams.set(paginationConfig.pageParam, String(params.page));
        }
        if (params.limit !== undefined && paginationConfig.pageSizeParam) {
          url.searchParams.set(paginationConfig.pageSizeParam, String(params.limit));
        }
        break;
        
      case 'cursor':
        if (params.cursor && paginationConfig.cursorParam) {
          url.searchParams.set(paginationConfig.cursorParam, params.cursor);
        }
        break;
    }
  }

  protected parseResponse(data: unknown): ApiQueryResult {
    const responseMapping = this.connection.responseMapping;
    const paginationConfig = this.connection.paginationConfig;
    
    // Extract data array
    const records = this.extractData(data, responseMapping?.dataPath || responseMapping?.recordsPath);
    
    // Extract pagination info
    const pagination = this.extractPaginationInfo(data, paginationConfig);
    
    return {
      data: Array.isArray(records) ? records : [],
      ...pagination
    };
  }

  protected extractData(response: unknown, path?: string): unknown {
    if (!path) return response;
    
    return path.split('.').reduce((acc: unknown, key) => {
      return (acc as Record<string, unknown>)?.[key];
    }, response);
  }

  protected extractPaginationInfo(
    response: unknown, 
    config?: PaginationConfig
  ): Partial<ApiQueryResult> {
    if (!config) return {};
    
    const result: Partial<ApiQueryResult> = {};
    
    if (config.totalPath) {
      const total = this.extractData(response, config.totalPath);
      if (typeof total === 'number') {
        result.totalCount = total;
      }
    }
    
    if (config.hasMorePath) {
      const hasMore = this.extractData(response, config.hasMorePath);
      result.hasMore = Boolean(hasMore);
    }
    
    if (config.cursorPath) {
      const cursor = this.extractData(response, config.cursorPath);
      if (cursor) {
        result.nextCursor = String(cursor);
      }
    }
    
    return result;
  }

  protected getNextPageParams(currentParams: FetchParams, result: ApiQueryResult): FetchParams {
    const paginationConfig = this.connection.paginationConfig;
    if (!paginationConfig) return currentParams;
    
    const newParams = { ...currentParams };
    
    switch (paginationConfig.type) {
      case 'offset':
        const currentOffset = currentParams.offset || 0;
        const limit = currentParams.limit || paginationConfig.defaultLimit || 100;
        newParams.offset = currentOffset + limit;
        break;
        
      case 'page':
        const currentPage = currentParams.page || paginationConfig.startPage || 1;
        newParams.page = currentPage + 1;
        break;
        
      case 'cursor':
        if (result.nextCursor) {
          newParams.cursor = result.nextCursor;
        }
        break;
    }
    
    return newParams;
  }

  protected async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    if (this.rateLimitTracker.resetTime < windowStart) {
      this.rateLimitTracker = { count: 0, resetTime: now };
    }
    
    if (this.rateLimitTracker.count >= this.options.rateLimitPerMinute!) {
      const waitTime = 60000 - (now - this.rateLimitTracker.resetTime);
      logger.warn(`Rate limit reached. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimitTracker = { count: 0, resetTime: Date.now() };
    }
    
    this.rateLimitTracker.count++;
  }

  protected extractSampleData(data: unknown): unknown {
    // Extract a small sample for test results
    if (Array.isArray(data)) {
      return data.slice(0, 3);
    }
    
    const records = this.extractData(data, this.connection.responseMapping?.dataPath);
    if (Array.isArray(records)) {
      return records.slice(0, 3);
    }
    
    return data;
  }

  protected async extractErrorMessage(response: Response): Promise<string> {
    try {
      const data = await response.json();
      const errorPath = this.connection.responseMapping?.errorPath;
      if (errorPath) {
        const error = this.extractData(data, errorPath);
        if (error) return String(error);
      }
      return JSON.stringify(data);
    } catch {
      return response.statusText;
    }
  }
}