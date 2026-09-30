import { Navigate, Route, Routes } from 'react-router';

import { GuestRoute } from '@/auth/guest-route';
import { ProtectedRoute } from '@/auth/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { ExercisePage } from '@/pages/exercise-page';
import { ClientLogPage } from '@/pages/client-log-page';
import { ClientWorkspace } from '@/pages/client-workspace';
import { ClientsPage } from '@/pages/clients-page';
import { CustomExercisePage } from '@/pages/custom-exercise-page';
import { HistoryPage } from '@/pages/history-page';
import { JoinPage } from '@/pages/join-page';
import { LoginPage } from '@/pages/login-page';
import { MuscleGroupPage } from '@/pages/muscle-group-page';
import { MuscleGroupsPage } from '@/pages/muscle-groups-page';
import { NutritionPage } from '@/pages/nutrition-page';
import { ProfilePage } from '@/pages/profile-page';
import { ProgramEditorPage } from '@/pages/program-editor-page';
import { ProgramsPage } from '@/pages/programs-page';
import { RegisterPage } from '@/pages/register-page';
import { ReportsPage } from '@/pages/reports-page';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate replace to="/app" />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<MuscleGroupsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="programs/new" element={<ProgramEditorPage />} />
          <Route path="programs/:id" element={<ProgramEditorPage />} />
          <Route path="nutrition" element={<NutritionPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="join/:code" element={<JoinPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:clientId" element={<ClientWorkspace />}>
            <Route index element={<ReportsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="log" element={<ClientLogPage />} />
            <Route
              path="exercises/custom/:slug"
              element={<ExercisePage isCustom />}
            />
            <Route path="exercises/:slug" element={<ExercisePage />} />
            <Route path="*" element={<Navigate replace to="." />} />
          </Route>
          <Route path="muscles/:slug" element={<MuscleGroupPage />} />
          <Route path="exercises/custom/new" element={<CustomExercisePage />} />
          <Route
            path="exercises/custom/:slug"
            element={<ExercisePage isCustom />}
          />
          <Route path="exercises/:slug" element={<ExercisePage />} />
          <Route path="*" element={<Navigate replace to="/app" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate replace to="/app" />} />
    </Routes>
  );
}

export default App;
