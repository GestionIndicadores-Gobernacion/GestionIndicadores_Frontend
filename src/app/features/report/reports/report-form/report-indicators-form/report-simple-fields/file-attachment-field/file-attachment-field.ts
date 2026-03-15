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
  templateUrl: './file-attachment-field.html'
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