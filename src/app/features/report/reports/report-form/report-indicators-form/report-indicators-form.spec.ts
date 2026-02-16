import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportIndicatorsFormComponent } from './report-indicators-form';

describe('ReportIndicatorsFormComponent', () => {
  let component: ReportIndicatorsFormComponent;
  let fixture: ComponentFixture<ReportIndicatorsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportIndicatorsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportIndicatorsFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
