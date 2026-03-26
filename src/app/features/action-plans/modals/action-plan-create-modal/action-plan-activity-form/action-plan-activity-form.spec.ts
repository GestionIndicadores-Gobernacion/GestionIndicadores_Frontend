import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanActivityForm } from './action-plan-activity-form';

describe('ActionPlanActivityForm', () => {
  let component: ActionPlanActivityForm;
  let fixture: ComponentFixture<ActionPlanActivityForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanActivityForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanActivityForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
