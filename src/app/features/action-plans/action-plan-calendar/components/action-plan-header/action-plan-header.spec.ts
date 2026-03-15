import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanHeader } from './action-plan-header';

describe('ActionPlanHeader', () => {
  let component: ActionPlanHeader;
  let fixture: ComponentFixture<ActionPlanHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
