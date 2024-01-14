import { Document, Schema, model, models } from "mongoose";

export interface ICategory extends Document {
  _id: string;
  name: string;
}

// สร้าง Schema ชื่อ CategorySchema เพื่อกำหนดโครงสร้างของเอกสารในฐานข้อมูล
const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
});

// สร้างโมเดลชื่อ Category จาก CategorySchema ถ้าโมเดลเคยสร้างไว้แล้ว (models.Category) ให้ใช้โมเดลนั้น ถ้าไม่ ให้สร้างโมเดลใหม่
const Category = models.Category || model("Category", CategorySchema);

// ส่งออกโมเดล Category เพื่อให้ส่วนอื่นในโค้ดสามารถนำไปใช้ได้
export default Category;
