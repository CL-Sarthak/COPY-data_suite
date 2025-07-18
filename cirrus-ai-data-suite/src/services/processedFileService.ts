export interface ProcessedFileData {
  id?: string;
  fileName: string;
  originalContent: string;
  redactedContent: string;
  redactionCount: number;
  fileType: string;
  fileSize: number;
  sessionId: string;
  createdAt?: Date;
}

export class ProcessedFileService {
  private static baseUrl = '/api/processed-files';

  static async saveProcessedFile(data: Omit<ProcessedFileData, 'id' | 'createdAt'>): Promise<ProcessedFileData> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save processed file');
    }
    return response.json();
  }

  static async getProcessedFiles(sessionId?: string): Promise<ProcessedFileData[]> {
    const url = sessionId ? `${this.baseUrl}?sessionId=${sessionId}` : this.baseUrl;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch processed files');
    }
    return response.json();
  }
}