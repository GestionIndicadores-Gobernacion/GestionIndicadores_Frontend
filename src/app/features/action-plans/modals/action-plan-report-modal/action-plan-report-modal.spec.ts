import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanReportModalComponent } from './action-plan-report-modal';

describe('ActionPlanReportModalComponent', () => {
  let component: ActionPlanReportModalComponent;
  let fixture: ComponentFixture<ActionPlanReportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanReportModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanReportModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
