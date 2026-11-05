import LoginForm from "@/components/auth/LoginForm";
import { redirectIfAuthenticated } from "@/services/authService";

export default async function LoginPage() {
  await redirectIfAuthenticated();
  return <LoginForm />;
}
