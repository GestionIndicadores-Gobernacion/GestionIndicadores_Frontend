import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileAttachmentField } from './file-attachment-field';

describe('FileAttachmentField', () => {
  let component: FileAttachmentField;
  let fixture: ComponentFixture<FileAttachmentField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileAttachmentField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileAttachmentField);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
