import { clerkClient } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  // ดึง WEBHOOK_SECRET จาก environment variable ของระบบ (โดยในกรณีที่ไม่พบ WEBHOOK_SECRET จะทำการโยนข้อผิดพลาดออกไป เพื่อแจ้งให้เราทราบว่าต้องตั้งค่า WEBHOOK_SECRET ใน environment variable)
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // รับ HTTP POST request ที่ส่งมา โดยตรวจสอบหา Headers ที่เกี่ยวข้องกับ Svix Webhook (เช่น svix-id, svix-timestamp, svix-signature)
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // ถ้าหากไม่พบ Headers เหล่านี้ จะทำการส่ง response กลับไปว่าเกิดข้อผิดพลาดพร้อมกับสถานะ 400 Bad Request
  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // ดึงข้อมูล payload จาก request object และทำการใช้งานคลาส Svix Webhook เพื่อเตรียมพร้อมสำหรับการใช้งาน
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  // ประกาศตัวแปร evt ซึ่งมีชนิดเป็น WebhookEvent เพื่อเก็บข้อมูลจาก Webhook
  let evt: WebhookEvent;

  // ตรวจสอบความถูกต้องของ payload ด้วย headers ที่ถูกส่งมา
  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    // ถ้ามีข้อผิดพลาดจะทำการส่ง response กลับไปว่าเกิดข้อผิดพลาดพร้อมกับสถานะ 400 Bad Request
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // ตรวจสอบว่าเป็นเหตุการณ์ชนิดไหน (เช่น user.created, user.updated, user.deleted) จะดำเนินการตามเหตุการณ์นั้นๆ โดยใช้ฟังก์ชันที่ถูกนำเข้ามาจากไฟล์ user.actions หลังจากนั้นจะทำการส่ง response กลับไปตามผลลัพธ์ของการดำเนินการนั้นๆ ด้วยการใช้ NextResponse.json() เพื่อสร้าง JSON response
  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  // สร้างผู้ใช้ใหม่ (สำหรับเหตุการณ์ user.created)
  if (eventType === "user.created") {
    const { id, email_addresses, image_url, first_name, last_name, username } =
      evt.data;
    const user = {
      clerkId: id,
      email: email_addresses[0].email_address,
      username: username!,
      firstName: first_name,
      lastName: last_name,
      photo: image_url,
    };
    // เรียกใช้ฟังก์ชัน "createUser(user)" เพื่อสร้างผู้ใช้ใหม่โดยใช้ข้อมูลจากอ็อบเจ็กต์ "user" ที่เตรียมไว้ และเก็บผลลัพธ์ไว้ที่ตัวแปร "newUser"
    const newUser = await createUser(user);
    // หลังจากสร้างผู้ใช้ใหม่เรียบร้อยแล้ว โค้ดจะทำการอัปเดตข้อมูลเพิ่มเติมให้กับผู้ใช้ โดยในที่นี้คือการอัปเดต publicMetadata โดยใส่ข้อมูล userId ที่เป็น ID ของผู้ใช้ใหม่ที่ถูกสร้างขึ้น
    if (newUser) {
      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: {
          userId: newUser._id,
        },
      });
    }
    // ส่งข้อมูล response กลับไปให้กับผู้เรียกใช้โดยใช้ NextResponse.json() โดยส่งข้อความ "OK" และข้อมูลของผู้ใช้ที่ถูกสร้างขึ้น (newUser) กลับไปที่ผู้เรียกใช้
    return NextResponse.json({ message: "OK", user: newUser });
  }

  // อัปเดตข้อมูลผู้ใช้ (สำหรับเหตุการณ์ user.updated)
  if (eventType === "user.updated") {
    const { id, image_url, first_name, last_name, username } = evt.data;
    const user = {
      firstName: first_name,
      lastName: last_name,
      username: username!,
      photo: image_url,
    };
    // เรียกใช้ฟังก์ชัน "updateUser" เพื่ออัปเดตข้อมูลผู้ใช้ โดยใช้ข้อมูลจากอ็อบเจ็กต์ "user", "id" ที่เตรียมไว้ และเก็บผลลัพธ์ไว้ที่ตัวแปร "updatedUser"
    const updatedUser = await updateUser(id, user);
    // ส่งข้อมูล response กลับไปให้กับผู้เรียกใช้โดยใช้ NextResponse.json() โดยส่งข้อความ "OK" และข้อมูลของผู้ใช้ที่ถูกอัปเดต (updatedUser) กลับไปที่ผู้เรียกใช้
    return NextResponse.json({ message: "OK", user: updatedUser });
  }

  // ลบผู้ใช้ (สำหรับเหตุการณ์ user.deleted)
  if (eventType === "user.deleted") {
    const { id } = evt.data;
    // เรียกใช้ฟังก์ชัน "deleteUser" เพื่อลบข้อมูลผู้ใช้ โดยใช้ข้อมูลจากอ็อบเจ็กต์ "id" ที่เตรียมไว้ และเก็บผลลัพธ์ไว้ที่ตัวแปร "deletedUser"
    const deletedUser = await deleteUser(id!);
    // ส่งข้อมูล response กลับไปให้กับผู้เรียกใช้โดยใช้ NextResponse.json() โดยส่งข้อความ "OK" และข้อมูลของผู้ใช้ที่ถูกลบ (deletedUser) กลับไปที่ผู้เรียกใช้
    return NextResponse.json({ message: "OK", user: deletedUser });
  }

  // ส่งข้อมูลกลับไปตามการดำเนินการที่เกิดขึ้นกับผู้ใช้งานในระบบของเรา หรือจะส่ง response ว่างๆ กลับไปด้วย status code 200 หากไม่มีการเกิดเหตุการณ์ที่ต้องการจัดการในที่นี้
  return new Response("", { status: 200 });
}
