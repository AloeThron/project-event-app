"use server";

import { handleError } from "../utils";
import { connectToDatabase } from "../database";
import Category from "../database/models/category.model";
import { CreateCategoryParams } from "@/types";

// ใช้สำหรับสร้างหมวดหมู่สินค้าใหม่ โดยรับพารามิเตอร์ categoryName เพื่อนำไปสร้างข้อมูลใหม่ในฐานข้อมูล และคืนค่าในรูปแบบ JSON
export async function createCategory({ categoryName }: CreateCategoryParams) {
  try {
    // รอให้การเชื่อมต่อกับฐานข้อมูลเสร็จสมบูรณ์ก่อนที่จะดำเนินการต่อไป
    await connectToDatabase();

    // ทำการสร้างข้อมูลใหม่ใน Category ใหม่โดยมีชื่อ (name) ตามที่ระบุไว้ในตัวแปร categoryName
    const newCategory = await Category.create({ name: categoryName });

    // ทำการแปลงข้อมูลที่ได้รับกลับมาเป็น JSON object เพื่อส่งกลับข้อมูลในรูปแบบ JSON object
    return JSON.parse(JSON.stringify(newCategory));
  } catch (error) {
    handleError(error);
  }
}

// ใช้ในการดึงข้อมูลทั้งหมดของหมวดหมู่สินค้าที่มีอยู่ในฐานข้อมูล โดยใช้ find เพื่อค้นหาและคืนค่าข้อมูลทั้งหมดในฐานข้อมูลในรูปแบบ JSON
export async function getAllCategories() {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await connectToDatabase();

    // ทำการดึงข้อมูลหมวดหมู่ (categories) จากฐานข้อมูลโดยใช้ find ซึ่งน่าจะเป็นการค้นหาข้อมูลทั้งหมดของตารางหรือคอลเลกชันที่เก็บข้อมูลของหมวดหมู่นั้นๆ
    const categories = await Category.find();

    // แปลงข้อมูลของหมวดหมู่ (categories) ที่ได้มาเป็นรูปแบบ JSON Object
    return JSON.parse(JSON.stringify(categories));
  } catch (error) {
    handleError(error);
  }
}
