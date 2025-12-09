import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndicadoresMensualesChart } from './indicadores-mensuales-chart';

describe('IndicadoresMensualesChart', () => {
  let component: IndicadoresMensualesChart;
  let fixture: ComponentFixture<IndicadoresMensualesChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndicadoresMensualesChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndicadoresMensualesChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
