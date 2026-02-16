import { RecordsFormComponent } from "./records-form/records-form";
import { RecordsListComponent } from "./records-list/records-list";

export const RECORDS_ROUTES = [
  {
    path: '',
    component: RecordsListComponent
  },
  {
    path: 'create',
    component: RecordsFormComponent
  },
  {
    path: ':id/edit',
    component: RecordsFormComponent
  }
];
