import { Outlet } from "react-router";
import { GlobalStyles } from "../components";

export default function Root() {
  return (
    <>
      <GlobalStyles />
      <Outlet />
    </>
  );
}
