import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivitiesForm } from './activities-form';

describe('ActivitiesForm', () => {
  let component: ActivitiesForm;
  let fixture: ComponentFixture<ActivitiesForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivitiesForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivitiesForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
