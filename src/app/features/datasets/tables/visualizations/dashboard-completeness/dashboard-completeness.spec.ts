import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardCompleteness } from './dashboard-completeness';

describe('DashboardCompleteness', () => {
  let component: DashboardCompleteness;
  let fixture: ComponentFixture<DashboardCompleteness>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCompleteness]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardCompleteness);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
