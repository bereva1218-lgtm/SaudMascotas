import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import MobileNav from "./MobileNav";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};

export default AppLayout;
