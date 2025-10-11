import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Solar } from './solar';

describe('Solar', () => {
  let component: Solar;
  let fixture: ComponentFixture<Solar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Solar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Solar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
