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
import { ExamHistory } from '../pages/student/ExamHistory';
import { Leaderboard } from '../pages/student/Leaderboard';
import { Lessons } from '../pages/student/Lessons';
import { MockTests } from '../pages/student/MockTests';
import { PracticeRunner } from '../pages/student/PracticeRunner';
import { Predictions } from '../pages/student/Predictions';
import { Renewal } from '../pages/student/Renewal';
import { Settings } from '../pages/student/Settings';
import { SkillPartQuestions, SkillQuestionParts, TestPartMenu } from '../pages/student/Tests';
import { ProtectedRoute } from './ProtectedRoute';
import { SubscriptionGate } from './SubscriptionGate';

export const router = createBrowserRouter([
  { path: '/', element: <AppLayout />, children: [
    { index: true, element: <Dashboard /> },
    { path: 'leaderboard', element: <Leaderboard /> }
  ] },
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/register', element: <Register /> },
  { path: '/verify-email', element: <VerifyEmail /> },
  { path: '/app', element: <AppLayout />, children: [
    { index: true, element: <Navigate to="/" replace /> },
    { path: 'lessons', element: <Lessons /> },
    { path: 'leaderboard', element: <Leaderboard /> },
    { path: 'lessons/:skillType', element: <Lessons /> },
    { path: 'lessons/:skillType/:tipSlug', element: <Lessons /> },
    { path: 'tests', element: <Navigate to="/app/tests/parts" replace /> },
    { path: 'mock-tests', element: <MockTests /> },
    { path: 'history', element: <ProtectedRoute role="STUDENT" />, children: [
      { index: true, element: <ExamHistory /> }
    ] },
    { path: 'exams', element: <Navigate to="/app/mock-tests" replace /> },
    {
      path: 'predictions',
      element: (
        <SubscriptionGate
          requirePro
          proTitle="Cần nâng cấp để xem Key Dự Đoán"
          proDescription="Key Dự Đoán cập nhật hằng ngày dành cho tài khoản Pro. Nâng cấp để xem nội dung mới nhất."
        >
          <Predictions />
        </SubscriptionGate>
      )
    },
    { path: 'renewal', element: <Renewal /> },
    { path: 'donate', element: <Donate /> },
    { path: 'contact', element: <Contact /> },
    {
      element: <ProtectedRoute role="STUDENT" />,
      children: [
        {
          path: 'tests/questions/:skillType',
          element: (
            <SubscriptionGate
              requirePro
              proTitle="Cần nâng cấp để luyện theo part"
              proDescription="Luyện đề theo part là tính năng Pro. Nâng cấp tài khoản để mở khóa và luyện đầy đủ từng kỹ năng."
            >
              <SkillQuestionParts />
            </SubscriptionGate>
          )
        },
        {
          path: 'tests/questions/:skillType/part/:part',
          element: (
            <SubscriptionGate
              requirePro
              proTitle="Cần nâng cấp để luyện theo part"
              proDescription="Luyện đề theo part là tính năng Pro. Nâng cấp tài khoản để mở khóa và luyện đầy đủ từng kỹ năng."
            >
              <SkillPartQuestions />
            </SubscriptionGate>
          )
        },
        {
          path: 'tests/parts',
          element: (
            <SubscriptionGate
              requirePro
              proTitle="Cần nâng cấp để luyện theo part"
              proDescription="Luyện đề theo part là tính năng Pro. Nâng cấp tài khoản để mở khóa và luyện đầy đủ từng kỹ năng."
            >
              <TestPartMenu />
            </SubscriptionGate>
          )
        },
        { path: 'tests/sets', element: <Navigate to="/app/mock-tests" replace /> },
        { path: 'tests/sets/:skillType', element: <Navigate to="/app/mock-tests" replace /> },
        { path: 'exams/:id', element: <SubscriptionGate testAccess><PracticeRunner /></SubscriptionGate> },
        { path: 'tests/:id', element: <SubscriptionGate testAccess><PracticeRunner /></SubscriptionGate> },
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
