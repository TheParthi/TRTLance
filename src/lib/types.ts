// Row shapes returned by Supabase (see supabase/migrations). Numeric columns arrive as strings.

export type Intent = 'hire' | 'work' | 'both';
export type ExperienceLevel = 'entry' | 'intermediate' | 'expert';

export type ProjectStatus = 'draft' | 'open' | 'in_contract' | 'completed' | 'cancelled';
export type ProposalStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';
export type ContractStatus = 'pending_signatures' | 'awaiting_funding' | 'active' | 'disputed' | 'completed' | 'cancelled';
export type MilestoneStatus =
  | 'pending' | 'funded' | 'submitted' | 'revision_requested' | 'approved' | 'paid' | 'disputed' | 'refunded' | 'settled';
export type DisputeStatus = 'open' | 'awaiting_evidence' | 'under_review' | 'resolved' | 'escalated';
export type SettlementStatus = 'awaiting_flag' | 'ready' | 'pending' | 'settled' | 'failed';
export type EscrowTxKind = 'fund' | 'release' | 'refund' | 'dispute' | 'resolve';
export type EscrowTxStatus = 'pending' | 'confirmed' | 'failed';
export type NotificationCategory =
  | 'projects' | 'contracts' | 'milestones' | 'payments' | 'messages' | 'disputes' | 'security' | 'system';
export type Severity = 'info' | 'success' | 'warning' | 'critical';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_path: string | null;
  location: string | null;
  website_url: string | null;
  intent: Intent;
  skills: string[];
  languages: string[];
  experience_level: ExperienceLevel | null;
  years_experience: number | null;
  onboarding_step: string;
  onboarding_completed_at: string | null;
  created_at: string;
}

export interface ProfileStats {
  id: string;
  email_verified: boolean;
  wallet_verified: boolean;
  rating_avg: string | null;
  review_count: number;
  completed_as_freelancer: number;
  completed_as_client: number;
  funded_as_client: number;
  disputes_lost: number;
  trust_credits: number;
}

export interface Category {
  slug: string;
  label: string;
  description: string;
}

