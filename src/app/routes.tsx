import { createBrowserRouter } from "react-router";
import Root from "./pages/Root";
import Home from "./pages/Home";
import OnboardingPage from "./pages/OnboardingPage";
import FundPage from "./pages/FundPage";
import RecordPage from "./pages/RecordPage";
import DisputePage from "./pages/DisputePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "onboarding", Component: OnboardingPage },
      { path: "fund", Component: FundPage },
      { path: "record", Component: RecordPage },
      { path: "record/dispute/:entryId", Component: DisputePage },
    ],
  },
]);
