import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponenteIndicatorsFormComponent } from './componente-indicators-form';

describe('ComponenteIndicatorsFormComponent', () => {
  let component: ComponenteIndicatorsFormComponent;
  let fixture: ComponentFixture<ComponenteIndicatorsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponenteIndicatorsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponenteIndicatorsFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
