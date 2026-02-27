import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsAuditLog } from './reports-audit-log';

describe('ReportsAuditLog', () => {
  let component: ReportsAuditLog;
  let fixture: ComponentFixture<ReportsAuditLog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsAuditLog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsAuditLog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
