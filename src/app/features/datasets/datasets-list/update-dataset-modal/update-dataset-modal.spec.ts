import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateDatasetModal } from './update-dataset-modal';

describe('UpdateDatasetModal', () => {
  let component: UpdateDatasetModal;
  let fixture: ComponentFixture<UpdateDatasetModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateDatasetModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateDatasetModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
