import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-grouped-data',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-grouped-data.html'
})
export class ConfigGroupedDataComponent implements OnInit {
  @Input() indicatorGroup!: FormGroup;
  @Input() indicatorIndex!: number;
  @Input() allIndicatorControls: AbstractControl[] = [];

  subFields: any[] = [];

  ngOnInit(): void {
    const raw = this.indicatorGroup.get('configSubFields')?.value;
    this.subFields = raw?.trim() ? this.parseSubFields(raw) : [];
  }

  get multiSelectIndicators(): AbstractControl[] {
    return this.allIndicatorControls
      .slice(0, this.indicatorIndex)
      .filter(ind => ind.get('field_type')?.value === 'multi_select');
  }

  // ── Sub-fields ──────────────────────────────────────────────────

  addSubField() {
    this.subFields.push({ name: '', type: 'number', label: '' });
    this.sync();
  }

  removeSubField(j: number) {
    this.subFields.splice(j, 1);
    this.sync();
  }

  updateSubField(j: number, field: string, event: any) {
    let value = event.target ? event.target.value : event;
    if (field === 'name') value = this.sanitizeTechName(value);
    else if (field === 'label') value = this.capitalizeWords(value);
    this.subFields[j][field] = value;
    this.sync();
  }

  private sync() {
    const formatted = this.subFields
      .map(sf => `${sf.name}|${sf.type}|${sf.label || sf.name}`)
      .join('\n');
    this.indicatorGroup.get('configSubFields')?.setValue(formatted, { emitEvent: false });
  }

  private parseSubFields(text: string): any[] {
    return text.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const parts = line.split('|').map((p: string) => p.trim());
      return { name: parts[0] || '', type: parts[1] || 'number', label: parts[2] || parts[0] || '' };
    });
  }

  private sanitizeTechName(value: string): string {
    return value.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private capitalizeWords(value: string): string {
    return value.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}