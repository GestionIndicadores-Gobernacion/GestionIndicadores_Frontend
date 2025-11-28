// core/models/strategy.model.ts

export interface StrategyModel {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
}

export interface StrategyCreateRequest {
  name: string;
  description?: string | null;
  active?: boolean;
}

export interface StrategyUpdateRequest {
  id: number;
  name?: string;
  description?: string | null;
  active?: boolean;
}

export interface StrategyResponse extends StrategyModel {}
