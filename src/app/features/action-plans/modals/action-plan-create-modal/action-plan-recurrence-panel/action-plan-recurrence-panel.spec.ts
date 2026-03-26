import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanRecurrencePanel } from './action-plan-recurrence-panel';

describe('ActionPlanRecurrencePanel', () => {
  let component: ActionPlanRecurrencePanel;
  let fixture: ComponentFixture<ActionPlanRecurrencePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanRecurrencePanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanRecurrencePanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
