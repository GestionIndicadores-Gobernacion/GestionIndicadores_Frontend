import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanCalendarComponent } from './action-plan-calendar';

describe('ActionPlanCalendarComponent', () => {
  let component: ActionPlanCalendarComponent;
  let fixture: ComponentFixture<ActionPlanCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanCalendarComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ActionPlanCalendarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
