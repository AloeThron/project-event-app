import * as z from "zod"

export const eventFormSchema = z.object({
  // ตรวจสอบค่าที่ใส่เข้ามาว่าเป็น string และมีความยาวอย่างน้อย 3 ตัวอักษร
  title: z.string().min(3, 'Title must be at least 3 characters'),

  // ตรวจสอบค่าที่ใส่เข้ามาว่าเป็น string และมีความยาวอย่างน้อย 3 ตัวอักษร และไม่เกิน 400 ตัวอักษร
  description: z.string().min(3, 'Description must be at least 3 characters').max(400, 'Description must be less than 400 characters'),

  // ตรวจสอบค่าที่ใส่เข้ามาว่าเป็น string และมีความยาวอย่างน้อย 3 ตัวอักษร และไม่เกิน 400 ตัวอักษร
  location: z.string().min(3, 'Location must be at least 3 characters').max(400, 'Location must be less than 400 characters'),

  // ตรวจสอบค่าที่ใส่เข้ามาว่าเป็น string
  imageUrl: z.string(),

  // ตรวจสอบค่าที่ใส่เข้ามาว่าเป็นวันที่และเวลา
  startDateTime: z.date(),

  // ตรวจสอบค่าที่ใส่เข้ามาว่าเป็นวันที่และเวลา
  endDateTime: z.date(),

  // ตรวจสอบค่าที่ใส่เข้ามาว่าเป็น string สำหรับหมวดหมู่ (categoryId)
  categoryId: z.string(),

  // ตรวจสอบค่าที่ใส่เข้ามาว่าเป็น string สำหรับราคา (price)
  price: z.string(),

  // ตรวจสอบค่าที่ใส่เข้ามาว่าเป็น boolean สำหรับการระบุว่าเป็นฟรีหรือไม่ (isFree)
  isFree: z.boolean(),

  // ตรวจสอบค่าที่ใส่เข้ามาว่าเป็น string และเป็น URL
  url: z.string().url()
})
