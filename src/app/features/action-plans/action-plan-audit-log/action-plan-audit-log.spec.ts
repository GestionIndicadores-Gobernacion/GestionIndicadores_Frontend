import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPlanAuditLog } from './action-plan-audit-log';

describe('ActionPlanAuditLog', () => {
  let component: ActionPlanAuditLog;
  let fixture: ComponentFixture<ActionPlanAuditLog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPlanAuditLog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPlanAuditLog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
