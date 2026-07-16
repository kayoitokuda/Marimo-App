import { useNavigate } from "react-router";
import { OnboardingFlow } from "../components";
import { type FutureFund, type Preferences, LS, saveLS } from "../lib";

export default function OnboardingPage() {
  const navigate = useNavigate();

  function handleComplete(fund: FutureFund, prefs: Preferences) {
    saveLS(LS.fund, fund);
    saveLS(LS.prefs, prefs);
    saveLS(LS.onboarded, true);
    navigate("/");
  }

  return <OnboardingFlow onComplete={handleComplete} />;
}
