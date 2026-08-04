export interface ApiSuccess<T> { success: true; data: T }
export interface ApiFailure { success: false; error: { code: string; message: string; fieldErrors?: Record<string,string[]> } }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
