import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBar } from './dashboard-bar';

describe('DashboardBar', () => {
  let component: DashboardBar;
  let fixture: ComponentFixture<DashboardBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
