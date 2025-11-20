import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordForm } from './record-form';

describe('RecordForm', () => {
  let component: RecordForm;
  let fixture: ComponentFixture<RecordForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