export interface MilestonePlanItem {
  title: string;
  description?: string;
  amount: string;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category: string | null;
  skills: string[];
  budget_amount: string | null;
  currency: string;
  experience_level: ExperienceLevel | null;
  start_date: string | null;
  due_date: string | null;
  deliverables: string[];
  milestone_plan: MilestonePlanItem[];
  visibility: 'public' | 'unlisted';
  status: ProjectStatus;
  hired_freelancer_id: string | null;
  proposal_count: number;
  draft_step: number;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAttachment {
  id: string;
  project_id: string;
  storage_path: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
}

export interface ProjectSearchRow {
  id: string;
  title: string;
  description: string;
  category: string | null;
  skills: string[];
  budget_amount: string;
  currency: string;
  experience_level: ExperienceLevel | null;
  start_date: string | null;
  due_date: string | null;
  proposal_count: number;
  milestone_count: number;
  published_at: string;
  client_id: string;
  client_username: string;
  client_name: string;
  client_avatar: string | null;
  client_email_verified: boolean;
  client_wallet_verified: boolean;
  client_funded: number;
  client_rating: string | null;
  client_reviews: number;
  total_count: number;
}

export interface ProposalMilestone {
  id: string;
  proposal_id: string;
  position: number;
  title: string;
  description: string;
  amount: string;
  due_in_days: number;
}

export interface Proposal {
  id: string;
  project_id: string;
  freelancer_id: string;
  cover_letter: string;
  amount: string;
  currency: string;
  duration_days: number;
  relevant_skills: string[];
  status: ProposalStatus;
  decided_at: string | null;
  created_at: string;
}

export interface ContractTerms {
  version: number;
  project: { id: string; title: string };
  scope: string;
  deliverables: string[];
  client: { id: string; name: string; username: string };
  freelancer: { id: string; name: string; username: string };
  currency: string;
  total_amount: string;
  duration_days: number;
  milestones: { position: number; title: string; description: string; amount: string; due_in_days: number }[];
  payment_terms: string;
}

export interface Contract {
  id: string;
  project_id: string;
  proposal_id: string;
  client_id: string;
  freelancer_id: string;
  title: string;
  scope: string;
  deliverables: string[];
  currency: string;
  total_amount: string;
  status: ContractStatus;
  terms: ContractTerms;
  terms_hash: string;
  client_signed_at: string | null;
  client_signature_name: string | null;
  client_wallet: string | null;
  freelancer_signed_at: string | null;
  freelancer_signature_name: string | null;
  freelancer_wallet: string | null;
  chain_id: number | null;
  escrow_address: string | null;
  escrow_key: string | null;
  funded_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  contract_id: string;
  position: number;
  title: string;
  description: string;
  amount: string;
  due_in_days: number;
  due_date: string | null;
  status: MilestoneStatus;
  status_before_dispute: MilestoneStatus | null;
  revision_count: number;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  freelancer_payout: string | null;
  client_refund: string | null;
}

export interface MilestoneSubmission {
  id: string;
  milestone_id: string;
  contract_id: string;
  version: number;
  note: string;
  links: string[];
  submitted_by: string;
  review_status: 'pending' | 'revision_requested' | 'approved';
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ContractFile {
  id: string;
  contract_id: string;
  submission_id: string | null;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
}

export interface EscrowTransaction {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  kind: EscrowTxKind;
  chain_id: number;
  tx_hash: string;
  from_address: string | null;
  amount: string | null;
  status: EscrowTxStatus;
  block_number: number | null;
  failure_reason: string | null;
  reported_by: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface ContractEvent {
  id: number;
  contract_id: string;
  actor_id: string | null;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  client_id: string;
  freelancer_id: string;
  contract_id: string | null;
  created_at: string;
  last_message_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  kind: 'text' | 'file' | 'system';
  body: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  link: string | null;
  severity: Severity;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  number: number;
  contract_id: string;
  milestone_id: string;
  raised_by: string;
  respondent_id: string;
  reason: 'quality' | 'scope' | 'deadline' | 'non_responsive' | 'non_payment' | 'other';
  description: string;
  requested_outcome: 'release' | 'refund' | 'partial';
  requested_freelancer_pct: number | null;
  amount: string;
  status: DisputeStatus;
  arbitrator_id: string | null;
  assigned_at: string | null;
  evidence_due_at: string | null;
  escalation_reason: string | null;
  decision: 'freelancer' | 'client' | 'partial' | null;
  freelancer_pct: number | null;
  decision_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  onchain_flagged_at: string | null;
  settlement_status: SettlementStatus;
  settled_at: string | null;
  created_at: string;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  submitted_by: string;
  kind: 'file' | 'link' | 'note';
  title: string;
  description: string;
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string | null;
  kind: 'text' | 'system';
  body: string;
  created_at: string;
}

export interface DisputeEvent {
  id: number;
  dispute_id: string;
  actor_id: string | null;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface Arbitrator {
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  specializations: string[];
  statement: string;
  capacity: number;
  is_available: boolean;
  applied_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

export interface Review {
  id: string;
  contract_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: 'client' | 'freelancer';
  rating: number;
  ratings: Record<string, number>;
  body: string;
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  url: string | null;
  image_path: string | null;
  contract_id: string | null;
  created_at: string;
}

export interface Education {
  id: string;
  user_id: string;
  school: string;
  degree: string | null;
  field: string | null;
  start_year: number | null;
  end_year: number | null;
}

export interface Certification {
  id: string;
  user_id: string;
  name: string;
  issuer: string | null;
  issued_on: string | null;
  credential_url: string | null;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskDimension {
  level: RiskLevel;
  explanation: string;
}

export interface RiskReportResult {
  overall: RiskLevel;
  summary: string;
  dimensions: {
    scope_clarity: RiskDimension;
    timeline: RiskDimension;
    budget: RiskDimension;
    milestones: RiskDimension;
    dispute_likelihood: RiskDimension;
  };
  missing_information: string[];
}

export interface RiskReport {
  id: string;
  project_id: string;
  input_hash: string;
  model: string;
  analyzed_fields: string[];
  result: RiskReportResult;
  generated_at: string;
}

export interface DisputeRecommendationResult {
  suggested_outcome: 'freelancer' | 'client' | 'partial';
  suggested_freelancer_pct: number;
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  key_facts: string[];
  open_questions: string[];
  reasoning: string;
}

export interface DisputeRecommendation {
  id: string;
  dispute_id: string;
  model: string;
  analyzed_sources: string[];
  result: DisputeRecommendationResult;
  generated_at: string;
}
