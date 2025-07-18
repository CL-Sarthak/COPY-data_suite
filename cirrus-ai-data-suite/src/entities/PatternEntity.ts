import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('patterns')
export class PatternEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'type', nullable: true, default: 'CUSTOM' })
  type!: string; // 'PII' | 'FINANCIAL' | 'MEDICAL' | 'CLASSIFICATION' | 'CUSTOM'

  @Column()
  category!: string;

  @Column({ nullable: true })
  regex!: string;

  @Column('text', { name: 'regex_patterns', nullable: true, default: '[]' })
  regexPatterns!: string; // JSON array of regex patterns

  @Column('text')
  examples!: string; // JSON string array

  @Column('text', { name: 'context_keywords', nullable: true })
  contextKeywords!: string; // JSON string array of context keywords

  @Column('text', { name: 'metadata', nullable: true })
  metadata!: string; // JSON string for additional pattern metadata

  @Column()
  description!: string;

  @Column()
  color!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  // Pattern feedback metrics
  @Column('text', { name: 'accuracy_metrics', nullable: true })
  accuracyMetrics!: string; // JSON with precision, recall, f1 score

  @Column({ name: 'last_refined_at', nullable: true })
  lastRefinedAt!: Date;

  @Column({ name: 'feedback_count', default: 0 })
  feedbackCount!: number;

  @Column({ name: 'positive_count', default: 0 })
  positiveCount!: number;

  @Column({ name: 'negative_count', default: 0 })
  negativeCount!: number;

  // Auto-refinement data
  @Column('text', { name: 'excluded_examples', nullable: true })
  excludedExamples!: string; // JSON array of false positives to exclude

  @Column('float', { name: 'confidence_threshold', default: 0.7 })
  confidenceThreshold!: number; // Minimum confidence required for matches

  @Column({ name: 'auto_refine_threshold', default: 3 })
  autoRefineThreshold!: number; // Number of negative feedback before auto-exclusion

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}