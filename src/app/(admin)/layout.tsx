"use client";

import { AuthGuard } from "@/lib/auth";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
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
    </AuthGuard>
  );
}
