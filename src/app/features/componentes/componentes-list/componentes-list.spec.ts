import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentesList } from './componentes-list';

describe('ComponentesList', () => {
  let component: ComponentesList;
  let fixture: ComponentFixture<ComponentesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponentesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
