import "server-only";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
export interface AppUser{id:string;email:string;name:string|null;avatarUrl:string|null}
const app=getApps()[0]??initializeApp({credential:cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n")})});
export async function getCurrentUser():Promise<AppUser|null>{const token=(await cookies()).get("session")?.value;if(!token)return null;try{const user=await getAuth(app).verifySessionCookie(token,true);return{id:user.uid,email:user.email??"",name:user.name??null,avatarUrl:user.picture??null}}catch{return null}}
export async function requireUser(){const user=await getCurrentUser();if(!user)throw new Error("UNAUTHENTICATED");return user}
