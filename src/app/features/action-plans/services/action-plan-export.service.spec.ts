import { TestBed } from '@angular/core/testing';

import { ActionPlanExportService } from './action-plan-export.service';

describe('ActionPlanExportService', () => {
  let service: ActionPlanExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActionPlanExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
