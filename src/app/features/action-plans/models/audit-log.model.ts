export interface AuditLogModel {
  id: number;
  user_id: number | null;
  entity: string;
  entity_id: number;
  action: 'created' | 'updated' | 'deleted';
  detail: string | null;
  created_at: string;
}