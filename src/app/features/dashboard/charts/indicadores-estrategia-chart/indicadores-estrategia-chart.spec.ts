import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndicadoresEstrategiaChart } from './indicadores-estrategia-chart';

describe('IndicadoresEstrategiaChart', () => {
  let component: IndicadoresEstrategiaChart;
  let fixture: ComponentFixture<IndicadoresEstrategiaChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndicadoresEstrategiaChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndicadoresEstrategiaChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
