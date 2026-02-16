import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordsForm } from './records-form';

describe('RecordsForm', () => {
  let component: RecordsForm;
  let fixture: ComponentFixture<RecordsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordsForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
