import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanCalendarNav } from './action-plan-calendar-nav';

describe('ActionPlanCalendarNav', () => {
  let component: ActionPlanCalendarNav;
  let fixture: ComponentFixture<ActionPlanCalendarNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanCalendarNav]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanCalendarNav);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
