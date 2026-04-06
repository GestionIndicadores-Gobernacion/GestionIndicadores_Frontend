import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanEditPlanModal } from './action-plan-edit-plan-modal';

describe('ActionPlanEditPlanModal', () => {
  let component: ActionPlanEditPlanModal;
  let fixture: ComponentFixture<ActionPlanEditPlanModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanEditPlanModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanEditPlanModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
