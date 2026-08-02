import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { OrganizationJsonLd } from "./OrganizationJsonLd";

export function Layout({ showPowerLine }: { showPowerLine?: boolean }) {
  return (
    <>
      <OrganizationJsonLd />
      <Header />
      <Outlet />
      <Footer showPowerLine={showPowerLine} />
    </>
  );
}
