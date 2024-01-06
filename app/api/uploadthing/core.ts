import { createUploadthing, type FileRouter } from "uploadthing/next";

// ใช้ในการสร้างอ็อบเจกต์ f ซึ่งเป็นอ็อบเจกต์ที่ใช้ในการจัดการกับการอัปโหลดไฟล์
const f = createUploadthing();

// เป็นฟังก์ชันที่ใช้สำหรับการตรวจสอบการรับรองตัวตน (authentication) จาก request ที่เข้ามา โดยในตัวอย่างนี้มีการใช้ fakeId เป็น user ID ปลอม และมีการคืนค่า user object โดยเงื่อนไขคือถ้าไม่มี user จะทำการ throw error ว่า "Unauthorized"
const auth = (req: Request) => ({ id: "fakeId" }); // Fake auth function

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // เป็น FileRoute ที่ถูกกำหนดขึ้นโดยใช้ f และกำหนดการจัดการกับไฟล์รูปภาพที่อัปโหลด โดยกำหนดขนาดสูงสุดของไฟล์ที่ 4MB และมีการกำหนด middleware สำหรับตรวจสอบการรับรองตัวตนก่อนการอัปโหลด และมีการดำเนินการหลังจากการอัปโหลดเสร็จสิ้น
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    // ใช้ async function ซึ่งจะทำการตรวจสอบการรับรองตัวตนจาก request ที่เข้ามา โดยใช้ฟังก์ชัน auth และจะคืนค่า userId ของ user ที่ได้รับการรับรองตัวตนใน metadata ซึ่งจะสามารถเข้าถึงได้ในฟังก์ชัน onUploadComplete
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const user = await auth(req);
      // If you throw, the user will not be able to upload
      if (!user) throw new Error("Unauthorized");
      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    // จะทำงานหลังจากที่ไฟล์ถูกอัปโหลดเสร็จสิ้น มีการ log ข้อมูลเช่น "Upload complete for userId" และ URL ของไฟล์ที่อัปโหลด
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      // มีการคืนค่า object ที่มี key uploadedBy + userId ของ user ที่ทำการอัปโหลด
      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
