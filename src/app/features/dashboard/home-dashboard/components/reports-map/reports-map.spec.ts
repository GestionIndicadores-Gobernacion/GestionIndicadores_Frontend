import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsMap } from './reports-map';

describe('ReportsMap', () => {
  let component: ReportsMap;
  let fixture: ComponentFixture<ReportsMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
