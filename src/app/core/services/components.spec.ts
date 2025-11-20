import { TestBed } from '@angular/core/testing';

import { Components } from './components';

describe('Components', () => {
  let service: Components;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Components);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
