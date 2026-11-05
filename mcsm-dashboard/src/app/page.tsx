import { redirectToHome } from "@/services/authService";

export default async function HomePage() {
  await redirectToHome();
}
