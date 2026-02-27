import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoaderService);

  const SILENT_URLS = [
    '/a',
    '/a',
    '/a',
  ];

  const isSilent = SILENT_URLS.some(url => req.url.includes(url));

  if (!isSilent) loader.show();

  return next(req).pipe(
    finalize(() => {
      if (!isSilent) loader.hide();
    })
  );
};