import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SumGroupField } from './sum-group-field';

describe('SumGroupField', () => {
  let component: SumGroupField;
  let fixture: ComponentFixture<SumGroupField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SumGroupField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SumGroupField);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
