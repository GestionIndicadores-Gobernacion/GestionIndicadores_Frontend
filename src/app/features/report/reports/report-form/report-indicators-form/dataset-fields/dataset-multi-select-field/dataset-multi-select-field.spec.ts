import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetMultiSelectField } from './dataset-multi-select-field';

describe('DatasetMultiSelectField', () => {
  let component: DatasetMultiSelectField;
  let fixture: ComponentFixture<DatasetMultiSelectField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatasetMultiSelectField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatasetMultiSelectField);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
