import RunnerLogin from "./pages/RunnerLogin";
import RequireRunnerDni from "./components/RequireRunnerDni";
import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import CoachLogin from "./pages/CoachLogin";

// Coach
import Dashboard from "./pages/Dashboard";
import Runners from "./pages/Runners";
import Workouts from "./pages/Workouts";
import Attendance from "./pages/Attendance";
import Categories from "./pages/Categories";
import TrainingEvents from "./pages/TrainingEvents";
import Billing from "./pages/Billing";
import Documents from "./pages/Documents";

// Runner
import RunnerPlan from "./pages/RunnerPlan";
import RunnerEvent from "./pages/RunnerEvent";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* ✅ Login del runner (público) */}
      <Route path="/runner/login" element={<RunnerLogin />} />

      {/* ✅ Login del coach (público) */}
      <Route path="/coach-login" element={<CoachLogin />} />

      {/* COACH (protegido, con layout + menu coach) */}
      <Route
        path="/coach"
        element={
          <RequireAuth>
            <RequireRole role="coach">
              <Layout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="corredores" element={<Runners />} />
        <Route path="entrenamientos" element={<Workouts />} />
        <Route path="asistencia" element={<Attendance />} />
        <Route path="categorias" element={<Categories />} />
        <Route path="eventos-entrenamiento" element={<TrainingEvents />} />
        <Route path="cuotas" element={<Billing />} />
        <Route path="documentos" element={<Documents />} />
      </Route>

      {/* RUNNER (protegido) */}
      <Route
        path="/runner/plan"
        element={
          <RequireAuth>
            <RequireRole role="runner">
              <RequireRunnerDni>
                <RunnerPlan />
              </RequireRunnerDni>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/runner/event/:id"
        element={
          <RequireAuth>
            <RequireRole role="runner">
              <RequireRunnerDni>
                <RunnerEvent />
              </RequireRunnerDni>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


