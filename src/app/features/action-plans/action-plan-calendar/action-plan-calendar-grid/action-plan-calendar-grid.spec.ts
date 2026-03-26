import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanCalendarGrid } from './action-plan-calendar-grid';

describe('ActionPlanCalendarGrid', () => {
  let component: ActionPlanCalendarGrid;
  let fixture: ComponentFixture<ActionPlanCalendarGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanCalendarGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanCalendarGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
