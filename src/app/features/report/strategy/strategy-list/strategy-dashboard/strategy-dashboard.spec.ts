import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StrategyDashboard } from './strategy-dashboard';

describe('StrategyDashboard', () => {
  let component: StrategyDashboard;
  let fixture: ComponentFixture<StrategyDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StrategyDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
