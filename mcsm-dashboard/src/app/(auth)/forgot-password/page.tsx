import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { redirectIfAuthenticated } from "@/services/authService";

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();
  return <ForgotPasswordForm />;
}
