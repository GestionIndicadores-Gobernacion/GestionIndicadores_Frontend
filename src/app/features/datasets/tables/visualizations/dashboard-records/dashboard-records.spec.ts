import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardRecords } from './dashboard-records';

describe('DashboardRecords', () => {
  let component: DashboardRecords;
  let fixture: ComponentFixture<DashboardRecords>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardRecords]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardRecords);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
