import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordsList } from './records-list';

describe('RecordsList', () => {
  let component: RecordsList;
  let fixture: ComponentFixture<RecordsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
