import { createBrowserRouter, Navigate } from "react-router";
import { Root } from "./components/Root";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { MemberRegistration } from "./components/MemberRegistration";
import { MemberList } from "./components/MemberList";
import { PendingPayments } from "./components/PendingPayments";
import { WhatsAppCampaign } from "./components/WhatsAppCampaign";
import { Settings } from "./components/Settings";
import { WhatsAppSession } from "./components/WhatsAppSession";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Leads } from "./components/Leads";
import { Announcements } from "./components/Announcements";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { Attendance } from "./components/Attendance";
import { Branches } from "./components/Branches";
import { Trainers } from "./components/Trainers";
import { RevenueReport } from "./components/RevenueReport";

const adminOnly = ['gym_admin'];
const staffAndAdmin = ['gym_admin', 'staff'];
const superAdminOnly = ['super_admin'];

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/super-admin",
    element: (
      <ProtectedRoute allowedRoles={superAdminOnly}>
        <SuperAdminDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: "/",
    element: (
      <ProtectedRoute allowedRoles={staffAndAdmin}>
        <Root />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ProtectedRoute allowedRoles={adminOnly}><Dashboard /></ProtectedRoute> },
      { path: "register", element: <ProtectedRoute allowedRoles={adminOnly}><MemberRegistration /></ProtectedRoute> },
      { path: "members", element: <ProtectedRoute allowedRoles={adminOnly}><MemberList /></ProtectedRoute> },
      { path: "pending-payments", element: <ProtectedRoute allowedRoles={adminOnly}><PendingPayments /></ProtectedRoute> },
      { path: "unpaid", element: <Navigate to="/pending-payments" replace /> },
      { path: "messages", element: <ProtectedRoute allowedRoles={adminOnly}><WhatsAppCampaign /></ProtectedRoute> },
      { path: "settings", element: <ProtectedRoute allowedRoles={adminOnly}><Settings /></ProtectedRoute> },
      { path: "whatsapp", element: <ProtectedRoute allowedRoles={adminOnly}><WhatsAppSession /></ProtectedRoute> },
      { path: "leads", element: <ProtectedRoute allowedRoles={staffAndAdmin}><Leads /></ProtectedRoute> },
      { path: "announcements", element: <ProtectedRoute allowedRoles={adminOnly}><Announcements /></ProtectedRoute> },
      { path: "attendance", element: <ProtectedRoute allowedRoles={staffAndAdmin}><Attendance /></ProtectedRoute> },
      { path: "branches", element: <ProtectedRoute allowedRoles={adminOnly}><Branches /></ProtectedRoute> },
      { path: "trainers", element: <ProtectedRoute allowedRoles={adminOnly}><Trainers /></ProtectedRoute> },
      { path: "revenue", element: <ProtectedRoute allowedRoles={adminOnly}><RevenueReport /></ProtectedRoute> },
    ],
  },
]);
