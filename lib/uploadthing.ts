import { generateReactHelpers } from "@uploadthing/react/hooks";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

// ทำการใช้ function generateReactHelpers แยกออกมาเป็น useUploadThing และ uploadFiles ซึ่งเป็นฟังก์ชันหรือตัวช่วยในการจัดการกับการอัปโหลดไฟล์ใน React application โดยเฉพาะกับ UploadThing ที่ได้ถูกสร้างขึ้นจาก generateReactHelpers ตามที่ได้ระบุชนิดของ OurFileRouter
export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();
