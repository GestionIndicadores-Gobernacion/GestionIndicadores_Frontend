import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectControl } from './select-control';

describe('SelectControl', () => {
  let component: SelectControl;
  let fixture: ComponentFixture<SelectControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectControl]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectControl);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
