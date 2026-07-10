import { AuthLayout } from "@/layouts/auth-layout";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
