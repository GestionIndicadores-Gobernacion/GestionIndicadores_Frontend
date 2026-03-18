import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardHistogram } from './dashboard-histogram';

describe('DashboardHistogram', () => {
  let component: DashboardHistogram;
  let fixture: ComponentFixture<DashboardHistogram>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardHistogram]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardHistogram);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
