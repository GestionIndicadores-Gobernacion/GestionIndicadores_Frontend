import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsExplorerChartComponent } from './reports-explorer-chart';

describe('ReportsExplorerChartComponent', () => {
  let component: ReportsExplorerChartComponent;
  let fixture: ComponentFixture<ReportsExplorerChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsExplorerChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsExplorerChartComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
