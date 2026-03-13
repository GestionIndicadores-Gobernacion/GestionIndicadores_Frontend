import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface FileValue {
  file_name: string;
  file_url: string;
  file_size_mb: number;
}

@Component({
  selector: 'app-file-attachment-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
 
      <!-- Archivo seleccionado -->
      <div *ngIf="fileVal" class="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
        <svg class="w-5 h-5 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-zinc-900 truncate">{{ fileVal.file_name }}</p>
          <p class="text-xs text-zinc-500">{{ fileVal.file_size_mb }} MB</p>
        </div>
        <div class="flex items-center gap-2">
          <a [href]="fileVal.file_url" target="_blank" class="text-xs text-zinc-600 hover:text-zinc-900 underline">Ver</a>
          <button type="button" (click)="remove.emit()"
            class="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
 
      <!-- Zona de carga -->
      <div *ngIf="!fileVal">
        <label class="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-zinc-300
                      rounded-lg cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
          [class.opacity-60]="uploading"
          [class.pointer-events-none]="uploading">
          <ng-container *ngIf="!uploading">
            <svg class="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span class="text-sm text-zinc-500">Haz clic para seleccionar archivo</span>
          </ng-container>
          <ng-container *ngIf="uploading">
            <div class="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
            <span class="text-sm text-zinc-500">Subiendo archivo...</span>
          </ng-container>
          <input type="file" class="hidden" [accept]="accept" (change)="fileSelected.emit($event)" />
        </label>
      </div>
 
      <p *ngIf="uploadError" class="text-xs text-red-600">{{ uploadError }}</p>
    </div>
  `
})
export class FileAttachmentFieldComponent {
  @Input() value: FileValue | null = null;
  @Input() accept = '*/*';
  @Input() uploading = false;
  @Input() uploadError = '';

  @Output() fileSelected = new EventEmitter<Event>();
  @Output() remove = new EventEmitter<void>();

  get fileVal(): FileValue | null {
    return this.value?.file_url ? this.value : null;
  }
}
