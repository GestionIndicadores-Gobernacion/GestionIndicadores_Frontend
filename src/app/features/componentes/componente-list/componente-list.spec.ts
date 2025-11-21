import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentesListComponent } from './componente-list';

describe('ComponentesList', () => {
  let component: ComponentesListComponent;
  let fixture: ComponentFixture<ComponentesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentesListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponentesListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
