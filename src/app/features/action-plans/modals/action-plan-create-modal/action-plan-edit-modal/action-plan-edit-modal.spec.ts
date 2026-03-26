import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanEditModal } from './action-plan-edit-modal';

describe('ActionPlanEditModal', () => {
  let component: ActionPlanEditModal;
  let fixture: ComponentFixture<ActionPlanEditModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanEditModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanEditModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
