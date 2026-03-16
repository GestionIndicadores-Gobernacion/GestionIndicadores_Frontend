import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardDonut } from './dashboard-donut';

describe('DashboardDonut', () => {
  let component: DashboardDonut;
  let fixture: ComponentFixture<DashboardDonut>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardDonut]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardDonut);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
