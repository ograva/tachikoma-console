import { UserProfileModel } from './user-profile.model';

/**
 * DAT-302 (A7, STABILISATION_TRIAGE.md): a user profile never carries `null`
 * toward Firestore; a missing photo is the empty string.
 */
describe('UserProfileModel photoURL (DAT-302)', () => {
  it('defaults photoURL to an empty string, not null', () => {
    expect(UserProfileModel.DEFAULTS.photoURL).toBe('');
    expect(UserProfileModel.create('uid-1', 'major@section9.test').photoURL).toBe('');
    expect(UserProfileModel.create('uid-1', 'major@section9.test', 'Major', null).photoURL).toBe('');
    expect(UserProfileModel.createAnonymous().photoURL).toBe('');
  });

  it('keeps a real photo URL', () => {
    expect(UserProfileModel.create('uid-1', 'm@s9.test', 'Major', 'https://example.test/p.png').photoURL)
      .toBe('https://example.test/p.png');
  });

  it('normalizes a legacy null photoURL from Firestore to an empty string', () => {
    const profile = UserProfileModel.fromFirestore({ id: 'uid-1', email: 'm@s9.test', photoURL: null, createdAt: 1, updatedAt: 1 });
    expect(profile.photoURL).toBe('');
  });
});
