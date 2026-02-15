import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsListComponent } from './reports-list';

describe('ReportsList', () => {
  let component: ReportsListComponent;
  let fixture: ComponentFixture<ReportsListComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsListComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ReportsListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
