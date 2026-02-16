import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableForm } from './table-form';

describe('TableForm', () => {
  let component: TableForm;
  let fixture: ComponentFixture<TableForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
