import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionPlanRecurrencePanelComponent, RecurrenceForm } from '../action-plan-recurrence-panel/action-plan-recurrence-panel';
import { RecurrenceFrequency } from '../../../../../features/action-plans/models/action-plan.model';
import { MUNICIPIOS_VALLE } from '../../../../../core/data/municipios';
import { UserResponse } from '../../../../../features/user/models/user.model';
import { LucideAngularModule } from 'lucide-angular';

export interface SupportStaffEntry {
  name: string;
  user_id: number | null;
}

export interface DatasetPerson {
  name: string;
}

export interface ActivityFormData {
  name: string;
  deliverable: string;
  delivery_date: string;
  lugar: string | null;
  requires_boss_assistance: boolean;
  generates_report: boolean;
  support_staff: SupportStaffEntry[];
  recurrence: RecurrenceForm;
}

@Component({
  selector: 'app-action-plan-activity-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionPlanRecurrencePanelComponent, LucideAngularModule],
  templateUrl: './action-plan-activity-form.html',
})
export class ActionPlanActivityFormComponent {

  municipios = MUNICIPIOS_VALLE;

  @Input() activity!: ActivityFormData;
  @Input() index = 0;
  @Input() namePrefix = '';
  @Input() canRemove = false;
  @Input() showRecurrence = true;
  @Input() isEditMode = false;
  @Input() showNameError = false;
  /** Lista de usuarios disponibles para seleccionar como personal de apoyo */
  @Input() availableUsers: UserResponse[] = [];
  /** Personas extra provenientes del dataset Promotores PYBA. Solo se
   *  pasan cuando el componente seleccionado es "Promotores PYBA". */
  @Input() datasetPersons: DatasetPerson[] = [];

  @Output() remove = new EventEmitter<void>();
  @Output() addStaff = new EventEmitter<void>();
  @Output() removeStaff = new EventEmitter<number>();

  /** Hay opciones disponibles para mostrar el select de apoyo. */
  get hasStaffOptions(): boolean {
    return this.availableUsers.length > 0 || this.datasetPersons.length > 0;
  }

  /** Clave string que representa la opción actualmente seleccionada
   *  en el dropdown de apoyo. Se usa para mapear entre un único
   *  ngModel y dos fuentes distintas (usuarios y personas del dataset).
   *  - ''           → Externo / libre
   *  - 'u:<id>'     → Usuario del sistema
   *  - 'd:<name>'   → Persona del dataset Promotores PYBA
   */
  staffSelectKey(staff: SupportStaffEntry): string {
    if (staff.user_id) return 'u:' + staff.user_id;
    if (staff.name && this.datasetPersons.some(p => p.name === staff.name)) {
      return 'd:' + staff.name;
    }
    return '';
  }

  onStaffSelectKeyChange(staff: SupportStaffEntry, key: string): void {
    if (!key) {
      staff.user_id = null;
      staff.name = '';
      return;
    }
    if (key.startsWith('u:')) {
      const uid = +key.slice(2);
      const u = this.availableUsers.find(x => x.id === uid);
      staff.user_id = uid || null;
      staff.name = u ? `${u.first_name} ${u.last_name}`.trim() : '';
      return;
    }
    if (key.startsWith('d:')) {
      staff.user_id = null;
      staff.name = key.slice(2);
      return;
    }
  }

  /** True si el apoyo ya fue tomado de la lista de personas del dataset. */
  isStaffFromDataset(staff: SupportStaffEntry): boolean {
    return !staff.user_id
      && !!staff.name
      && this.datasetPersons.some(p => p.name === staff.name);
  }

  /** Personas del dataset que aún no han sido añadidas a esta actividad
   *  (evita duplicados con apoyos ya cargados manualmente o por dataset). */
  get availableDatasetPersons(): DatasetPerson[] {
    if (!this.datasetPersons.length) return [];
    const usedNames = new Set(
      (this.activity?.support_staff || [])
        .filter(s => !s.user_id && s.name)
        .map(s => s.name.trim().toLowerCase())
    );
    return this.datasetPersons.filter(p => !usedNames.has(p.name.trim().toLowerCase()));
  }
}