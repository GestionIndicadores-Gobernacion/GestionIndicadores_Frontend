export type RecordValue =
  | string
  | number
  | boolean
  | null
  | Date;

export interface RecordData {
  [fieldName: string]: RecordValue;
}

export interface TableRecord {
  id: number;
  table_id: number;
  data: RecordData;
  created_at: string;
}

export interface TableRecordPayload {
  table_id: number;
  data: RecordData;
}
