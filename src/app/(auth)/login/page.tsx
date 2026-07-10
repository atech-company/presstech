import { AuthLayout } from "@/layouts/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
