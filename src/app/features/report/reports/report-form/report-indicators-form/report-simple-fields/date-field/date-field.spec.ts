import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateField } from './date-field';

describe('DateField', () => {
  let component: DateField;
  let fixture: ComponentFixture<DateField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateField);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
