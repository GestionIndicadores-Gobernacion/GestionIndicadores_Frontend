import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment.prod';

export interface FileValue {
  file_name: string;
  file_url: string;
  file_size_mb: number;
}

@Injectable({ providedIn: 'root' })
export class IndicatorFileService {

  uploadingFor: number | null = null;
  errors: Record<number, string> = {};

  constructor(private http: HttpClient) {}

  upload(
    event: Event,
    indicatorId: number,
    onSuccess: (result: FileValue) => void,
    onError: (msg: string) => void
  ): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.errors[indicatorId] = '';
    this.uploadingFor = indicatorId;

    const formData = new FormData();
    formData.append('file', input.files[0]);

    this.http.post<FileValue>(`${environment.apiUrl}/files/upload`, formData).subscribe({
      next: (result) => {
        this.uploadingFor = null;
        onSuccess(result);
        input.value = '';
      },
      error: (err) => {
        this.uploadingFor = null;
        this.errors[indicatorId] = err.error?.errors?.file || 'Error al subir el archivo';
        onError(this.errors[indicatorId]);
        input.value = '';
      }
    });
  }

  getAcceptString(allowedTypes?: string[]): string {
    return allowedTypes?.length ? allowedTypes.map(t => `.${t}`).join(',') : '*/*';
  }
}