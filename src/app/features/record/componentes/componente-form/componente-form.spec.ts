import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponenteForm } from './componente-form';

describe('ComponenteForm', () => {
  let component: ComponenteForm;
  let fixture: ComponentFixture<ComponenteForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponenteForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponenteForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
