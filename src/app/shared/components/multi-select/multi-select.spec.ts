import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiSelect } from './multi-select';

describe('MultiSelect', () => {
  let component: MultiSelect;
  let fixture: ComponentFixture<MultiSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiSelect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiSelect);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
