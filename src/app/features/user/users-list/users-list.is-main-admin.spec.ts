import { UsersListComponent } from './users-list';
import { UserModel } from '../models/user.model';

function makeUser(overrides: Partial<UserModel> = {}): UserModel {
  return {
    id: 1,
    first_name: 'X',
    last_name: 'Y',
    email: 'x@y.co',
    is_active: true,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as UserModel;
}

describe('UsersListComponent.isMainAdmin', () => {
  const c = Object.create(UsersListComponent.prototype) as UsersListComponent;

  it('returns true when is_main_admin is true (independiente del email)', () => {
    const u = makeUser({ is_main_admin: true, email: 'cualquier@x.co' });
    expect(c.isMainAdmin(u)).toBe(true);
  });

  it('returns false when is_main_admin is false (independiente del email)', () => {
    const u = makeUser({ is_main_admin: false, email: 'admin@gobernacion.gov.co' });
    expect(c.isMainAdmin(u)).toBe(false);
  });

  it('fallback: returns true when flag undefined y email canónico', () => {
    const u = makeUser({ email: 'admin@gobernacion.gov.co' });
    expect(c.isMainAdmin(u)).toBe(true);
  });

  it('fallback: returns false when flag undefined y email distinto', () => {
    const u = makeUser({ email: 'otro@x.co' });
    expect(c.isMainAdmin(u)).toBe(false);
  });

  it('fallback: returns false when flag undefined y email faltante', () => {
    const u = makeUser({ email: '' });
    expect(c.isMainAdmin(u)).toBe(false);
  });
});
