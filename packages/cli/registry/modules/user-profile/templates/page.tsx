import { requireUser } from "@/infrastructure/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold">Profile</h1>
      <dl className="mt-6 divide-y rounded-xl border bg-white">
        <div className="flex justify-between px-4 py-3">
          <dt className="text-sm text-zinc-500">Name</dt>
          <dd className="text-sm font-medium">{user.name ?? "—"}</dd>
        </div>
        <div className="flex justify-between px-4 py-3">
          <dt className="text-sm text-zinc-500">Email</dt>
          <dd className="text-sm font-medium">{user.email}</dd>
        </div>
      </dl>
    </main>
  );
}