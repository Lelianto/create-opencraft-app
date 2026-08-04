import "server-only";
import { put,del } from "@vercel/blob";
export interface UploadInput{data:Blob|ArrayBuffer|Uint8Array;contentType:string;key?:string} export interface UploadedFile{key:string;url:string;contentType:string;size:number}
export const storage={async upload(input:UploadInput):Promise<UploadedFile>{const key=input.key??crypto.randomUUID();const body=input.data instanceof Blob?input.data:Buffer.from(new Uint8Array(input.data));const result=await put(key,body,{access:"public",contentType:input.contentType,addRandomSuffix:true});const size=input.data instanceof Blob?input.data.size:input.data.byteLength;return{key:result.pathname,url:result.url,contentType:input.contentType,size}},async delete(key:string){await del(key)},getPublicUrl(key:string){return key}};

