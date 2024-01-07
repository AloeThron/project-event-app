"use server";

import { handleError } from "../utils";
import { connectToDatabase } from "../database";
import Category from "../database/models/category.model";
import { CreateCategoryParams } from "@/types";

// ใช้สำหรับสร้างหมวดหมู่สินค้าใหม่ โดยรับพารามิเตอร์ categoryName เพื่อนำไปสร้างข้อมูลใหม่ในฐานข้อมูล โดยใช้ Category.create จาก Mongoose เพื่อสร้างข้อมูลใหม่และคืนค่าในรูปแบบ JSON
export const createCategory = async ({
  categoryName,
}: CreateCategoryParams) => {
  try {
    // รอให้การเชื่อมต่อกับฐานข้อมูลเสร็จสมบูรณ์ก่อนที่จะดำเนินการต่อไป
    await connectToDatabase();
    // เมื่อการเชื่อมต่อกับฐานข้อมูลเสร็จสมบูรณ์แล้ว จะทำการสร้างข้อมูลใหม่ใน Category โดยใช้ Category.create() ซึ่งเป็นการสร้าง category ใหม่โดยมีชื่อ (name) ตามที่ระบุไว้ในตัวแปร categoryName
    const newCategory = await Category.create({ name: categoryName });
    // เมื่อ Category ใหม่ถูกสร้างขึ้นแล้ว จะทำการแปลงข้อมูลที่ได้รับกลับมาเป็น JSON object โดยใช้ JSON.stringify() และ JSON.parse() เพื่อส่งกลับข้อมูลในรูปแบบ JSON object
    return JSON.parse(JSON.stringify(newCategory));
  } catch (error) {
    handleError(error);
  }
};

// ใช้ในการดึงข้อมูลทั้งหมดของหมวดหมู่สินค้าที่มีอยู่ในฐานข้อมูล โดยใช้ Category.find จาก Mongoose เพื่อค้นหาและคืนค่าข้อมูลทั้งหมดในฐานข้อมูลในรูปแบบ JSON
export const getAllCategories = async () => {
  try {
    // รอให้การเชื่อมต่อกับฐานข้อมูลเสร็จสมบูรณ์ก่อนที่จะดำเนินการต่อไป
    await connectToDatabase();
    // เมื่อการเชื่อมต่อกับฐานข้อมูลเสร็จ จะทำการดึงข้อมูลหมวดหมู่ (categories) จากฐานข้อมูลโดยใช้ Category.find() ซึ่งน่าจะเป็นการค้นหาข้อมูลทั้งหมดของตารางหรือคอลเลกชันที่เก็บข้อมูลของหมวดหมู่นั้น ๆ
    const categories = await Category.find();
    // สุดท้ายจะมีการแปลงข้อมูลของหมวดหมู่ (categories) ที่ได้มาเป็นรูปแบบ JSON โดยใช้ JSON.stringify() เพื่อแปลงเป็นสตริง JSON และ JSON.parse() เพื่อแปลงสตริง JSON กลับเป็น Object
    return JSON.parse(JSON.stringify(categories));
  } catch (error) {
    handleError(error);
  }
};
