import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanFilters } from './action-plan-filters';

describe('ActionPlanFilters', () => {
  let component: ActionPlanFilters;
  let fixture: ComponentFixture<ActionPlanFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanFilters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
