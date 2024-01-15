import { createUploadthing, type FileRouter } from "uploadthing/next";

// ใช้ในการสร้างอ็อบเจกต์ f ซึ่งเป็นอ็อบเจกต์ที่ใช้ในการจัดการกับการอัปโหลดไฟล์
const f = createUploadthing();

// เป็นฟังก์ชันที่ใช้สำหรับการตรวจสอบการรับรองตัวตน (authentication) จาก request ที่เข้ามา
function auth(req: Request) {
  return { id: "fakeId" }; // Fake auth function
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // เป็น FileRoute ที่ถูกกำหนดขึ้นโดยใช้ f และกำหนดการจัดการกับไฟล์รูปภาพที่อัปโหลด โดยกำหนดขนาดสูงสุดของไฟล์ที่ 4MB และมีการกำหนด middleware สำหรับตรวจสอบการรับรองตัวตนก่อนการอัปโหลด และมีการดำเนินการหลังจากการอัปโหลดเสร็จสิ้น
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    // ใช้ async function ซึ่งจะทำการตรวจสอบการรับรองตัวตนจาก request ที่เข้ามา โดยใช้ฟังก์ชัน auth และจะคืนค่า userId ของ user ที่ได้รับการรับรองตัวตนใน metadata
    // ตั้งค่าการอนุญาตและประเภทไฟล์สำหรับ FileRoute นี้
    .middleware(async ({ req }) => {
      const user = await auth(req);
      // หาก Error ผู้ใช้จะไม่สามารถอัพโหลดได้
      if (!user) throw new Error("Unauthorized");
      // ส่งคืน object สามารถเข้าถึงได้ใน onUploadComplete เป็น metadata
      return { userId: user.id };
    })
    // ทำงานหลังจากที่ไฟล์ถูกอัปโหลดเสร็จสิ้น มีการ log ข้อมูล "Upload complete for userId" และ URL ของไฟล์ที่อัปโหลด
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      // มีการคืนค่า object ที่มี key uploadedBy + userId ของ user ที่ทำการอัปโหลด ไปยังฝั่งไคลเอ็นต์
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
