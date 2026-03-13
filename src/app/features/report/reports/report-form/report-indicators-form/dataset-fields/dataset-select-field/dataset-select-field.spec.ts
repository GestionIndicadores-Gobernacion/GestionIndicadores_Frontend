import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetSelectField } from './dataset-select-field';

describe('DatasetSelectField', () => {
  let component: DatasetSelectField;
  let fixture: ComponentFixture<DatasetSelectField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatasetSelectField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatasetSelectField);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
