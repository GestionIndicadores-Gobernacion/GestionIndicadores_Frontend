import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { of, throwError } from 'rxjs';

import { RolesListComponent } from './roles-list';
import { AdminRbacService } from '../services/admin-rbac.service';
import { RoleDetail } from '../models/admin.model';
import { LUCIDE_ICON_SET } from '../../../shared/icons/lucide-icons';

// ─── Mocks ─────────────────────────────────────────────────────────

function makeAdminMock(roles: RoleDetail[]) {
  return {
    _roles: roles,
    getRoles: () => of(roles),
    getRolePermissions: () => of({ role: roles[0], permissions: [] }),
    getPermissionsCatalog: () => of([]),
    resetCatalogCache: () => undefined,
  };
}

const SEED_ROLES: RoleDetail[] = [
  { id: 1, name: 'viewer',  description: 'Solo lectura', is_system: true, permission_count: 5,  user_count: 2 },
  { id: 2, name: 'editor',  description: 'Edición',     is_system: true, permission_count: 12, user_count: 4 },
  { id: 3, name: 'admin',   description: 'Administración global', is_system: true, permission_count: 30, user_count: 1 },
  { id: 4, name: 'monitor', description: 'Monitoreo',   is_system: true, permission_count: 25, user_count: 1 },
];

function setup(rolesOrError: RoleDetail[] | 'error' = SEED_ROLES): {
  fixture: ComponentFixture<RolesListComponent>;
  component: RolesListComponent;
} {
  let adminMock: any;
  if (rolesOrError === 'error') {
    adminMock = {
      getRoles: () => throwError(() => new Error('boom')),
      getRolePermissions: () => of(null as any),
      getPermissionsCatalog: () => of([]),
      resetCatalogCache: () => undefined,
    };
  } else {
    adminMock = makeAdminMock(rolesOrError);
  }

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RolesListComponent],
    providers: [
      provideRouter([]),
      { provide: AdminRbacService, useValue: adminMock },
      {
        provide: LUCIDE_ICONS,
        multi: true,
        useValue: new LucideIconProvider(LUCIDE_ICON_SET),
      },
    ],
  });

  const fixture = TestBed.createComponent(RolesListComponent);
  return { fixture, component: fixture.componentInstance };
}

describe('RolesListComponent', () => {

  it('se crea', () => {
    const { component } = setup([]);
    expect(component).toBeTruthy();
  });

  it('renderiza una fila por rol', () => {
    const { fixture } = setup(SEED_ROLES);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr[data-role-id]');
    expect(rows.length).toBe(SEED_ROLES.length);
  });

  it('marca data-role-id correctamente en cada fila', () => {
    const { fixture } = setup(SEED_ROLES);
    fixture.detectChanges();
    const rows = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr[data-role-id]'),
    ) as HTMLElement[];
    const ids = rows.map(r => Number(r.getAttribute('data-role-id')));
    expect(ids.sort()).toEqual([1, 2, 3, 4]);
  });

  it('aplica el badge naranja al rol admin', () => {
    const { fixture } = setup(SEED_ROLES);
    fixture.detectChanges();
    const html: string = fixture.nativeElement.innerHTML;
    // Hay 4 badges (uno por rol). El de admin lleva bg-orange-100.
    expect(html).toContain('bg-orange-100');
    expect(html).toContain('bg-blue-100');
    expect(html).toContain('bg-zinc-100');
    expect(html).toContain('bg-purple-100');
  });

  it('genera routerLink correcto al detalle de cada rol', () => {
    const { fixture } = setup(SEED_ROLES);
    fixture.detectChanges();
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a[href^="/admin/roles/"]'),
    ) as HTMLAnchorElement[];
    expect(links.length).toBe(SEED_ROLES.length);
    const hrefs = links.map(a => a.getAttribute('href')).sort();
    expect(hrefs).toEqual([
      '/admin/roles/1',
      '/admin/roles/2',
      '/admin/roles/3',
      '/admin/roles/4',
    ]);
  });

  it('muestra el banner de shadow mode', () => {
    const { fixture } = setup(SEED_ROLES);
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector(
      '[data-testid="shadow-mode-banner"]',
    );
    expect(banner).toBeTruthy();
  });

  it('estado empty cuando no hay roles', () => {
    const { fixture } = setup([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.pageState).toBe('empty');
  });

  it('estado error cuando getRoles falla', () => {
    const { component } = setup('error');
    // Llamada directa a ngOnInit: detectChanges activaría el template
    // de error de page-state, que usa un icono ("alert-triangle") no
    // mapeado en LUCIDE_ICON_SET (pre-existente, fuera de este stream).
    component.ngOnInit();
    expect(component.pageState).toBe('error');
    expect(component.loadError).toBe(true);
  });

  it('formatPermissionCount muestra "N / TOTAL" cuando hay contador', () => {
    const { component } = setup([]);
    const result = component.formatPermissionCount({ id: 1, name: 'x', permission_count: 12 });
    // Total es derivado de ALL_PERMISSION_CODES.length para no quedar
    // hardcoded — Stream C podría seguir extendiendo el catálogo.
    expect(result.startsWith('12 / ')).toBe(true);
    expect(result).toBe(`12 / ${component.TOTAL_PERMISSIONS}`);
  });

  it('formatPermissionCount muestra "-" cuando el backend no envía el contador', () => {
    const { component } = setup([]);
    expect(component.formatPermissionCount({ id: 1, name: 'x' }))
      .toBe('-');
  });

  it('formatUserCount muestra "-" cuando user_count es null', () => {
    const { component } = setup([]);
    expect(component.formatUserCount({ id: 1, name: 'x' })).toBe('-');
    expect(component.formatUserCount({ id: 1, name: 'x', user_count: 0 })).toBe('0');
    expect(component.formatUserCount({ id: 1, name: 'x', user_count: 7 })).toBe('7');
  });

  it('describe devuelve em-dash cuando no hay descripción', () => {
    const { component } = setup([]);
    expect(component.describe({ id: 1, name: 'x' })).toBe('—');
    expect(component.describe({ id: 1, name: 'x', description: '   ' })).toBe('—');
    expect(component.describe({ id: 1, name: 'x', description: 'Texto' })).toBe('Texto');
  });

  it('renderiza badge "Sistema" cuando is_system=true', () => {
    const { fixture } = setup(SEED_ROLES);
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent || '';
    // Hay 4 roles is_system=true → debería aparecer al menos una vez
    expect(text).toContain('Sistema');
  });

  it('no rompe cuando backend devuelve roles sin permission_count (campo "-")', () => {
    const minimal: RoleDetail[] = [{ id: 1, name: 'viewer' }];
    const { fixture } = setup(minimal);
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent || '';
    expect(text).toContain('-');
  });
});
