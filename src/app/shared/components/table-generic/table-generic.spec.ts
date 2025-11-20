import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableGeneric } from './table-generic';

describe('TableGeneric', () => {
  let component: TableGeneric;
  let fixture: ComponentFixture<TableGeneric>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableGeneric]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableGeneric);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
