"use client";

import { AuthGuard } from "@/lib/auth";
import { SocketProvider } from "@/lib/socketProvider";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import Sidebar from "@/components/layout/Sidebar";
import { CashStatusProvider } from "@/lib/cashStatus";
import { PendingAccreditationsProvider } from "@/lib/pendingAccreditations";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SocketProvider>
      <CashStatusProvider>
      <PendingAccreditationsProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden bg-[#F7F3EC]">
          {/* Sidebar (desktop estático, mobile drawer) */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
            {children}
          </div>
        </div>
      </SidebarProvider>
      </PendingAccreditationsProvider>
      </CashStatusProvider>
      </SocketProvider>
    </AuthGuard>
  );
}
