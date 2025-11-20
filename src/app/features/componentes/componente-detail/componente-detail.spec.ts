import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponenteDetail } from './componente-detail';

describe('ComponenteDetail', () => {
  let component: ComponenteDetail;
  let fixture: ComponentFixture<ComponenteDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponenteDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponenteDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
