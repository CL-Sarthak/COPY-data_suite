import { Readable, Transform, pipeline } from 'stream';
import { promisify } from 'util';
import crypto from 'crypto';
import { logger } from '@/utils/logger';
import { getDatabase } from '@/database/connection';
import { UploadSessionEntity } from '@/entities/UploadSessionEntity';
import { StorageService } from '@/services/storage/storageService';

const pipelineAsync = promisify(pipeline);

export interface ChunkMetadata {
  chunkIndex: number;
  chunkSize: number;
  totalChunks: number;
  checksum: string;
  uploadId: string;
}

export interface UploadSession {
  uploadId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  startTime: Date;
  lastActivity: Date;
  status: 'active' | 'paused' | 'completed' | 'failed';
  storageKey?: string;
  metadata?: Record<string, unknown>;
}

export class StreamingUploadService {
  private static instance: StreamingUploadService;
  private readonly DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  // In-memory cache for active sessions to reduce DB queries
  private sessionCache: Map<string, { session: UploadSession; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Clean up expired sessions periodically
    setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000); // Every hour
  }

  static getInstance(): StreamingUploadService {
    if (!StreamingUploadService.instance) {
      StreamingUploadService.instance = new StreamingUploadService();
    }
    return StreamingUploadService.instance;
  }

  /**
   * Initialize a new upload session
   */
  async initializeUpload(
    fileName: string,
    fileSize: number,
    mimeType: string,
    metadata?: Record<string, unknown>
  ): Promise<UploadSession> {
    const uploadId = crypto.randomBytes(16).toString('hex');
    const chunkSize = this.calculateOptimalChunkSize(fileSize);
    const totalChunks = Math.ceil(fileSize / chunkSize);

    const session: UploadSession = {
      uploadId,
      fileName,
      fileSize,
      mimeType,
      chunkSize,
      totalChunks,
      uploadedChunks: new Set(),
      startTime: new Date(),
      lastActivity: new Date(),
      status: 'active',
      metadata
    };

    // Save to database
    try {
      const db = await getDatabase();
      const sessionRepo = db.getRepository(UploadSessionEntity);
      
      const sessionEntity = sessionRepo.create({
        uploadId,
        fileName,
        fileSize,
        mimeType,
        chunkSize,
        totalChunks,
        uploadedChunks: [],
        status: 'active',
        metadata,
        startTime: new Date(),
        lastActivity: new Date()
      });
      
      await sessionRepo.save(sessionEntity);
      
      // Cache the session
      this.sessionCache.set(uploadId, { session, timestamp: Date.now() });
      
      logger.info(`Initialized upload session ${uploadId} for file ${fileName} (${fileSize} bytes, ${totalChunks} chunks)`);
    } catch (error) {
      logger.error('Failed to save upload session to database:', error);
      throw new Error('Failed to initialize upload session');
    }

    return session;
  }

  /**
   * Process a chunk upload
   */
  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkData: Buffer,
    checksum: string
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.getSession(uploadId);
    if (!session) {
      logger.error(`Upload session not found: ${uploadId}`);
      return { success: false, message: 'Upload session not found' };
    }

    if (session.status !== 'active') {
      return { success: false, message: `Upload session is ${session.status}` };
    }

    // Verify checksum (using SHA-256 to match client)
    const calculatedChecksum = crypto
      .createHash('sha256')
      .update(chunkData)
      .digest('hex');

    if (calculatedChecksum !== checksum) {
      return { success: false, message: 'Checksum mismatch' };
    }

    // Verify chunk index
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      return { success: false, message: 'Invalid chunk index' };
    }

    // Store the chunk
    const storageService = StorageService.getInstance();
    const chunkKey = `${uploadId}/chunk_${chunkIndex}`;
    
    try {
      // Store chunk in external storage
      await storageService.uploadFile(chunkKey, chunkData);
      logger.debug(`Stored chunk ${chunkIndex} for upload ${uploadId}`);
    } catch (storageError) {
      logger.error(`Failed to store chunk ${chunkIndex}:`, storageError);
      return { success: false, message: 'Failed to store chunk' };
    }

    // Update session in database
    try {
      const db = await getDatabase();
      const sessionRepo = db.getRepository(UploadSessionEntity);
      
      const sessionEntity = await sessionRepo.findOne({ where: { uploadId } });
      if (!sessionEntity) {
        return { success: false, message: 'Upload session not found in database' };
      }
      
      // Add chunk to uploaded chunks
      const uploadedChunks = sessionEntity.uploadedChunks || [];
      if (!uploadedChunks.includes(chunkIndex)) {
        uploadedChunks.push(chunkIndex);
      }
      
      sessionEntity.uploadedChunks = uploadedChunks;
      sessionEntity.lastActivity = new Date();
      
      // Check if upload is complete
      if (uploadedChunks.length === sessionEntity.totalChunks) {
        sessionEntity.status = 'completed';
        
        // Combine all chunks into final file
        try {
          const chunks: Buffer[] = [];
          for (let i = 0; i < session.totalChunks; i++) {
            const chunkData = await storageService.getFile(`${uploadId}/chunk_${i}`);
            chunks.push(chunkData);
          }
          
          const completeFile = Buffer.concat(chunks);
          const finalKey = `uploads/${uploadId}/${session.fileName}`;
          
          // Store complete file
          await storageService.uploadFile(finalKey, completeFile);
          sessionEntity.storageKey = finalKey;
          
          // Clean up chunks
          for (let i = 0; i < session.totalChunks; i++) {
            try {
              await storageService.deleteFile(`${uploadId}/chunk_${i}`);
            } catch {
              // Ignore cleanup errors
            }
          }
          
          logger.info(`Upload ${uploadId} completed and assembled successfully`);
        } catch (assemblyError) {
          logger.error(`Failed to assemble chunks for upload ${uploadId}:`, assemblyError);
          sessionEntity.status = 'failed';
        }
      }
      
      await sessionRepo.save(sessionEntity);
      
      // Update cache
      session.uploadedChunks.add(chunkIndex);
      session.lastActivity = new Date();
      if (uploadedChunks.length === sessionEntity.totalChunks) {
        session.status = 'completed';
        session.storageKey = sessionEntity.storageKey;
      }
      this.sessionCache.set(uploadId, { session, timestamp: Date.now() });
      
      logger.debug(`Uploaded chunk ${chunkIndex + 1}/${session.totalChunks} for upload ${uploadId}`);
      
      return { success: true, message: 'Chunk uploaded successfully' };
    } catch (error) {
      logger.error('Failed to update upload session:', error);
      return { success: false, message: 'Failed to update upload session' };
    }
  }

  /**
   * Get upload progress
   */
  async getUploadProgress(uploadId: string): Promise<{
    uploadedChunks: number;
    totalChunks: number;
    percentage: number;
    status: string;
  } | null> {
    const session = await this.getSession(uploadId);
    if (!session) {
      return null;
    }

    const uploadedChunks = session.uploadedChunks.size;
    const percentage = Math.round((uploadedChunks / session.totalChunks) * 100);

    return {
      uploadedChunks,
      totalChunks: session.totalChunks,
      percentage,
      status: session.status
    };
  }

  /**
   * Pause an upload session
   */
  async pauseUpload(uploadId: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      const sessionRepo = db.getRepository(UploadSessionEntity);
      
      const sessionEntity = await sessionRepo.findOne({ where: { uploadId } });
      if (!sessionEntity || sessionEntity.status !== 'active') {
        return false;
      }
      
      sessionEntity.status = 'paused';
      sessionEntity.lastActivity = new Date();
      await sessionRepo.save(sessionEntity);
      
      // Update cache
      const cached = this.sessionCache.get(uploadId);
      if (cached) {
        cached.session.status = 'paused';
        cached.session.lastActivity = new Date();
        cached.timestamp = Date.now();
      }
      
      logger.info(`Upload ${uploadId} paused`);
      return true;
    } catch (error) {
      logger.error('Failed to pause upload:', error);
      return false;
    }
  }

  /**
   * Resume an upload session
   */
  async resumeUpload(uploadId: string): Promise<UploadSession | null> {
    try {
      const db = await getDatabase();
      const sessionRepo = db.getRepository(UploadSessionEntity);
      
      const sessionEntity = await sessionRepo.findOne({ where: { uploadId } });
      if (!sessionEntity || sessionEntity.status === 'completed') {
        return null;
      }
      
      sessionEntity.status = 'active';
      sessionEntity.lastActivity = new Date();
      await sessionRepo.save(sessionEntity);
      
      const session = await this.getSession(uploadId);
      if (session) {
        session.status = 'active';
        session.lastActivity = new Date();
        this.sessionCache.set(uploadId, { session, timestamp: Date.now() });
      }
      
      logger.info(`Upload ${uploadId} resumed`);
      return session;
    } catch (error) {
      logger.error('Failed to resume upload:', error);
      return null;
    }
  }

  /**
   * Get missing chunks for resumption
   */
  async getMissingChunks(uploadId: string): Promise<number[]> {
    const session = await this.getSession(uploadId);
    if (!session) {
      return [];
    }

    const missingChunks: number[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.uploadedChunks.has(i)) {
        missingChunks.push(i);
      }
    }

    return missingChunks;
  }

  /**
   * Create a transform stream for processing data
   */
  createProcessingStream(
    transformFn: (chunk: Buffer) => Buffer | Promise<Buffer>
  ): Transform {
    return new Transform({
      async transform(chunk: Buffer, encoding, callback) {
        try {
          const transformed = await transformFn(chunk);
          callback(null, transformed);
        } catch (error) {
          callback(error as Error);
        }
      }
    });
  }

  /**
   * Stream data with backpressure handling
   */
  async streamWithBackpressure(
    source: Readable,
    destination: NodeJS.WritableStream,
    onProgress?: (bytes: number) => void
  ): Promise<void> {
    let totalBytes = 0;

    const progressStream = new Transform({
      transform(chunk: Buffer, encoding, callback) {
        totalBytes += chunk.length;
        if (onProgress) {
          onProgress(totalBytes);
        }
        callback(null, chunk);
      }
    });

    await pipelineAsync(source, progressStream, destination);
  }

  /**
   * Calculate optimal chunk size based on file size
   */
  private calculateOptimalChunkSize(fileSize: number): number {
    // Production has a 4MB limit per chunk
    const maxChunkSize = 4 * 1024 * 1024; // 4MB max for production compatibility
    
    if (fileSize < 10 * 1024 * 1024) { // < 10MB
      return 1024 * 1024; // 1MB chunks
    } else if (fileSize < 50 * 1024 * 1024) { // < 50MB
      return 2 * 1024 * 1024; // 2MB chunks
    } else {
      return maxChunkSize; // 4MB chunks for all larger files
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const db = await getDatabase();
      const sessionRepo = db.getRepository(UploadSessionEntity);
      
      const cutoffDate = new Date(Date.now() - this.SESSION_TIMEOUT);
      
      // Delete expired sessions from database
      await sessionRepo
        .createQueryBuilder()
        .delete()
        .where('status != :status', { status: 'completed' })
        .andWhere('lastActivity < :cutoffDate', { cutoffDate })
        .execute();
      
      // Clean up cache
      const now = Date.now();
      for (const [uploadId, cached] of this.sessionCache) {
        if (now - cached.timestamp > this.CACHE_TTL) {
          this.sessionCache.delete(uploadId);
        }
      }
      
      logger.info('Cleaned up expired upload sessions');
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Get session info
   */
  async getSession(uploadId: string): Promise<UploadSession | null> {
    // Check cache first
    const cached = this.sessionCache.get(uploadId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      // In production, always check DB for status updates
      if (process.env.NODE_ENV === 'production' && cached.session.status !== 'completed') {
        // Continue to load from DB
      } else {
        return cached.session;
      }
    }
    
    // Load from database
    try {
      const db = await getDatabase();
      const sessionRepo = db.getRepository(UploadSessionEntity);
      
      const sessionEntity = await sessionRepo.findOne({ where: { uploadId } });
      if (!sessionEntity) {
        logger.debug(`Session ${uploadId} not found in database`);
        return null;
      }
      
      // Convert to UploadSession object
      const session: UploadSession = {
        uploadId: sessionEntity.uploadId,
        fileName: sessionEntity.fileName,
        fileSize: Number(sessionEntity.fileSize),
        mimeType: sessionEntity.mimeType,
        chunkSize: sessionEntity.chunkSize,
        totalChunks: sessionEntity.totalChunks,
        uploadedChunks: new Set(sessionEntity.uploadedChunks || []),
        startTime: sessionEntity.startTime,
        lastActivity: sessionEntity.lastActivity,
        status: sessionEntity.status,
        storageKey: sessionEntity.storageKey,
        metadata: sessionEntity.metadata
      };
      
      // Update cache
      this.sessionCache.set(uploadId, { session, timestamp: Date.now() });
      
      return session;
    } catch (error) {
      logger.error('Failed to get upload session from database:', error);
      return null;
    }
  }
}