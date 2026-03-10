import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-file-attachment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-file-attachment.html'
})
export class ConfigFileAttachmentComponent {
  @Input() indicatorGroup!: FormGroup;
}