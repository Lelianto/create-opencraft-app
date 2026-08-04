import { NextResponse } from "next/server";
import type { ApiFailure, ApiSuccess } from "@/types/api";
export const ok = <T>(data:T, status=200) => NextResponse.json<ApiSuccess<T>>({success:true,data},{status});
export const fail = (code:string,message:string,status=400,fieldErrors?:Record<string,string[]>) => NextResponse.json<ApiFailure>({success:false,error:{code,message,...(fieldErrors?{fieldErrors}:{})}},{status});

