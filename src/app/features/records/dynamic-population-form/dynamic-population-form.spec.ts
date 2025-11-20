import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicPopulationForm } from './dynamic-population-form';

describe('DynamicPopulationForm', () => {
  let component: DynamicPopulationForm;
  let fixture: ComponentFixture<DynamicPopulationForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicPopulationForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicPopulationForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
