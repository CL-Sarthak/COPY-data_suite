import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
// import type { Relation } from 'typeorm'; // Not needed with lazy loading
import { RemediationActionEntity } from './RemediationActionEntity';
import type { RemediationActionStatus } from '@/types/remediation';
// Using lazy import to avoid circular dependency

export type RemediationEventType = 
  | 'created' | 'started' | 'completed' | 'failed' | 'paused' | 'resumed' | 'cancelled' 
  | 'reviewed' | 'approved' | 'rejected' | 'rolled_back' | 'retried' | 'skipped';

@Entity('remediation_history')
@Index(['actionId'])
@Index(['eventType'])
@Index(['createdAt'])
@Index(['performedBy'])
export class RemediationHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'action_id', type: 'uuid' })
  @Index()
  actionId!: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: [
      'created', 'started', 'completed', 'failed', 'paused', 'resumed', 'cancelled',
      'reviewed', 'approved', 'rejected', 'rolled_back', 'retried', 'skipped'
    ]
  })
  eventType!: RemediationEventType;

  @Column({
    name: 'old_status',
    type: 'enum',
    enum: ['pending', 'applied', 'rejected', 'requires_review', 'skipped'],
    nullable: true
  })
  oldStatus?: RemediationActionStatus;

  @Column({
    name: 'new_status',
    type: 'enum',
    enum: ['pending', 'applied', 'rejected', 'requires_review', 'skipped'],
    nullable: true
  })
  newStatus?: RemediationActionStatus;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue?: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue?: string;

  @Column({ name: 'performed_by', type: 'varchar', length: 255 })
  @Index()
  performedBy!: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata!: {
    ipAddress?: string;
    userAgent?: string;
    source?: 'ui' | 'api' | 'system';
    batchId?: string;
    duration?: number; // milliseconds
    errorDetails?: string;
    previousAttempts?: number;
  };

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  // Relations with lazy loading
  @ManyToOne(() => RemediationActionEntity, action => action.history, { onDelete: 'CASCADE', lazy: true })
  @JoinColumn({ name: 'action_id' })
  action?: Promise<RemediationActionEntity>;

  // Helper methods
  isStatusChange(): boolean {
    return this.oldStatus !== this.newStatus && 
           this.oldStatus !== undefined && 
           this.newStatus !== undefined;
  }

  isValueChange(): boolean {
    return this.oldValue !== this.newValue && 
           (this.oldValue !== undefined || this.newValue !== undefined);
  }

  isUserAction(): boolean {
    return ['reviewed', 'approved', 'rejected', 'rolled_back'].includes(this.eventType);
  }

  isSystemAction(): boolean {
    return ['created', 'started', 'completed', 'failed'].includes(this.eventType);
  }

  getActionDescription(): string {
    switch (this.eventType) {
      case 'created':
        return 'Action created';
      case 'started':
        return 'Processing started';
      case 'completed':
        return 'Processing completed successfully';
      case 'failed':
        return 'Processing failed';
      case 'paused':
        return 'Processing paused';
      case 'resumed':
        return 'Processing resumed';
      case 'cancelled':
        return 'Processing cancelled';
      case 'reviewed':
        return 'Action reviewed';
      case 'approved':
        return 'Action approved';
      case 'rejected':
        return 'Action rejected';
      case 'rolled_back':
        return 'Changes rolled back';
      case 'retried':
        return 'Action retried';
      case 'skipped':
        return 'Action skipped';
      default:
        return 'Unknown action';
    }
  }

  getChangeDescription(): string {
    if (this.isStatusChange()) {
      return `Status changed from ${this.oldStatus} to ${this.newStatus}`;
    }
    if (this.isValueChange()) {
      return `Value changed from "${this.oldValue}" to "${this.newValue}"`;
    }
    return this.getActionDescription();
  }

  getDurationMs(): number {
    return this.metadata?.duration || 0;
  }

  getSource(): string {
    return this.metadata?.source || 'unknown';
  }

  getBatchId(): string | undefined {
    return this.metadata?.batchId;
  }

  isBatchOperation(): boolean {
    return !!this.metadata?.batchId;
  }

  hasError(): boolean {
    return this.eventType === 'failed' && !!this.metadata?.errorDetails;
  }

  getErrorDetails(): string | undefined {
    return this.metadata?.errorDetails;
  }

  wasRetried(): boolean {
    return (this.metadata?.previousAttempts || 0) > 0;
  }

  getAttemptNumber(): number {
    return (this.metadata?.previousAttempts || 0) + 1;
  }
}