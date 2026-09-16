import { Navigate, Route, Routes } from 'react-router';

import { AppShell } from '@/components/layout/app-shell';
import { HomePage } from '@/pages/home-page';

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}

export default App;
