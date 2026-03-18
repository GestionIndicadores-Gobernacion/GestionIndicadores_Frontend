import { TestBed } from '@angular/core/testing';

import { PublicPoliciesService } from './public-policies.service';

describe('PublicPoliciesService', () => {
  let service: PublicPoliciesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PublicPoliciesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
