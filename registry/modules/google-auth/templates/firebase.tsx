"use client";
import { initializeApp,getApps } from "firebase/app";
import { getAuth,GoogleAuthProvider,signInWithPopup } from "firebase/auth";
const app=getApps()[0]??initializeApp({apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN});
export function GoogleSignIn(){async function signIn(){const credential=await signInWithPopup(getAuth(app),new GoogleAuthProvider());const token=await credential.user.getIdToken();const response=await fetch("/api/auth/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});if(!response.ok)throw new Error("Sign in failed")}return <button className="rounded-md bg-zinc-900 px-4 py-2 text-white" onClick={signIn}>Continue with Google</button>}

