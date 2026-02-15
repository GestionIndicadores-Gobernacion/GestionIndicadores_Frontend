import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsTable } from './reports-table';

describe('ReportsTable', () => {
  let component: ReportsTable;
  let fixture: ComponentFixture<ReportsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
