import { Routes } from '@angular/router';
import { ResumenComponent } from './pages/resumen/resumen.component';
import { DespachosComponent } from './pages/despachos/despachos.component';
import { BuscadorComponent } from './pages/buscador/buscador.component';
import { FarmacologiaComponent } from './pages/farmacologia/farmacologia.component';
import { AlberguesComponent } from './pages/albergues/albergues.component';
import { VoluntariosComponent } from './pages/voluntarios/voluntarios.component';

export const SISMO_ROUTES: Routes = [
  { path: '', redirectTo: 'resumen', pathMatch: 'full' },
  { path: 'resumen', component: ResumenComponent },
  { path: 'despachos', component: DespachosComponent },
  { path: 'buscador', component: BuscadorComponent },
  { path: 'farmacologia', component: FarmacologiaComponent },
  { path: 'albergues', component: AlberguesComponent },
  { path: 'voluntarios', component: VoluntariosComponent }
];
