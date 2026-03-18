import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigShowIf } from './config-show-if';

describe('ConfigShowIf', () => {
  let component: ConfigShowIf;
  let fixture: ComponentFixture<ConfigShowIf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigShowIf]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigShowIf);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
