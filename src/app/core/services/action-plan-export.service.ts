import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ActionPlanModel } from '../models/action-plan.model';
import { ComponentModel } from '../models/component.model';
import { StrategyModel } from '../models/strategy.model';

@Injectable({ providedIn: 'root' })
export class ActionPlanExportService {

  export(
    plans: ActionPlanModel[],
    strategies: StrategyModel[] = [],
    components: ComponentModel[] = [],
    filename = 'planes_de_accion'
  ): void {
    const wb = XLSX.utils.book_new();
    this.buildMainSheet(wb, plans, strategies, components);
    this.buildSummarySheet(wb, plans);
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
  }

  private buildMainSheet(
    wb: XLSX.WorkBook,
    plans: ActionPlanModel[],
    strategies: StrategyModel[],
    components: ComponentModel[]
  ): void {
    const headers = [
      'Plan ID', 'Estrategia', 'Componente', 'Responsable',
      'Objetivo', 'Actividad', 'Entregable', 'Fecha de Entrega',
      'Requiere Jefe', 'Estado', 'Puntaje', 'Personal de Apoyo'
    ];

    const rows: any[][] = [headers];

    for (const plan of plans) {
      const strategyName = strategies.find(s => s.id === plan.strategy_id)?.name ?? `ID ${plan.strategy_id}`;
      const componentName = components.find(c => c.id === plan.component_id)?.name ?? `ID ${plan.component_id}`;

      for (const obj of plan.plan_objectives ?? []) {
        const objText = obj.objective_text ?? `Objetivo #${obj.objective_id}`;
        for (const act of obj.activities ?? []) {
          rows.push([
            plan.id,
            strategyName,
            componentName,
            plan.responsible ?? '',
            objText,
            act.name,
            act.deliverable,
            act.delivery_date,
            act.requires_boss_assistance ? 'Sí' : 'No',
            act.status ?? '',
            act.computed_score ?? act.score ?? '',
            (act.support_staff ?? []).map(s => s.name).join(', '),
          ]);
        }
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Anchos de columna
    ws['!cols'] = [
      { wch: 8 },  // Plan ID
      { wch: 28 }, // Estrategia
      { wch: 28 }, // Componente
      { wch: 22 }, // Responsable
      { wch: 40 }, // Objetivo
      { wch: 36 }, // Actividad
      { wch: 30 }, // Entregable
      { wch: 16 }, // Fecha
      { wch: 14 }, // Requiere Jefe
      { wch: 14 }, // Estado
      { wch: 10 }, // Puntaje
      { wch: 30 }, // Personal de Apoyo
    ];

    // Estilo encabezado (color azul oscuro)
    const headerRange = XLSX.utils.decode_range(ws['!ref']!);
    for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cell]) continue;
      ws[cell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 11 },
        fill: { fgColor: { rgb: '1B3A6B' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
          right: { style: 'thin', color: { rgb: 'FFFFFF' } },
        }
      };
    }

    // Estilo filas de datos (alternado)
    for (let R = 1; R < rows.length; R++) {
      const isEven = R % 2 === 0;
      for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell]) ws[cell] = { t: 's', v: '' };
        ws[cell].s = {
          font: { name: 'Arial', sz: 10 },
          fill: { fgColor: { rgb: isEven ? 'EEF3FB' : 'FFFFFF' } },
          alignment: { vertical: 'center', wrapText: true },
          border: {
            bottom: { style: 'thin', color: { rgb: 'D6E0F0' } },
            right: { style: 'thin', color: { rgb: 'D6E0F0' } },
          }
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Actividades');
  }

  private buildSummarySheet(wb: XLSX.WorkBook, plans: ActionPlanModel[]): void {
    const totalActivities = plans.reduce((t, p) =>
      t + (p.plan_objectives ?? []).reduce((t2, o) => t2 + (o.activities ?? []).length, 0), 0);
    const done = plans.reduce((t, p) =>
      t + (p.plan_objectives ?? []).reduce((t2, o) =>
        t2 + (o.activities ?? []).filter(a => a.status === 'Realizado').length, 0), 0);
    const inProgress = plans.reduce((t, p) =>
      t + (p.plan_objectives ?? []).reduce((t2, o) =>
        t2 + (o.activities ?? []).filter(a => a.status === 'En Ejecución').length, 0), 0);
    const pending = plans.reduce((t, p) =>
      t + (p.plan_objectives ?? []).reduce((t2, o) =>
        t2 + (o.activities ?? []).filter(a => a.status === 'Pendiente').length, 0), 0);

    const rows = [
      ['RESUMEN DE PLANES DE ACCIÓN'],
      ['Fecha de exportación', new Date().toLocaleDateString('es-CO')],
      [],
      ['Métrica', 'Valor'],
      ['Total de planes', plans.length],
      ['Total de actividades', totalActivities],
      ['Actividades Realizadas', done],
      ['Actividades En Ejecución', inProgress],
      ['Actividades Pendientes', pending],
      ['% Completado', totalActivities > 0 ? `${Math.round((done / totalActivities) * 100)}%` : '0%'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    // Título
    if (ws['A1']) ws['A1'].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 14 },
      fill: { fgColor: { rgb: '1B3A6B' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };

    // Encabezado tabla
    ['A4', 'B4'].forEach(ref => {
      if (ws[ref]) ws[ref].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 11 },
        fill: { fgColor: { rgb: '2d5fa8' } },
        alignment: { horizontal: 'center' },
      };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  }
}