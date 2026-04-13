import { TestBed } from '@angular/core/testing';

import { ReportsKpiService } from './reports-kpi.service';

describe('ReportsKpiService', () => {
  let service: ReportsKpiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportsKpiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
