import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { VerifyEmail } from '../pages/auth/VerifyEmail';
import { AdminContent } from '../pages/admin/AdminContent';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminLessons } from '../pages/admin/AdminLessons';
import { AdminMedia } from '../pages/admin/AdminMedia';
import { AdminNotifications } from '../pages/admin/AdminNotifications';
import { AdminPredictions } from '../pages/admin/AdminPredictions';
import { AdminRevenue } from '../pages/admin/AdminRevenue';
import { AdminUsers } from '../pages/admin/AdminUsers';
import { Dashboard } from '../pages/student/Dashboard';
import { Exams } from '../pages/student/Exams';
import { Lessons } from '../pages/student/Lessons';
import { PracticeRunner } from '../pages/student/PracticeRunner';
import { Predictions } from '../pages/student/Predictions';
import { Renewal } from '../pages/student/Renewal';
import { Settings } from '../pages/student/Settings';
import { SkillPartQuestions, SkillQuestionParts, SkillTestSets, Tests } from '../pages/student/Tests';
import { ProtectedRoute } from './ProtectedRoute';
import { SubscriptionGate } from './SubscriptionGate';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/register', element: <Register /> },
  { path: '/verify-email', element: <VerifyEmail /> },
  {
    element: <ProtectedRoute role="STUDENT" />,
    children: [{ path: '/app', element: <AppLayout />, children: [
      { index: true, element: <Dashboard /> },
      { path: 'lessons', element: <SubscriptionGate><Lessons /></SubscriptionGate> },
      { path: 'tests', element: <SubscriptionGate><Tests /></SubscriptionGate> },
      { path: 'tests/questions/:skillType', element: <SubscriptionGate><SkillQuestionParts /></SubscriptionGate> },
      { path: 'tests/questions/:skillType/part/:part', element: <SubscriptionGate><SkillPartQuestions /></SubscriptionGate> },
      { path: 'tests/sets/:skillType', element: <SubscriptionGate><SkillTestSets /></SubscriptionGate> },
      { path: 'exams', element: <SubscriptionGate><Exams /></SubscriptionGate> },
      { path: 'exams/:id', element: <SubscriptionGate><PracticeRunner /></SubscriptionGate> },
      { path: 'predictions', element: <SubscriptionGate><Predictions /></SubscriptionGate> },
      { path: 'tests/:id', element: <SubscriptionGate><PracticeRunner /></SubscriptionGate> },
      { path: 'renewal', element: <Renewal /> },
      { path: 'settings', element: <Settings /> }
    ] }]
  },
  {
    element: <ProtectedRoute role="ADMIN" />,
    children: [{ path: '/admin', element: <AppLayout />, children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'content', element: <AdminContent /> },
      { path: 'lessons', element: <AdminLessons /> },
      { path: 'predictions', element: <AdminPredictions /> },
      { path: 'revenue', element: <AdminRevenue /> },
      { path: 'notifications', element: <AdminNotifications /> },
      { path: 'media', element: <AdminMedia /> }
    ] }]
  }
]);
