"use server";

import { revalidatePath } from "next/cache";

import { connectToDatabase } from "@/lib/database";
import User from "@/lib/database/models/user.model";
import Order from "@/lib/database/models/order.model";
import Event from "@/lib/database/models/event.model";
import { handleError } from "@/lib/utils";

import { CreateUserParams, UpdateUserParams } from "@/types";

// สร้างผู้ใช้ใหม่ในฐานข้อมูล MongoDB โดยใช้ User.create(user) ซึ่ง user คือข้อมูลของผู้ใช้ที่ส่งเข้ามา เมื่อสร้างเสร็จแล้วจะ return ผู้ใช้ที่ถูกสร้างใหม่ออกมาเป็น JSON object
export async function createUser(user: CreateUserParams) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await connectToDatabase();

    // สร้างผู้ใช้ใหม่โดยใช้ User.create(user) ซึ่งเป็นการเรียกใช้เมธอด create จากโมเดล User
    const newUser = await User.create(user);

    // หลังจากสร้างผู้ใช้ใหม่เรียบร้อยแล้ว ค่าที่ได้จะถูกแปลงให้อยู่ในรูปแบบ JSON ผ่าน JSON.stringify(newUser) และ JSON.parse() เพื่อให้สามารถคืนค่ากลับไปยังผู้เรียกใช้ได้ในรูปแบบ JSON
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    handleError(error);
  }
}

// ค้นหาผู้ใช้โดยใช้ ID ของผู้ใช้ที่ส่งเข้ามา โดยใช้ User.findById(userId) ถ้าหากไม่พบผู้ใช้จะ throw error ว่า 'User not found' และหากพบจะ return ผู้ใช้นั้นออกมาเป็น JSON object
export async function getUserById(userId: string) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await connectToDatabase();

    // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูลโดยใช้ไอดีของผู้ใช้ที่ถูกส่งเข้ามาผ่านพารามิเตอร์ userId จากนั้นผลลัพธ์จะถูกเก็บไว้ในตัวแปร user
    const user = await User.findById(userId);

    // หากไม่พบข้อมูลผู้ใช้จากการค้นหา จะทำการโยนข้อผิดพลาดด้วยคำอธิบายว่า "User not found"
    if (!user) throw new Error("User not found");

    // ผลลัพธ์ที่ได้จากการค้นหาข้อมูลผู้ใช้จะถูกแปลงให้เป็น JSON string ด้วย JSON.stringify() เพื่อให้สามารถส่งผลลัพธ์ออกไปผ่านฟังก์ชันนี้
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
  }
}

// อัปเดตข้อมูลผู้ใช้โดยใช้ User.findOneAndUpdate({ clerkId }, user, { new: true }) โดย clerkId คือ ID ของผู้ใช้ที่ต้องการอัปเดต และ user คือข้อมูลที่ต้องการให้มีการอัปเดต จากนั้นจะ return ผู้ใช้อัปเดตแล้วออกมาเป็น JSON object
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await connectToDatabase();

    // ใช้โมเดล User ในการค้นหาและอัพเดตข้อมูลของผู้ใช้ โดยใช้ clerkId เป็นเงื่อนไขในการค้นหาและ user เป็นข้อมูลที่ใช้ในการอัพเดต ตัวอ็อบเจกต์ { new: true } ทำให้ค่าที่คืนคือข้อมูลของผู้ใช้หลังจากการอัพเดต
    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, {
      new: true,
    });

    // ทำการตรวจสอบว่าการอัพเดตผู้ใช้สำเร็จหรือไม่ ถ้าไม่สำเร็จจะเกิดข้อผิดพลาดและจะทำการ throw Error
    if (!updatedUser) throw new Error("User update failed");

    // นำข้อมูลผู้ใช้ที่ได้หลังจากการอัพเดตมาแปลงให้อยู่ในรูปแบบ JSON เพื่อทำการ return ออกจากฟังก์ชัน
    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    handleError(error);
  }
}

// ลบข้อมูลผู้ใช้โดยต้องทำการลบข้อมูลที่เกี่ยวข้องที่อาจมีอยู่ เช่น events หรือ orders ที่ผู้ใช้เป็นผู้เกี่ยวข้อง โดยทำการอัปเดต collections ที่เกี่ยวข้องใน MongoDB และจากนั้นลบผู้ใช้ออกจากฐานข้อมูลด้วย User.findByIdAndDelete(userToDelete._id) และทำการ revalidatePath('/') เพื่อรีเฟรชข้อมูลที่อาจจะมีการเปลี่ยนแปลง
export async function deleteUser(clerkId: string) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await connectToDatabase();

    // ค้นหาข้อมูลผู้ใช้ที่ต้องการลบ: ใช้ User.findOne({ clerkId }) เพื่อค้นหาผู้ใช้ที่ต้องการลบโดยใช้ clerkId เป็นเงื่อนไข
    // Find user to delete
    const userToDelete = await User.findOne({ clerkId });

    // ตรวจสอบว่ามีข้อมูลผู้ใช้ที่ต้องการลบหรือไม่: ถ้าไม่พบข้อมูลผู้ใช้นั้น จะส่ง error ออกไปด้วยข้อความ "User not found"
    if (!userToDelete) {
      throw new Error("User not found");
    }

    // ยกเลิกการเชื่อมโยงข้อมูลที่เกี่ยวข้อง
    // Unlink relationships
    await Promise.all([
      // อัปเดตคอลเล็กชัน 'events' เพื่อลบการอ้างอิงไปยังผู้ใช้นี้ในเหตุการณ์ที่เกี่ยวข้อง
      // Update the 'events' collection to remove references to the user
      Event.updateMany(
        { _id: { $in: userToDelete.events } },
        { $pull: { organizer: userToDelete._id } }
      ),

      // อัปเดตคอลเล็กชัน 'orders' เพื่อลบการอ้างอิงไปยังผู้ใช้นี้ในคำสั่งที่เกี่ยวข้อง
      // Update the 'orders' collection to remove references to the user
      Order.updateMany(
        { _id: { $in: userToDelete.orders } },
        { $unset: { buyer: 1 } }
      ),
    ]);

    // ลบข้อมูลผู้ใช้: ใช้ User.findByIdAndDelete(userToDelete._id) เพื่อลบข้อมูลผู้ใช้
    // Delete user
    const deletedUser = await User.findByIdAndDelete(userToDelete._id);

    // รีเวอร์เซสเพื่อปรับปรุง path หลังจากการลบข้อมูลผู้ใช้ (อัปเดตข้อมูลที่เกี่ยวข้องหลังจากการลบ)
    revalidatePath("/");

    // ฟังก์ชันจะคืนค่าข้อมูลผู้ใช้ที่ถูกลบในรูปแบบ JSON หากการลบสำเร็จ หรือคืนค่า null ถ้าไม่พบข้อมูลผู้ใช้ที่ต้องการลบหรือเกิดข้อผิดพลาดขณะลบข้อมูลผู้ใช้นั้นๆ
    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    handleError(error);
  }
}
