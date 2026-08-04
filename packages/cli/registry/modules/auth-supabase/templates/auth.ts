import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export interface AppUser{id:string;email:string;name:string|null;avatarUrl:string|null}
async function client(){const store=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>store.getAll(),setAll:(items)=>{try{items.forEach(({name,value,options})=>store.set(name,value,options))}catch{/* Server Components cannot set cookies. */}}}})}
export async function getCurrentUser():Promise<AppUser|null>{const {data:{user},error}=await (await client()).auth.getUser();if(error||!user)return null;return{id:user.id,email:user.email??"",name:typeof user.user_metadata.name==="string"?user.user_metadata.name:null,avatarUrl:typeof user.user_metadata.avatar_url==="string"?user.user_metadata.avatar_url:null}}
export async function requireUser(){const user=await getCurrentUser();if(!user)throw new Error("UNAUTHENTICATED");return user}

