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
import { AdminMockTests } from '../pages/admin/AdminMockTests';
import { AdminNotifications } from '../pages/admin/AdminNotifications';
import { AdminPredictions } from '../pages/admin/AdminPredictions';
import { AdminRevenue } from '../pages/admin/AdminRevenue';
import { AdminUsers } from '../pages/admin/AdminUsers';
import { Dashboard } from '../pages/student/Dashboard';
import { Contact } from '../pages/student/Contact';
import { Donate } from '../pages/student/Donate';
import { Exams } from '../pages/student/Exams';
import { Lessons } from '../pages/student/Lessons';
import { MockTests } from '../pages/student/MockTests';
import { PracticeRunner } from '../pages/student/PracticeRunner';
import { Predictions } from '../pages/student/Predictions';
import { Renewal } from '../pages/student/Renewal';
import { Settings } from '../pages/student/Settings';
import { SkillPartQuestions, SkillQuestionParts, SkillTestSets, Tests } from '../pages/student/Tests';
import { ProtectedRoute } from './ProtectedRoute';
import { SubscriptionGate } from './SubscriptionGate';

export const router = createBrowserRouter([
  { path: '/', element: <AppLayout />, children: [
    { index: true, element: <Dashboard /> }
  ] },
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/register', element: <Register /> },
  { path: '/verify-email', element: <VerifyEmail /> },
  { path: '/app', element: <AppLayout />, children: [
    { index: true, element: <Navigate to="/" replace /> },
    { path: 'lessons', element: <Lessons /> },
    { path: 'lessons/:skillType', element: <Lessons /> },
    { path: 'lessons/:skillType/:tipSlug', element: <Lessons /> },
    { path: 'tests', element: <Tests /> },
    { path: 'mock-tests', element: <MockTests /> },
    { path: 'exams', element: <Exams /> },
    { path: 'predictions', element: <Predictions /> },
    { path: 'renewal', element: <Renewal /> },
    { path: 'donate', element: <Donate /> },
    { path: 'contact', element: <Contact /> },
    {
      element: <ProtectedRoute role="STUDENT" />,
      children: [
        { path: 'tests/questions/:skillType', element: <SubscriptionGate><SkillQuestionParts /></SubscriptionGate> },
        { path: 'tests/questions/:skillType/part/:part', element: <SubscriptionGate><SkillPartQuestions /></SubscriptionGate> },
        { path: 'tests/sets/:skillType', element: <SubscriptionGate><SkillTestSets /></SubscriptionGate> },
        { path: 'exams/:id', element: <SubscriptionGate><PracticeRunner /></SubscriptionGate> },
        { path: 'tests/:id', element: <SubscriptionGate><PracticeRunner /></SubscriptionGate> },
        { path: 'settings', element: <Settings /> }
      ]
    }
  ] },
  {
    element: <ProtectedRoute role="ADMIN" />,
    children: [{ path: '/admin', element: <AppLayout />, children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'content', element: <AdminContent /> },
      { path: 'lessons', element: <AdminLessons /> },
      { path: 'mock-tests', element: <AdminMockTests /> },
      { path: 'predictions', element: <AdminPredictions /> },
      { path: 'revenue', element: <AdminRevenue /> },
      { path: 'notifications', element: <AdminNotifications /> },
      { path: 'media', element: <AdminMedia /> }
    ] }]
  }
]);
