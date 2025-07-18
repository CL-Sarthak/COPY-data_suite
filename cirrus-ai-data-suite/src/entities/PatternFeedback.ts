import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { PatternEntity } from './PatternEntity';

export type FeedbackType = 'positive' | 'negative';
export type FeedbackContext = 'annotation' | 'detection' | 'testing';

@Entity('pattern_feedback')
@Index(['patternId', 'context'])
@Index(['createdAt'])
export class PatternFeedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'pattern_id' })
  @Index()
  patternId!: string;

  @ManyToOne(() => PatternEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pattern_id', referencedColumnName: 'id' })
  pattern!: PatternEntity;

  @Column({
    name: 'feedback_type',
    type: 'varchar',
    length: 10
  })
  feedbackType!: FeedbackType;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true  // Make nullable since it doesn't exist in current DB
  })
  context?: FeedbackContext;

  @Column('text', { name: 'matched_text', nullable: true })
  matchedText?: string;

  @Column('text', { name: 'text', nullable: true })  // The actual column in DB is 'text'
  text?: string;

  @Column('text', { name: 'surrounding_context', nullable: true })
  surroundingContext?: string;

  @Column('float', { name: 'original_confidence', nullable: true })
  originalConfidence?: number;

  @Column('text', { name: 'user_comment', nullable: true })
  userComment?: string;

  @Column({ name: 'data_source_id', nullable: true })
  dataSourceId!: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId!: string;

  @Column({ name: 'user_id', default: 'system' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Computed accuracy metrics
  @Column('text', { nullable: true })
  metadata!: string;
}