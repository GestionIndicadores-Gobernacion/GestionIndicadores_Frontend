
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** GestionIndicadores_Frontend
- **Date:** 2026-05-23
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 User logs in and reaches the dashboard
- **Test Code:** [TC001_User_logs_in_and_reaches_the_dashboard.py](./TC001_User_logs_in_and_reaches_the_dashboard.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/3057ce90-fbc8-4d8a-8c9a-fc554df68838
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Admin creates a report from the reports list
- **Test Code:** [TC002_Admin_creates_a_report_from_the_reports_list.py](./TC002_Admin_creates_a_report_from_the_reports_list.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/55289522-2d8b-4e40-a695-edc3c1bf267c
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Access dashboard after login
- **Test Code:** [TC003_Access_dashboard_after_login.py](./TC003_Access_dashboard_after_login.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/ee84c5a7-6939-4d8b-a553-1bf44ddd6aa3
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Import a dataset with preview confirmation
- **Test Code:** [TC004_Import_a_dataset_with_preview_confirmation.py](./TC004_Import_a_dataset_with_preview_confirmation.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/2f9b8e8e-88b9-40c4-ba37-99db868ed74c
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Create a user
- **Test Code:** [TC005_Create_a_user.py](./TC005_Create_a_user.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/a28d8a79-033e-4a07-8ed8-3eba7f17ad11
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Create a strategy
- **Test Code:** [TC006_Create_a_strategy.py](./TC006_Create_a_strategy.py)
- **Test Error:** TEST BLOCKED

The admin login could not be completed — the UI prevented reaching the authenticated area required to continue the test.

Observations:
- After submitting the login form, a toast alert showed 'Credenciales incorrectas'.
- The page remained on /auth/login with email and password fields visible, so access to admin-only routes (e.g., /reports/strategies) was not possible.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/d4a5a973-74b3-4f35-90cf-4c0f2d6ff133
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Admin edits an existing report
- **Test Code:** [TC007_Admin_edits_an_existing_report.py](./TC007_Admin_edits_an_existing_report.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/192a4b50-d0a9-49f6-837f-110f62d7099d
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Report activity progress with evidence
- **Test Code:** [TC008_Report_activity_progress_with_evidence.py](./TC008_Report_activity_progress_with_evidence.py)
- **Test Error:** TEST BLOCKED

The test could not be run — authentication failed for the available test accounts.

Observations:
- The application displayed a 'Credenciales incorrectas' toast after login attempts.
- Login attempts were made with admin@gobernacion.gov.co (2 attempts) and editor@gobernacion.gov.co (1 attempt); all were rejected.
- Without a successful login, the action-plans calendar and reporting flows cannot be accessed, so the required steps (open calendar, select activity, report progress, attach evidence, save, verify) cannot be performed.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/04c27858-e4e4-4eb7-a050-7f2c1e76d33f
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Crear un usuario nuevo
- **Test Code:** [TC009_Crear_un_usuario_nuevo.py](./TC009_Crear_un_usuario_nuevo.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/ba1822ee-f071-4c32-af53-450150ee69a7
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Update an existing dataset
- **Test Code:** [TC010_Update_an_existing_dataset.py](./TC010_Update_an_existing_dataset.py)
- **Test Error:** TEST BLOCKED

The update flow could not be completed because a valid Excel file is required and the test environment cannot provide one.

Observations:
- The UI showed a modal with text 'Error' and 'Error actualizando el dataset' after uploading replacement.csv and clicking 'Actualizar'.
- The file input accepts only .xlsx and .xls; a CSV was uploaded (replacement.csv) and was rejected/failed server-side. The agent environment cannot create or upload a genuine .xlsx/.xls file, preventing completion of the preview/confirm/refresh steps.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/f4d832ac-5fec-4797-a7d9-76ead4e4abce
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Admin reviews dashboard KPIs and map data
- **Test Code:** [TC011_Admin_reviews_dashboard_KPIs_and_map_data.py](./TC011_Admin_reviews_dashboard_KPIs_and_map_data.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the application rejected the provided admin credentials and the dashboard could not be reached.

Observations:
- A toast/alert with text 'Credenciales incorrectas' was displayed after submitting credentials.
- Two login attempts were made using admin@gobernacion.gov.co and the provided password (Enter submission and clicking 'Iniciar sesión'); both attempts were rejected.
- No alternate admin access or recovery option is available on the login UI to continue the test.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/d4315c04-28f5-4213-a519-adee030c96fb
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Create a plan from the activity calendar
- **Test Code:** [TC012_Create_a_plan_from_the_activity_calendar.py](./TC012_Create_a_plan_from_the_activity_calendar.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/4efe5daa-0b06-43d3-ae52-6cd3f58330ef
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Admin creates a report from an activity context
- **Test Code:** [TC013_Admin_creates_a_report_from_an_activity_context.py](./TC013_Admin_creates_a_report_from_an_activity_context.py)
- **Test Error:** TEST FAILURE

The report detail page was reached and the saved data is present, but the requirement that the admin start the new report FROM an activity context could not be verified.

Observations:
- The report detail page for ID #539 is displayed and contains: 'Componente Promotores PYBA', indicator 'PERSONAS CAPACITADAS' with value 30, and 'Temáticas implementadas' = 1 (visible on /reports/539 and in the screenshot).
- The report was created using the Reports → Nuevo reporte flow (the Asistencias activity card was clicked earlier but did not expose a create-report entrypoint), so there is no evidence the report originated from an activity context.

Because the test explicitly requires starting the report creation from an activity context and that step was not completed/verified, the overall task is marked as not successful.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/0a5a4021-0eb7-4cd5-b3d0-1629c9203e6e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Edit a strategy
- **Test Code:** [TC014_Edit_a_strategy.py](./TC014_Edit_a_strategy.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/5bcd75cd-1f8b-4fe9-973f-45d48226f03e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Editar un usuario existente
- **Test Code:** [TC015_Editar_un_usuario_existente.py](./TC015_Editar_un_usuario_existente.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f16ed8de-187b-4fed-892e-3e5e20a9c8c3/f5e29556-6f25-48c4-bc99-694069d9fe3b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **66.67** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---