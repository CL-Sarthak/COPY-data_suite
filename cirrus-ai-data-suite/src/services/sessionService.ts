import { SensitivePattern, FileData } from '@/types';

export interface SessionData {
  id?: string;
  name: string;
  description?: string;
  patterns: SensitivePattern[];
  trainingFiles?: FileData[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class SessionService {
  private static baseUrl = '/api/sessions';

  static async getSessions(): Promise<SessionData[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    return response.json();
  }

  static async getSession(id: string): Promise<SessionData> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch session');
    }
    return response.json();
  }

  static async createSession(data: Omit<SessionData, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionData> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    return response.json();
  }

  static async updateSession(id: string, data: Partial<SessionData>): Promise<SessionData> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update session');
    }
    return response.json();
  }

  static async deleteSession(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
  }

  static async savePatterns(sessionId: string, patterns: SensitivePattern[]): Promise<SessionData> {
    return this.updateSession(sessionId, { patterns });
  }

  static async saveTrainingFiles(sessionId: string, trainingFiles: FileData[]): Promise<SessionData> {
    return this.updateSession(sessionId, { trainingFiles });
  }
}