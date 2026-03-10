import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Field } from '../../../../../core/models/field.model';
import { TableRecord, RecordData } from '../../../../../core/models/record.model';
import { FieldService } from '../../../../../core/services/field.service';
import { RecordService } from '../../../../../core/services/record.service';
import { TableService } from '../../../../../core/services/table.service';

/** Lightweight editable copy of a Field (may be a new unsaved field if id === 0) */
export interface EditableField extends Field {
  _isNew?: boolean;
}

type TabId = 'table' | 'fields' | 'add-row';

@Component({
  selector: 'app-table-editor-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './table-editor-drawer.html',
})
export class TableEditorDrawerComponent implements OnChanges {

  // ── Inputs ──────────────────────────────────────────────────────────────────
  @Input() tableId!: number;
  @Input() tableNameInput: string = '';
  @Input() tableDescriptionInput: string = '';
  @Input() fields = signal<Field[]>([]);

  // ── Outputs ─────────────────────────────────────────────────────────────────
  /** Emits when the user saves table meta (name/description) */
  @Output() tableSaved = new EventEmitter<{ name: string; description: string }>();
  /** Emits updated field list after saving columns */
  @Output() fieldsSaved = new EventEmitter<Field[]>();
  /** Emits newly created record */
  @Output() rowAdded = new EventEmitter<TableRecord>();
  /** Emits when drawer requests to close */
  @Output() drawerClose = new EventEmitter<void>();

  // ── State ───────────────────────────────────────────────────────────────────
  isOpen = signal(false);
  activeTab = signal<TabId>('table');

  tabs: { id: TabId; label: string }[] = [
    { id: 'table', label: 'Tabla' },
    { id: 'fields', label: 'Columnas' },
    { id: 'add-row', label: 'Nueva fila' },
  ];

  // Table meta
  tableName: string = '';
  tableDescription: string = '';
  savingTable = signal(false);

  // Fields edit
  editableFields = signal<EditableField[]>([]);
  newOptionInputs: Record<number, string> = {};
  savingFields = signal(false);

  // New row
  newRowData: RecordData = {};
  savingRow = signal(false);

  // Feedback
  statusMessage = signal<string | null>(null);
  statusIsError = signal(false);

  constructor(
    private fieldService: FieldService,
    private recordService: RecordService,
    private tableService: TableService,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tableNameInput']) {
      this.tableName = this.tableNameInput;
    }
    if (changes['tableDescriptionInput']) {
      this.tableDescription = this.tableDescriptionInput;
    }
    if (changes['fields']) {
      this.syncEditableFields();
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  open(tab: TabId = 'table'): void {
    this.tableName = this.tableNameInput;
    this.tableDescription = this.tableDescriptionInput;
    this.syncEditableFields();
    this.resetNewRow();
    this.statusMessage.set(null);
    this.statusIsError.set(false);
    this.activeTab.set(tab);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.drawerClose.emit();
  }

  // ── Table meta ───────────────────────────────────────────────────────────────

  saveTableMeta(): void {
    if (!this.tableName.trim()) {
      this.showStatus('El nombre no puede estar vacío.', true);
      return;
    }
    this.savingTable.set(true);
    this.tableService.update(this.tableId, {
      name: this.tableName.trim(),
      description: this.tableDescription.trim(),
    }).subscribe({
      next: () => {
        this.savingTable.set(false);
        this.tableSaved.emit({ name: this.tableName.trim(), description: this.tableDescription.trim() });
        this.showStatus('Nombre guardado correctamente.');
      },
      error: () => {
        this.savingTable.set(false);
        this.showStatus('Error al guardar el nombre.', true);
      },
    });
  }

  // ── Fields ───────────────────────────────────────────────────────────────────

  addField(): void {
    const newField: EditableField = {
      id: 0,
      table_id: this.tableId,
      name: '',
      label: '',
      type: 'text',
      options: [],
      required: false,
      _isNew: true,
    };
    this.editableFields.update(f => [...f, newField]);
  }

  removeField(index: number): void {
    this.editableFields.update(f => f.filter((_, i) => i !== index));
  }

  onLabelChange(field: EditableField): void {
    if (!field.name || field._isNew) {
      field.name = field.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    }
  }

  addOption(field: EditableField, index: number): void {
    const val = (this.newOptionInputs[index] ?? '').trim();
    if (!val) return;
    if (!field.options) field.options = [];
    field.options = [...field.options, val];
    this.newOptionInputs[index] = '';
  }

  removeOption(field: EditableField, optIndex: number): void {
    field.options = field.options?.filter((_, i) => i !== optIndex) ?? [];
  }

  saveFields(): void {
    const fields = this.editableFields();

    // Validate
    for (const f of fields) {
      if (!f.name.trim() || !f.label.trim()) {
        this.showStatus('Todos los campos deben tener nombre y etiqueta.', true);
        return;
      }
    }

    this.savingFields.set(true);

    const saves = fields.map((f, i) => {
      const payload = { ...f, order: i };
      return f._isNew || f.id === 0
        ? this.fieldService.create(payload)
        : this.fieldService.update(f.id, payload);
    });

    // Run saves sequentially using Promise chain for simplicity
    Promise.all(saves.map(obs => obs.toPromise()))
      .then((saved) => {
        const result = saved as Field[];
        this.savingFields.set(false);
        this.fieldsSaved.emit(result);
        this.showStatus('Columnas guardadas correctamente.');
        this.syncEditableFields(result);
      })
      .catch(() => {
        this.savingFields.set(false);
        this.showStatus('Error al guardar las columnas.', true);
      });
  }

  // ── New Row ──────────────────────────────────────────────────────────────────

  addRow(): void {
    this.savingRow.set(true);
    this.recordService.create({ table_id: this.tableId, data: { ...this.newRowData } })
      .subscribe({
        next: (record) => {
          this.savingRow.set(false);
          this.rowAdded.emit(record);
          this.resetNewRow();
          this.showStatus('Fila añadida correctamente.');
        },
        error: () => {
          this.savingRow.set(false);
          this.showStatus('Error al añadir la fila.', true);
        },
      });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private syncEditableFields(source?: Field[]): void {
    const base = source ?? this.fields();
    this.editableFields.set(base.map(f => ({ ...f, options: [...(f.options ?? [])] })));
    this.newOptionInputs = {};
  }

  private resetNewRow(): void {
    const data: RecordData = {};
    for (const f of this.fields()) {
      data[f.name] = f.type === 'boolean' ? false : null;
    }
    this.newRowData = data;
  }

  private showStatus(msg: string, isError = false): void {
    this.statusMessage.set(msg);
    this.statusIsError.set(isError);
    setTimeout(() => this.statusMessage.set(null), 3500);
  }
}