import { lazy } from 'react';
import { createBrowserRouter, Link, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword').then((module) => ({ default: module.ForgotPassword })));
const Login = lazy(() => import('../pages/auth/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('../pages/auth/Register').then((module) => ({ default: module.Register })));
const VerifyEmail = lazy(() => import('../pages/auth/VerifyEmail').then((module) => ({ default: module.VerifyEmail })));
const AdminContent = lazy(() => import('../pages/admin/AdminContent').then((module) => ({ default: module.AdminContent })));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const AdminLessons = lazy(() => import('../pages/admin/AdminLessons').then((module) => ({ default: module.AdminLessons })));
const AdminMedia = lazy(() => import('../pages/admin/AdminMedia').then((module) => ({ default: module.AdminMedia })));
const AdminMockTests = lazy(() => import('../pages/admin/AdminMockTests').then((module) => ({ default: module.AdminMockTests })));
const AdminNotifications = lazy(() => import('../pages/admin/AdminNotifications').then((module) => ({ default: module.AdminNotifications })));
const AdminPredictions = lazy(() => import('../pages/admin/AdminPredictions').then((module) => ({ default: module.AdminPredictions })));
const AdminRevenue = lazy(() => import('../pages/admin/AdminRevenue').then((module) => ({ default: module.AdminRevenue })));
const AdminUsers = lazy(() => import('../pages/admin/AdminUsers').then((module) => ({ default: module.AdminUsers })));
const Dashboard = lazy(() => import('../pages/student/Dashboard').then((module) => ({ default: module.Dashboard })));
const Contact = lazy(() => import('../pages/student/Contact').then((module) => ({ default: module.Contact })));
const Donate = lazy(() => import('../pages/student/Donate').then((module) => ({ default: module.Donate })));
const ExamHistory = lazy(() => import('../pages/student/ExamHistory').then((module) => ({ default: module.ExamHistory })));
const Leaderboard = lazy(() => import('../pages/student/Leaderboard').then((module) => ({ default: module.Leaderboard })));
const Lessons = lazy(() => import('../pages/student/Lessons').then((module) => ({ default: module.Lessons })));
const MockTests = lazy(() => import('../pages/student/MockTests').then((module) => ({ default: module.MockTests })));
const PracticeRunner = lazy(() => import('../pages/student/PracticeRunner').then((module) => ({ default: module.PracticeRunner })));
const Predictions = lazy(() => import('../pages/student/Predictions').then((module) => ({ default: module.Predictions })));
const Renewal = lazy(() => import('../pages/student/Renewal').then((module) => ({ default: module.Renewal })));
const Settings = lazy(() => import('../pages/student/Settings').then((module) => ({ default: module.Settings })));
const SkillPartQuestions = lazy(() => import('../pages/student/Tests').then((module) => ({ default: module.SkillPartQuestions })));
const SkillQuestionParts = lazy(() => import('../pages/student/Tests').then((module) => ({ default: module.SkillQuestionParts })));
const TestPartMenu = lazy(() => import('../pages/student/Tests').then((module) => ({ default: module.TestPartMenu })));
import { ProtectedRoute } from './ProtectedRoute';
import { SubscriptionGate } from './SubscriptionGate';

export const router = createBrowserRouter([
  { path: '*', element: <main className="min-h-screen grid place-content-center gap-5 p-8 text-center"><h1 className="text-3xl font-bold">404 — Không tìm thấy trang</h1><p>Đường dẫn này không tồn tại hoặc đã được thay đổi.</p><Link to="/" className="btn-primary">Về trang chủ</Link></main> },
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
        { path: 'exams/:id', element: <Navigate to="/app/mock-tests" replace /> },
        { path: 'tests/:id', element: <SubscriptionGate requirePro><PracticeRunner /></SubscriptionGate> },
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
      { path: 'leaderboard', element: <Leaderboard /> },
      { path: 'predictions', element: <AdminPredictions /> },
      { path: 'revenue', element: <AdminRevenue /> },
      { path: 'notifications', element: <AdminNotifications /> },
      { path: 'media', element: <AdminMedia /> }
    ] }]
  }
]);
