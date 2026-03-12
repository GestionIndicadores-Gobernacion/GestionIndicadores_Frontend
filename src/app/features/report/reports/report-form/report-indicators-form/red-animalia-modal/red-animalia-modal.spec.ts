import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RedAnimaliaModalComponent } from './red-animalia-modal';

describe('RedAnimaliaModal', () => {
  let component: RedAnimaliaModalComponent;
  let fixture: ComponentFixture<RedAnimaliaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RedAnimaliaModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RedAnimaliaModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
