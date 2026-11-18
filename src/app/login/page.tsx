import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white">
            ⏱
          </div>
          <h1 className="text-xl font-bold">DB</h1>
          <p className="text-sm text-gray-500">Утасны дугаар, нууц үгээрээ нэвтэрнэ үү</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
