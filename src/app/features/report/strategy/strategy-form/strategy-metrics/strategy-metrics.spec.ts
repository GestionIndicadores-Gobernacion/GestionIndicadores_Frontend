import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StrategyMetricsComponent } from './strategy-metrics';

describe('StrategyMetrics', () => {
  let component: StrategyMetricsComponent;
  let fixture: ComponentFixture<StrategyMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyMetricsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StrategyMetricsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
