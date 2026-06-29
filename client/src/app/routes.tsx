import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { MemberRegistration } from "./components/MemberRegistration";
import { MemberList } from "./components/MemberList";
import { PendingPayments } from "./components/PendingPayments";
import { WhatsAppCampaign } from "./components/WhatsAppCampaign";
import { Settings } from "./components/Settings";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Root />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: "register", Component: MemberRegistration },
      { path: "members", Component: MemberList },
      { path: "unpaid", Component: PendingPayments },
      { path: "messages", Component: WhatsAppCampaign },
      { path: "settings", Component: Settings },
    ],
  },
]);
