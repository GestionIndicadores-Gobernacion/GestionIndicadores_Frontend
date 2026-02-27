import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanCreateModalComponent } from './action-plan-create-modal';

describe('ActionPlanCreateModalComponent', () => {
  let component: ActionPlanCreateModalComponent;
  let fixture: ComponentFixture<ActionPlanCreateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanCreateModalComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ActionPlanCreateModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
