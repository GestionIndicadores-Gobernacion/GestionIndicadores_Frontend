import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanDashboard } from './action-plan-dashboard';

describe('ActionPlanDashboard', () => {
  let component: ActionPlanDashboard;
  let fixture: ComponentFixture<ActionPlanDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
