// Suite dedicada al helper `bypassesComponentScope`. Vive separado del
// spec principal de PermissionService para no engordar ese archivo y para
// dejar claro que esto es SCOPING (qué ves), no autorización (qué puedes).

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PermissionService } from './permission.service';
import { ROLE_IDS } from '../constants/permissions';

describe('PermissionService.bypassesComponentScope', () => {
  let service: PermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PermissionService);
  });

  it('admin (3) -> true', () => {
    expect(service.bypassesComponentScope(ROLE_IDS.ADMIN)).toBe(true);
  });

  it('monitor (4) -> true', () => {
    expect(service.bypassesComponentScope(ROLE_IDS.MONITOR)).toBe(true);
  });

  it('editor (2) -> false', () => {
    expect(service.bypassesComponentScope(ROLE_IDS.EDITOR)).toBe(false);
  });

  it('viewer (1) -> false', () => {
    expect(service.bypassesComponentScope(ROLE_IDS.VIEWER)).toBe(false);
  });

  it('null -> false', () => {
    expect(service.bypassesComponentScope(null)).toBe(false);
  });

  it('undefined -> false', () => {
    expect(service.bypassesComponentScope(undefined)).toBe(false);
  });

  it('roleId desconocido (99) -> false', () => {
    expect(service.bypassesComponentScope(99)).toBe(false);
  });
});
