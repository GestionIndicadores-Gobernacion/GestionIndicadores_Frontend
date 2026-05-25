import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanDirective } from './can';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';
import { PERMS, ROLE_IDS } from '../../core/constants/permissions';

@Component({
  standalone: true,
  imports: [CanDirective],
  template: `
    <div *appCan="codes; mode: mode; fallbackRole: fallbackRole">
      <span class="content">visible</span>
    </div>
  `,
})
class HostComponent {
  codes: any = null;
  mode: 'any' | 'all' = 'any';
  fallbackRole: any = null;
}

function makePermissionMock() {
  const set = signal<ReadonlySet<string>>(new Set());
  const versionTick = signal(0);

  const bump = (next: Iterable<string>) => {
    set.set(new Set(next));
    versionTick.update(v => v + 1);
  };

  return {
    _set: set,
    setAll(codes: Iterable<string>) { bump(codes); },
    clear() { bump([]); },
    snapshot() { return set(); },
    version: () => versionTick(),
    hasPermission(code: string) { return set().has(code); },
    hasAny(...codes: string[]) {
      if (codes.length === 0) return true;
      const s = set();
      for (const c of codes) if (s.has(c)) return true;
      return false;
    },
    hasAll(...codes: string[]) {
      if (codes.length === 0) return true;
      const s = set();
      for (const c of codes) if (!s.has(c)) return false;
      return true;
    },
  };
}

function makeAuthMock(roleId: number | null = null) {
  return {
    _roleId: roleId,
    getTokenPayload() {
      return this._roleId == null ? null : { role_id: this._roleId };
    },
  };
}

describe('CanDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let perms: ReturnType<typeof makePermissionMock>;
  let auth: ReturnType<typeof makeAuthMock>;

  function setup(initialPerms: string[] = [], roleId: number | null = null) {
    perms = makePermissionMock();
    perms.setAll(initialPerms);
    auth = makeAuthMock(roleId);

    TestBed.configureTestingModule({
      imports: [HostComponent, CanDirective],
      providers: [
        { provide: PermissionService, useValue: perms },
        { provide: AuthService, useValue: auth },
      ],
    });

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  }

  function isRendered(): boolean {
    return !!fixture.nativeElement.querySelector('.content');
  }

  it('renders when codes is null', () => {
    setup([]);
    host.codes = null;
    fixture.detectChanges();
    expect(isRendered()).toBe(true);
  });

  it('renders when codes is an empty array', () => {
    setup([]);
    host.codes = [];
    fixture.detectChanges();
    expect(isRendered()).toBe(true);
  });

  it('renders when user has the single required permission', () => {
    setup([PERMS.DATASETS_READ]);
    host.codes = PERMS.DATASETS_READ;
    fixture.detectChanges();
    expect(isRendered()).toBe(true);
  });

  it('does not render when user lacks the permission and no fallback role', () => {
    setup([]);
    host.codes = PERMS.DATASETS_READ;
    fixture.detectChanges();
    expect(isRendered()).toBe(false);
  });

  it('mode="all": does not render when user has only one of many', () => {
    setup([PERMS.DATASETS_READ]);
    host.codes = [PERMS.DATASETS_READ, PERMS.DATASETS_MANAGE];
    host.mode = 'all';
    fixture.detectChanges();
    expect(isRendered()).toBe(false);
  });

  it('mode="all": renders when user has every code', () => {
    setup([PERMS.DATASETS_READ, PERMS.DATASETS_MANAGE]);
    host.codes = [PERMS.DATASETS_READ, PERMS.DATASETS_MANAGE];
    host.mode = 'all';
    fixture.detectChanges();
    expect(isRendered()).toBe(true);
  });

  it('mode="any": renders when user has at least one code', () => {
    setup([PERMS.DATASETS_READ]);
    host.codes = [PERMS.DATASETS_READ, PERMS.DATASETS_MANAGE];
    host.mode = 'any';
    fixture.detectChanges();
    expect(isRendered()).toBe(true);
  });

  it('fallbackRole: renders when role_id matches even without permission', () => {
    setup([], ROLE_IDS.ADMIN);
    host.codes = PERMS.USERS_MANAGE;
    host.fallbackRole = ROLE_IDS.ADMIN;
    fixture.detectChanges();
    expect(isRendered()).toBe(true);
  });

  it('fallbackRole array: renders when role_id is in the list', () => {
    setup([], ROLE_IDS.EDITOR);
    host.codes = PERMS.DATASETS_MANAGE;
    host.fallbackRole = [ROLE_IDS.ADMIN, ROLE_IDS.EDITOR];
    fixture.detectChanges();
    expect(isRendered()).toBe(true);
  });

  it('fallbackRole: does not render when role_id does not match', () => {
    setup([], ROLE_IDS.VIEWER);
    host.codes = PERMS.USERS_MANAGE;
    host.fallbackRole = ROLE_IDS.ADMIN;
    fixture.detectChanges();
    expect(isRendered()).toBe(false);
  });

  it('fallbackRole: does not render when there is no token payload', () => {
    setup([], null);
    host.codes = PERMS.USERS_MANAGE;
    host.fallbackRole = ROLE_IDS.ADMIN;
    fixture.detectChanges();
    expect(isRendered()).toBe(false);
  });

  it('reacts when permissions are added at runtime', () => {
    setup([]);
    host.codes = PERMS.DATASETS_READ;
    fixture.detectChanges();
    expect(isRendered()).toBe(false);

    perms.setAll([PERMS.DATASETS_READ]);
    fixture.detectChanges();
    expect(isRendered()).toBe(true);
  });

  it('reacts when permissions are removed at runtime', () => {
    setup([PERMS.DATASETS_READ]);
    host.codes = PERMS.DATASETS_READ;
    fixture.detectChanges();
    expect(isRendered()).toBe(true);

    perms.clear();
    fixture.detectChanges();
    expect(isRendered()).toBe(false);
  });
});
