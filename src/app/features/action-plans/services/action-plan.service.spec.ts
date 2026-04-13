import { TestBed } from '@angular/core/testing';

import { ActionPlanService } from './action-plan.service';

describe('ActionPlanService', () => {
  let service: ActionPlanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActionPlanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
