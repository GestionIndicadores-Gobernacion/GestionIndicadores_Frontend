import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TablesList } from './tables-list';

describe('TablesList', () => {
  let component: TablesList;
  let fixture: ComponentFixture<TablesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TablesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
