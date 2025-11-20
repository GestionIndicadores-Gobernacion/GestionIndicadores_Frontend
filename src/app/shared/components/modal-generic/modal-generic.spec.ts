import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalGeneric } from './modal-generic';

describe('ModalGeneric', () => {
  let component: ModalGeneric;
  let fixture: ComponentFixture<ModalGeneric>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalGeneric]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalGeneric);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
