import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsKpiCardsComponent } from './reports-kpi-cards';

describe('ReportsKpiCardsComponent', () => {
  let component: ReportsKpiCardsComponent;
  let fixture: ComponentFixture<ReportsKpiCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsKpiCardsComponent],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsKpiCardsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
