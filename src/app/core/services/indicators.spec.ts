import { TestBed } from '@angular/core/testing';

import { Indicators } from './indicators';

describe('Indicators', () => {
  let service: Indicators;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Indicators);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
