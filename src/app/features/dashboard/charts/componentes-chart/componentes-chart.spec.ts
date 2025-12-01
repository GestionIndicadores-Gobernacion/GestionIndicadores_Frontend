import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentesChart } from './componentes-chart';

describe('ComponentesChart', () => {
  let component: ComponentesChart;
  let fixture: ComponentFixture<ComponentesChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentesChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponentesChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
