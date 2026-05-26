// reports-map/reports-map.types.ts
import { ReportModel } from '../../../../../features/report/models/report.model';

export interface IndicatorDetail {
  indicator_id: number;
  name: string;
  field_type: string;
  raw_value: any;
  formatted_value: string;
}

export interface ReportDetail {
  id: number;
  report_date: string;
  component_name: string;
  zone_type: 'Urbana' | 'Rural';
  executive_summary: string;
  evidence_link: string | null;
  indicator_details: IndicatorDetail[];
}

export interface MunicipioSummary {
  name: string;
  centroid: { lat: number; lng: number; name: string };
  totalReports: number;
  urbana: number;
  rural: number;
  reports: ReportModel[];
  byComponent: { component_id: number; component_name: string; count: number }[];
  indicators: { id: number; name: string; field_type: string; total: number }[];
  reportDetails: ReportDetail[];
  indicatorsByComponent: {
    component_name: string;
    indicators: { id: number; name: string; total: number }[];
  }[];
}

export interface KpiOption {
  id: string;
  label: string;
  color: string;
  bg: string;
}

export const KPI_OPTIONS: KpiOption[] = [
  { id: 'asistencias', label: 'Asistencias', color: '#0891b2', bg: '#ECFEFF' },
  { id: 'denuncias', label: 'Denuncias', color: '#dc2626', bg: '#FEF2F2' },
  { id: 'esterilizados', label: 'Esterilizados', color: '#059669', bg: '#ECFDF5' },
  { id: 'refugios', label: 'Refugios', color: '#7c3aed', bg: '#F5F3FF' },
  { id: 'ninos', label: 'Niños sensib.', color: '#db2777', bg: '#FDF2F8' },
  { id: 'emprendedores', label: 'Emprendedores', color: '#65a30d', bg: '#F7FEE7' },
];