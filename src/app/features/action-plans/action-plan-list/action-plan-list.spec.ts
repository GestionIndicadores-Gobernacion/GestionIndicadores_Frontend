import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanList } from './action-plan-list';

describe('ActionPlanList', () => {
  let component: ActionPlanList;
  let fixture: ComponentFixture<ActionPlanList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
