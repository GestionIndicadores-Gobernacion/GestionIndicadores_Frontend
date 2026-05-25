import { UserFormComponent } from './user-form';

function makeComponent(opts: {
  isEdit: boolean;
  loadedIsMainAdmin?: boolean;
  email?: string;
}): UserFormComponent {
  const c = Object.create(UserFormComponent.prototype) as any;
  c.isEdit = opts.isEdit;
  c.loadedIsMainAdmin = !!opts.loadedIsMainAdmin;
  c.form = { email: opts.email ?? '' };
  return c as UserFormComponent;
}

describe('UserFormComponent.isMainAdmin', () => {
  it('returns false when isEdit is false (no es modo edición)', () => {
    const c = makeComponent({ isEdit: false, loadedIsMainAdmin: true, email: 'admin@gobernacion.gov.co' });
    expect(c.isMainAdmin()).toBe(false);
  });

  it('returns true when isEdit y loadedIsMainAdmin true (cualquier email)', () => {
    const c = makeComponent({ isEdit: true, loadedIsMainAdmin: true, email: 'cualquier@x.co' });
    expect(c.isMainAdmin()).toBe(true);
  });

  it('fallback: true when loadedIsMainAdmin false y email canónico', () => {
    const c = makeComponent({ isEdit: true, loadedIsMainAdmin: false, email: 'admin@gobernacion.gov.co' });
    expect(c.isMainAdmin()).toBe(true);
  });

  it('fallback: false when loadedIsMainAdmin false y email distinto', () => {
    const c = makeComponent({ isEdit: true, loadedIsMainAdmin: false, email: 'otro@x.co' });
    expect(c.isMainAdmin()).toBe(false);
  });

  it('fallback: loadedIsMainAdmin undefined coerce a false; email canónico → true', () => {
    const raw = Object.create(UserFormComponent.prototype) as any;
    raw.isEdit = true;
    raw.loadedIsMainAdmin = undefined;
    raw.form = { email: 'admin@gobernacion.gov.co' };
    expect((raw as UserFormComponent).isMainAdmin()).toBe(true);
  });
});
