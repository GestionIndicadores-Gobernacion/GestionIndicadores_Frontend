import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { viewerGuardGuard } from './viewer-guard-guard';

describe('viewerGuardGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => viewerGuardGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
