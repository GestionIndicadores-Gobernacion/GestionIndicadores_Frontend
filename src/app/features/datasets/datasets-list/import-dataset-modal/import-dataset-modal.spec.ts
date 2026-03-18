import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportDatasetModal } from './import-dataset-modal';

describe('ImportDatasetModal', () => {
  let component: ImportDatasetModal;
  let fixture: ComponentFixture<ImportDatasetModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportDatasetModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportDatasetModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
