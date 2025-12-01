import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstrategiasChart } from './estrategias-chart';

describe('EstrategiasChart', () => {
  let component: EstrategiasChart;
  let fixture: ComponentFixture<EstrategiasChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstrategiasChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstrategiasChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
