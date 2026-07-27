import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import AuthPage from "./pages/AuthPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherSubject from "./pages/TeacherSubject";
import TeacherLiveSession from "./pages/TeacherLiveSession";
import TeacherSessionReport from "./pages/TeacherSessionReport";
import TeacherAttendanceReport from "./pages/TeacherAttendanceReport";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSubject from "./pages/StudentSubject";
import AttendPage from "./pages/AttendPage";
import HodDashboard from "./pages/HodDashboard";
import HodSubjectReport from "./pages/HodSubjectReport";
import HodSubjectSessions from "./pages/HodSubjectSessions";
import HodSessionEdit from "./pages/HodSessionEdit";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import PrincipalDepartment from "./pages/PrincipalDepartment";
import PrincipalSubjectReport from "./pages/PrincipalSubjectReport";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />

      <Route path="/attend" element={<AttendPage />} />

      <Route
        path="/teacher"
        element={
          <ProtectedRoute role="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/subjects/:id"
        element={
          <ProtectedRoute role="teacher">
            <TeacherSubject />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/sessions/:id"
        element={
          <ProtectedRoute role="teacher">
            <TeacherLiveSession />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/sessions/:id/report"
        element={
          <ProtectedRoute role="teacher">
            <TeacherSessionReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/subjects/:id/report"
        element={
          <ProtectedRoute role="teacher">
            <TeacherAttendanceReport />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/subjects/:id"
        element={
          <ProtectedRoute role="student">
            <StudentSubject />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hod"
        element={
          <ProtectedRoute role="hod">
            <HodDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hod/subjects/:id/report"
        element={
          <ProtectedRoute role="hod">
            <HodSubjectReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hod/subjects/:id/sessions"
        element={
          <ProtectedRoute role="hod">
            <HodSubjectSessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hod/sessions/:id"
        element={
          <ProtectedRoute role="hod">
            <HodSessionEdit />
          </ProtectedRoute>
        }
      />

      <Route
        path="/principal"
        element={
          <ProtectedRoute role="principal">
            <PrincipalDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/principal/departments/:id"
        element={
          <ProtectedRoute role="principal">
            <PrincipalDepartment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/principal/departments/:deptId/subjects/:subjectId/report"
        element={
          <ProtectedRoute role="principal">
            <PrincipalSubjectReport />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          user ? (
            <Navigate
              to={
                { teacher: "/teacher", student: "/student", hod: "/hod", principal: "/principal" }[
                  user.role
                ] || "/login"
              }
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
