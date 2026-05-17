import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function Layout({ showPowerLine }: { showPowerLine?: boolean }) {
  return (
    <>
      <Header />
      <Outlet />
      <Footer showPowerLine={showPowerLine} />
    </>
  );
}
