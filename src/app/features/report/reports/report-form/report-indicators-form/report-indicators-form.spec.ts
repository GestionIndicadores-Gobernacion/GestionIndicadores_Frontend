import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportIndicatorsForm } from './report-indicators-form';

describe('ReportIndicatorsForm', () => {
  let component: ReportIndicatorsForm;
  let fixture: ComponentFixture<ReportIndicatorsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportIndicatorsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportIndicatorsForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
