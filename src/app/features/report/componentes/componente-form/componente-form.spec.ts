import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponenteFormComponent } from './componente-form';

describe('ComponenteFormComponent', () => {
  let component: ComponenteFormComponent;
  let fixture: ComponentFixture<ComponenteFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponenteFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponenteFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
