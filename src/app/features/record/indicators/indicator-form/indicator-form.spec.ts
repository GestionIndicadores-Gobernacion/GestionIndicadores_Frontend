import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndicatorForm } from './indicator-form';

describe('IndicatorForm', () => {
  let component: IndicatorForm;
  let fixture: ComponentFixture<IndicatorForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndicatorForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndicatorForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
