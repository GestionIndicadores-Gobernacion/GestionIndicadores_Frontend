import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetForm } from './dataset-form';

describe('DatasetForm', () => {
  let component: DatasetForm;
  let fixture: ComponentFixture<DatasetForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatasetForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatasetForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
