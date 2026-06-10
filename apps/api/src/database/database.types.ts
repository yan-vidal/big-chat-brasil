import type {
  BillingTransactionType,
  DocumentType,
  MessagePriority,
  MessageStatus,
  PaymentIntentStatus,
  PaymentMethod,
  PlanType,
  Role,
  SenderType,
} from '@bcb/shared';
import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export type TimestampColumn = ColumnType<Date, Date | string | undefined, Date | string>;
export type NullableTimestampColumn = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null
>;

export interface AccountTable {
  id: Generated<string>;
  document_id: string;
  document_type: DocumentType;
  password_hash: string;
  role: Role;
  active: Generated<boolean>;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ClientProfileTable {
  id: Generated<string>;
  account_id: string;
  name: string;
  plan_type: PlanType;
  onboarding_completed: Generated<boolean>;
  balance_cents: Generated<number>;
  monthly_limit_cents: number | null;
  monthly_used_cents: Generated<number>;
  usage_month: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface RecipientTable {
  id: Generated<string>;
  name: string;
  client_profile_id: ColumnType<string | null, string | null | undefined, string | null>;
  created_at: TimestampColumn;
}

export interface ConversationTable {
  id: Generated<string>;
  client_id: string;
  recipient_id: string;
  last_message_content: string | null;
  last_message_at: NullableTimestampColumn;
  unread_count: Generated<number>;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface MessageTable {
  id: Generated<string>;
  conversation_id: string;
  sender_type: SenderType;
  content: string;
  priority: MessagePriority;
  status: MessageStatus;
  cost_cents: Generated<number>;
  created_at: TimestampColumn;
  processed_at: NullableTimestampColumn;
}

export interface BillingTransactionTable {
  id: Generated<string>;
  client_id: string;
  type: BillingTransactionType;
  amount_cents: number;
  message_id: string | null;
  payment_intent_id: string | null;
  created_at: TimestampColumn;
}

export interface PaymentIntentTable {
  id: Generated<string>;
  client_id: string;
  method: PaymentMethod;
  amount_cents: number;
  status: PaymentIntentStatus;
  confirmed_at: NullableTimestampColumn;
  created_at: TimestampColumn;
}

export interface Database {
  accounts: AccountTable;
  client_profiles: ClientProfileTable;
  recipients: RecipientTable;
  conversations: ConversationTable;
  messages: MessageTable;
  billing_transactions: BillingTransactionTable;
  payment_intents: PaymentIntentTable;
}

export type Account = Selectable<AccountTable>;
export type NewAccount = Insertable<AccountTable>;
export type AccountUpdate = Updateable<AccountTable>;

export type ClientProfile = Selectable<ClientProfileTable>;
export type NewClientProfile = Insertable<ClientProfileTable>;
export type ClientProfileUpdate = Updateable<ClientProfileTable>;

export type Recipient = Selectable<RecipientTable>;
export type NewRecipient = Insertable<RecipientTable>;

export type Conversation = Selectable<ConversationTable>;
export type NewConversation = Insertable<ConversationTable>;
export type ConversationUpdate = Updateable<ConversationTable>;

export type Message = Selectable<MessageTable>;
export type NewMessage = Insertable<MessageTable>;

export type BillingTransaction = Selectable<BillingTransactionTable>;
export type NewBillingTransaction = Insertable<BillingTransactionTable>;

export type PaymentIntent = Selectable<PaymentIntentTable>;
export type NewPaymentIntent = Insertable<PaymentIntentTable>;
