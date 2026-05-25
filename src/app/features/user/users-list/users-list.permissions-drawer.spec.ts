// Tests específicos de la integración del drawer "Ver permisos" en el
// listado de usuarios. Vive en un archivo aparte para no engordar
// `users-list.spec.ts` ni modificar `users-list.is-main-admin.spec.ts`.
//
// Estrategia: instanciar el componente vía `Object.create` (igual que el
// spec de isMainAdmin existente) cuando sólo testeamos métodos puros,
// y vía TestBed con stubs cuando necesitamos disparar el ciclo de vida.

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { UsersListComponent } from './users-list';
import { UserModel } from '../models/user.model';
import { UsersService } from '../services/users.service';
import { UserPermissionsService } from '../services/user-permissions.service';
import { ToastService } from '../../../core/services/toast.service';

function makeUser(overrides: Partial<UserModel> = {}): UserModel {
  return {
    id: 7,
    first_name: 'Ana',
    last_name: 'Pérez',
    email: 'ana@x.co',
    is_active: true,
    created_at: '',
    updated_at: '',
    role: { id: 2, name: 'editor' },
    ...overrides,
  } as UserModel;
}

describe('UsersListComponent.openPermissionsDrawer / closePermissionsDrawer', () => {
  // Métodos puros sobre signals: usamos Object.create para no arrastrar el
  // ciclo de vida ni dependencias inyectadas. Las signals se inicializan
  // en el constructor de la clase, así que instanciamos vía `new` dentro
  // de un injection context vacío y obviamos ngOnInit.

  function buildBare(): UsersListComponent {
    // Las signals se crean como propiedades de instancia con `signal(...)`.
    // Necesitamos un constructor real (no `Object.create`) para que esos
    // initializers corran. Stubeamos las deps que pide el constructor.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: UsersService, useValue: { getAll: () => of([]) } },
        { provide: ToastService, useValue: { error: () => {}, confirm: () => Promise.resolve({ isConfirmed: false }), success: () => {} } },
      ],
    });
    return TestBed.runInInjectionContext(() => new UsersListComponent(
      TestBed.inject(UsersService),
      { navigate: () => Promise.resolve(true) } as any,
      TestBed.inject(ToastService),
      { markForCheck: () => {} } as any,
    ));
  }

  it('openPermissionsDrawer setea drawerUserId y drawerUserName', () => {
    const c = buildBare();
    c.openPermissionsDrawer(makeUser({ id: 9, first_name: 'Juan', last_name: 'López' }));
    expect(c.drawerUserId()).toBe(9);
    expect(c.drawerUserName()).toBe('Juan López');
  });

  it('openPermissionsDrawer concatena first_name + last_name (trim)', () => {
    const c = buildBare();
    c.openPermissionsDrawer(makeUser({ first_name: 'Juan', last_name: '  ' }));
    // Con last_name solo espacios, el concat con trim deja "Juan".
    expect(c.drawerUserName()).toBe('Juan');
  });

  it('closePermissionsDrawer resetea drawerUserId y drawerUserName', () => {
    const c = buildBare();
    c.openPermissionsDrawer(makeUser({ id: 9, first_name: 'X', last_name: 'Y' }));
    expect(c.drawerUserId()).toBe(9);
    c.closePermissionsDrawer();
    expect(c.drawerUserId()).toBeNull();
    expect(c.drawerUserName()).toBe('');
  });

  it('estado inicial: drawerUserId=null, drawerUserName=""', () => {
    const c = buildBare();
    expect(c.drawerUserId()).toBeNull();
    expect(c.drawerUserName()).toBe('');
  });

  it('abrir dos veces con users distintos refleja el último seleccionado', () => {
    const c = buildBare();
    c.openPermissionsDrawer(makeUser({ id: 1, first_name: 'A', last_name: 'X' }));
    c.openPermissionsDrawer(makeUser({ id: 2, first_name: 'B', last_name: 'Y' }));
    expect(c.drawerUserId()).toBe(2);
    expect(c.drawerUserName()).toBe('B Y');
  });
});

describe('UsersListComponent - performance: no precarga permisos', () => {
  it('al instanciar el componente, UserPermissionsService NO es llamado', () => {
    // Spy sobre los métodos del service. Como el componente NO inyecta
    // UserPermissionsService directamente (lo hace el drawer hijo, y el
    // drawer hace fetch lazy), esperamos cero llamadas durante construcción.
    const svc = {
      getEffectivePermissions: vi.fn(),
      getOverrides: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: UsersService, useValue: { getAll: () => of([]) } },
        { provide: ToastService, useValue: { error: () => {}, confirm: () => Promise.resolve({ isConfirmed: false }), success: () => {} } },
        { provide: UserPermissionsService, useValue: svc },
      ],
    });

    const c = TestBed.runInInjectionContext(() => new UsersListComponent(
      TestBed.inject(UsersService),
      { navigate: () => Promise.resolve(true) } as any,
      TestBed.inject(ToastService),
      { markForCheck: () => {} } as any,
    ));
    c.ngOnInit();

    expect(svc.getEffectivePermissions).not.toHaveBeenCalled();
    expect(svc.getOverrides).not.toHaveBeenCalled();
  });

  it('mientras el drawer no esté abierto (drawerUserId=null) no se llama al service', () => {
    const svc = {
      getEffectivePermissions: vi.fn(),
      getOverrides: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: UsersService, useValue: { getAll: () => of([
          { id: 1, first_name: 'A', last_name: 'B', email: 'a@b.co', is_active: true, created_at: '', updated_at: '' },
          { id: 2, first_name: 'C', last_name: 'D', email: 'c@d.co', is_active: true, created_at: '', updated_at: '' },
        ]) } },
        { provide: ToastService, useValue: { error: () => {}, confirm: () => Promise.resolve({ isConfirmed: false }), success: () => {} } },
        { provide: UserPermissionsService, useValue: svc },
      ],
    });

    const c = TestBed.runInInjectionContext(() => new UsersListComponent(
      TestBed.inject(UsersService),
      { navigate: () => Promise.resolve(true) } as any,
      TestBed.inject(ToastService),
      { markForCheck: () => {} } as any,
    ));
    c.ngOnInit();

    // El listado se cargó con 2 usuarios. Aún así, ningún fetch de permisos.
    expect(svc.getEffectivePermissions).not.toHaveBeenCalled();
    expect(svc.getOverrides).not.toHaveBeenCalled();
    expect(c.drawerUserId()).toBeNull();
  });
});
