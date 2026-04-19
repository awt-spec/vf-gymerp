import { useNavigate, useSearchParams } from "react-router-dom";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default function Onboarding() {
  const [params] = useSearchParams();
  const memberId = params.get("member") || "";
  const navigate = useNavigate();

  if (!memberId) {
    navigate("/");
    return null;
  }

  return <OnboardingWizard memberId={memberId} onComplete={() => navigate("/")} />;
}
