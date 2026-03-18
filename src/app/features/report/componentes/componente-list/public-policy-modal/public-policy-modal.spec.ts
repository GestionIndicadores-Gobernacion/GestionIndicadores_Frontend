import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicPolicyModal } from './public-policy-modal';

describe('PublicPolicyModal', () => {
  let component: PublicPolicyModal;
  let fixture: ComponentFixture<PublicPolicyModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicPolicyModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicPolicyModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
