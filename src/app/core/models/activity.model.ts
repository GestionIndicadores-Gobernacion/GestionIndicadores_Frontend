export interface ActivityModel {
  id: number;
  strategy_id: number;
  description: string;
  active: boolean;
}

export interface ActivityCreateRequest {
  strategy_id: number;
  description: string;
  active?: boolean;
}

export interface ActivityUpdateRequest {
  id: number;
  strategy_id?: number;
  description?: string;
  active?: boolean;
}

export interface ActivityResponse extends ActivityModel {}
