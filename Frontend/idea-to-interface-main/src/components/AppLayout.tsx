import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import FloatingChatButton from "./FloatingChatButton";

const AppLayout = () => {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <main className="overflow-y-auto">
        <Outlet />
      </main>
      <FloatingChatButton />
    </div>
  );
};

export default AppLayout;
