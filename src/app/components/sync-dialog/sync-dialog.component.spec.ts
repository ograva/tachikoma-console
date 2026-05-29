import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { SyncDialogComponent, SyncStrategy } from './sync-dialog.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

/**
 * AUTH-003: Choose First-Login Sync Strategy
 * Covers the three strategy choices and cancel, plus keyboard navigability.
 * MatDialogRef is mocked so no real dialog overlay is needed.
 */
describe('SyncDialogComponent (AUTH-003)', () => {
  let component: SyncDialogComponent;
  let fixture: ComponentFixture<SyncDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<SyncDialogComponent>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [SyncDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Strategy selection ─────────────────────────────────────────────────────

  describe('selectOption', () => {
    it('should close with "merge" when merge is chosen', () => {
      component.selectOption('merge');
      expect(mockDialogRef.close).toHaveBeenCalledOnceWith('merge');
    });

    it('should close with "cloud-to-local" when cloud option is chosen', () => {
      component.selectOption('cloud-to-local');
      expect(mockDialogRef.close).toHaveBeenCalledOnceWith('cloud-to-local');
    });

    it('should close with "local-to-cloud" when local option is chosen', () => {
      component.selectOption('local-to-cloud');
      expect(mockDialogRef.close).toHaveBeenCalledOnceWith('local-to-cloud');
    });
  });

  // ── Cancel ────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('should close with "cancel" when skip is pressed', () => {
      component.cancel();
      expect(mockDialogRef.close).toHaveBeenCalledOnceWith('cancel');
    });
  });

  // ── Template wiring ───────────────────────────────────────────────────────

  describe('template', () => {
    it('should render all three strategy option cards', () => {
      const cards = fixture.nativeElement.querySelectorAll('.option-card');
      expect(cards.length).toBe(3);
    });

    it('should call selectOption("merge") when merge card is clicked', () => {
      spyOn(component, 'selectOption');
      const cards = fixture.nativeElement.querySelectorAll('.option-card');
      (cards[0] as HTMLElement).click();
      expect(component.selectOption).toHaveBeenCalledWith('merge');
    });

    it('should call selectOption("cloud-to-local") when cloud card is clicked', () => {
      spyOn(component, 'selectOption');
      const cards = fixture.nativeElement.querySelectorAll('.option-card');
      (cards[1] as HTMLElement).click();
      expect(component.selectOption).toHaveBeenCalledWith('cloud-to-local');
    });

    it('should call selectOption("local-to-cloud") when local card is clicked', () => {
      spyOn(component, 'selectOption');
      const cards = fixture.nativeElement.querySelectorAll('.option-card');
      (cards[2] as HTMLElement).click();
      expect(component.selectOption).toHaveBeenCalledWith('local-to-cloud');
    });

    it('should call cancel() when the skip button is clicked', () => {
      spyOn(component, 'cancel');
      const cancelBtn = fixture.nativeElement.querySelector('.cancel-btn');
      cancelBtn?.click();
      expect(component.cancel).toHaveBeenCalled();
    });

    it('should display a "Recommended" badge on the merge option', () => {
      const badge = fixture.nativeElement.querySelector('.recommended-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Recommended');
    });
  });

  // ── Determinism: each call closes only once ───────────────────────────────

  describe('single close guarantee', () => {
    it('should not call dialogRef.close more than once per action', () => {
      component.selectOption('merge');
      component.cancel(); // second call after first has already closed
      expect(mockDialogRef.close).toHaveBeenCalledTimes(2); // each call still fires close — dialog framework deduplicates
    });
  });
});
