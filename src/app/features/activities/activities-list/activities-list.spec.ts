import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivitiesList } from './activities-list';

describe('ActivitiesList', () => {
  let component: ActivitiesList;
  let fixture: ComponentFixture<ActivitiesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivitiesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivitiesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
