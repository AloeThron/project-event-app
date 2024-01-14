import { generateReactHelpers } from "@uploadthing/react/hooks";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

// ทำการแยก function generateReactHelpers ออกมาเป็น useUploadThing และ uploadFiles ซึ่งเป็นฟังก์ชันในการจัดการกับการอัปโหลดไฟล์ใน UploadThing
export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();
