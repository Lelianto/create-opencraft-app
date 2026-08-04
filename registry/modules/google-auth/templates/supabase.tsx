"use client";
import { createBrowserClient } from "@supabase/ssr";
export function GoogleSignIn(){async function signIn(){const client=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}/auth/callback`}})}return <button className="rounded-md bg-zinc-900 px-4 py-2 text-white" onClick={signIn}>Continue with Google</button>}
