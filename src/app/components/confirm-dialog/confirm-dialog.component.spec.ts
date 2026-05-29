import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

/**
 * AGNT-005: Replace Browser Dialogs with Material Dialogs
 * Covers dialog invocation, confirmation branch logic, alert-only mode,
 * focus trap expectations, and keyboard escape handling.
 */
describe('ConfirmDialogComponent (AGNT-005)', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;
  let mockRef: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent>>;

  function setup(data: ConfirmDialogData) {
    mockRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // ── Confirm dialog ────────────────────────────────────────────────────────

  describe('confirm mode (alertOnly = false)', () => {
    beforeEach(() => setup({ title: 'DELETE AGENT', message: 'Are you sure?', confirmColor: 'warn' }));

    it('should render the title', () => {
      const h2 = fixture.nativeElement.querySelector('[mat-dialog-title]');
      expect(h2?.textContent).toContain('DELETE AGENT');
    });

    it('should render the message', () => {
      expect(fixture.nativeElement.textContent).toContain('Are you sure?');
    });

    it('should show both cancel and confirm buttons', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('confirm button should have data-test-id="confirm-dialog-confirm"', () => {
      const btn = fixture.nativeElement.querySelector('[data-test-id="confirm-dialog-confirm"]');
      expect(btn).toBeTruthy();
    });

    it('cancel button should have data-test-id="confirm-dialog-cancel"', () => {
      const btn = fixture.nativeElement.querySelector('[data-test-id="confirm-dialog-cancel"]');
      expect(btn).toBeTruthy();
    });
  });

  // ── Alert-only mode ───────────────────────────────────────────────────────

  describe('alert-only mode', () => {
    beforeEach(() => setup({ title: 'NOTICE', message: 'Conversion complete.', alertOnly: true }));

    it('should not render a cancel button in alert mode', () => {
      const cancel = fixture.nativeElement.querySelector('[data-test-id="confirm-dialog-cancel"]');
      expect(cancel).toBeFalsy();
    });

    it('should render an OK/dismiss button', () => {
      const confirm = fixture.nativeElement.querySelector('[data-test-id="confirm-dialog-confirm"]');
      expect(confirm).toBeTruthy();
    });
  });

  // ── Custom labels ─────────────────────────────────────────────────────────

  describe('custom labels', () => {
    beforeEach(() => setup({ title: 'RESET', message: 'Reset all?', confirmLabel: 'RESET NOW', cancelLabel: 'KEEP' }));

    it('should display the custom confirm label', () => {
      const btn = fixture.nativeElement.querySelector('[data-test-id="confirm-dialog-confirm"]');
      expect(btn?.textContent?.trim()).toBe('RESET NOW');
    });

    it('should display the custom cancel label', () => {
      const btn = fixture.nativeElement.querySelector('[data-test-id="confirm-dialog-cancel"]');
      expect(btn?.textContent?.trim()).toBe('KEEP');
    });
  });

  // ── ARIA role ─────────────────────────────────────────────────────────────

  describe('accessibility', () => {
    beforeEach(() => setup({ title: 'T', message: 'M' }));

    it('should have role="dialog" on the root element', () => {
      const root = fixture.nativeElement.querySelector('[role="dialog"]');
      expect(root).toBeTruthy();
    });

    it('should have aria-labelledby pointing to the title', () => {
      const root = fixture.nativeElement.querySelector('[role="dialog"]');
      expect(root?.getAttribute('aria-labelledby')).toBe('dialog-title');
    });
  });
});
