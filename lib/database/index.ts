import mongoose from "mongoose";

// เก็บข้อมูลที่อยู่สำหรับเชื่อมต่อฐานข้อมูล MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

// สร้างตัวแปร cached เพื่อเก็บข้อมูลการเชื่อมต่อฐานข้อมูล MongoDB โดยเริ่มต้นด้วยค่าว่าง (null) สำหรับทั้งสองตัวแปร
// conn: เก็บออบเจ็กต์การเชื่อมต่อฐานข้อมูล หากเคยเชื่อมต่อสำเร็จแล้ว
// promise: เก็บ Promise ที่รอผลลัพธ์การเชื่อมต่อฐานข้อมูล หากเริ่มการเชื่อมต่อแล้ว แต่ยังไม่ได้ผลลัพธ์สำเร็จ
let cached = (global as any).mongoose || { conn: null, promise: null };

// เชื่อมต่อฐานข้อมูล MongoDB และคืนค่าออบเจ็กต์การเชื่อมต่อให้ใช้งาน
export async function connectToDatabase() {
  // ตรวจสอบว่ามีการเชื่อมต่อฐานข้อมูลที่สำเร็จแล้วหรือไม่ ถ้ามี ให้คืนค่าการเชื่อมต่อนั้นมาใช้ซ้ำ โดยไม่ต้องเชื่อมต่อซ้ำอีก
  if (cached.conn) return cached.conn;

  // ตรวจสอบว่ามีการระบุที่อยู่ของฐานข้อมูล (MONGODB_URI) หรือไม่ ถ้าไม่มี ให้แสดงข้อผิดพลาด
  if (!MONGODB_URI) throw new Error("MONGODB_URI is missing");

  // เริ่มต้นการเชื่อมต่อฐานข้อมูล MongoDB โดยเก็บ Promise ที่รอผลลัพธ์การเชื่อมต่อไว้ในตัวแปร cached.promise
  cached.promise =
    cached.promise ||
    mongoose.connect(MONGODB_URI, {
      // กำหนดชื่อฐานข้อมูลที่ต้องการเชื่อมต่อเป็น "evently"
      dbName: "evently",
      // กำหนดให้ไม่เก็บไว้ชั่วคราว แต่จะส่งไปยังฐานข้อมูลทันที
      bufferCommands: false,
    });

  // รอผลลัพธ์การเชื่อมต่อจาก Promise (cached.promise) จนสำเร็จ แล้วเก็บออบเจ็กต์การเชื่อมต่อไว้ในตัวแปร cached.conn
  cached.conn = await cached.promise;

  // คืนค่าออบเจ็กต์การเชื่อมต่อฐานข้อมูล (cached.conn) ให้ส่วนอื่นในโค้ดนำไปใช้งาน
  return cached.conn;
}
