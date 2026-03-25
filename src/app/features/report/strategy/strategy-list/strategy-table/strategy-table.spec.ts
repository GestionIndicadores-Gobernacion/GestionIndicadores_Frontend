import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StrategyTable } from './strategy-table';

describe('StrategyTable', () => {
  let component: StrategyTable;
  let fixture: ComponentFixture<StrategyTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StrategyTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
