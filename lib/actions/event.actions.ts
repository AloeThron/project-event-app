"use server";

import { revalidatePath } from "next/cache";

import { connectToDatabase } from "@/lib/database";
import Event from "@/lib/database/models/event.model";
import User from "@/lib/database/models/user.model";
import Category from "@/lib/database/models/category.model";
import { handleError } from "@/lib/utils";

import {
  CreateEventParams,
  UpdateEventParams,
  DeleteEventParams,
  GetAllEventsParams,
  GetEventsByUserParams,
  GetRelatedEventsByCategoryParams,
} from "@/types";

// ใช้ในการค้นหา Category โดยจะค้นหา Category ที่มีชื่อ (name) ที่ตรงกับ pattern ที่ระบุ โดยใช้ $regex (regular expression) ซึ่งมีเงื่อนไขว่าต้องตรงกับ name ที่ระบุทั้งหมดหรือบางส่วนโดยไม่สนใจตัวพิมพ์ใหญ่-เล็ก ($options: 'i' เพื่อ ignore case sensitivity) และจะคืนค่าเป็น Category ที่พบตัวแรกที่ตรงกับเงื่อนไขนี้
const getCategoryByName = async (name: string) => {
  return Category.findOne({ name: { $regex: name, $options: "i" } });
};

// ใช้ในการ populate (เติมข้อมูล) ใน Event โดยรับ parameter เป็น query ที่ใช้ค้นหา Event ฟังก์ชั่นนี้จะทำการ populate ข้อมูลของ organizer และ category ใน Event โดยใช้ method populate() จาก MongoDB โดยจะเติมข้อมูลของ organizer จาก model ของ User และ category จาก model ของ Category และเลือกเฉพาะ field ที่ต้องการคือ _id, firstName, lastName สำหรับข้อมูลของ User และ _id, name สำหรับข้อมูลของ Category
const populateEvent = (query: any) => {
  return query
    .populate({
      path: "organizer",
      model: User,
      select: "_id firstName lastName",
    })
    .populate({ path: "category", model: Category, select: "_id name" });
};

// ใช้สำหรับสร้างเหตุการณ์ (Event) ใหม่ในระบบ โดยรับพารามิเตอร์จาก CreateEventParams ซึ่งประกอบด้วย userId (รหัสผู้ใช้), event (ข้อมูลของเหตุการณ์), และ path (เส้นทางที่จะทำการ validate หรือตรวจสอบ)
// CREATE
export async function createEvent({ userId, event, path }: CreateEventParams) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // ค้นหาข้อมูลผู้ใช้ (organizer) จาก User โดยใช้ findById(userId) และเก็บข้อมูลในตัวแปร organizer
    const organizer = await User.findById(userId);
    // หากไม่พบข้อมูลผู้ใช้ จะทำการโยนข้อผิดพลาดด้วยข้อความ 'Organizer not found'
    if (!organizer) throw new Error("Organizer not found");
    // สร้างเหตุการณ์ใหม่ (newEvent) ด้วย Event.create() โดยใช้ข้อมูลจาก event และกำหนดค่า category จาก event.categoryId และ organizer จาก userId
    const newEvent = await Event.create({
      ...event,
      category: event.categoryId,
      organizer: userId,
    });
    // ทำการ revalidatePath(path) ซึ่งเป็นการตรวจสอบเส้นทาง (path) ที่ระบุเพื่อการตรวจสอบความถูกต้องหรือการทำงานอื่นๆ
    revalidatePath(path);
    // ส่งค่าข้อมูลของเหตุการณ์ใหม่ที่ถูกสร้าง
    return JSON.parse(JSON.stringify(newEvent));
  } catch (error) {
    handleError(error);
  }
}

// ใช้ในการดึงข้อมูลเหตุการณ์ (event) จากฐานข้อมูลโดยใช้ eventId ที่ระบุเป็นพารามิเตอร์ เพื่อค้นหาเหตุการณ์ที่มี ID ตรงกับค่า eventId ที่ระบุนั้น
// GET ONE EVENT BY ID
export async function getEventById(eventId: string) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // ค้นหาเหตุการณ์ (event) จากฐานข้อมูลโดยใช้ ID ที่ระบุในพารามิเตอร์ eventId + นำผลลัพธ์ที่ได้จากการค้นหาเหตุการณ์มาผ่านฟังก์ชัน populateEvent() ซึ่งอาจมีการปรับแต่งข้อมูลหรือการประมวลผลเพิ่มเติม
    const event = await populateEvent(Event.findById(eventId));
    // หากไม่พบ event ที่ตรงกับ eventId ที่ระบุ จะทำการโยนข้อผิดพลาด "Event not found"
    if (!event) throw new Error("Event not found");
    // หากพบ event จะทำการแปลงข้อมูลเหตุการณ์ให้เป็น JSON และคืนค่าเป็นข้อมูลของเหตุการณ์นั้น
    return JSON.parse(JSON.stringify(event));
  } catch (error) {
    handleError(error);
  }
}

// อัปเดตข้อมูลของเหตุการณ์ (event) ที่ถูกส่งเข้ามา โดยมีข้อมูลที่ต้องการอัปเดตเก็บอยู่ในตัวแปร event และมีข้อมูลเกี่ยวกับผู้ใช้ (userId) และพาธ (path) ที่เป็นพารามิเตอร์ที่ส่งมาด้วยด้วย
// UPDATE
export async function updateEvent({ userId, event, path }: UpdateEventParams) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // ทำการค้นหาเหตุการณ์ที่ต้องการอัปเดตโดยใช้ Event.findById(event._id)
    const eventToUpdate = await Event.findById(event._id);
    // ตรวจสอบว่ามีเหตุการณ์นี้อยู่หรือไม่ และตรวจสอบว่าผู้ใช้ที่ต้องการทำการอัปเดตเป็นผู้จัดกิจกรรม (organizer) หรือไม่ ถ้าไม่ใช่ผู้จัดกิจกรรมหรือไม่พบเหตุการณ์ที่ต้องการอัปเดต ก็จะเกิดข้อผิดพลาดและทำการ throw Error ออกมาว่า "Unauthorized or event not found"
    if (!eventToUpdate || eventToUpdate.organizer.toHexString() !== userId) {
      throw new Error("Unauthorized or event not found");
    }
    // หากผู้ใช้เป็นผู้จัดกิจกรรมและพบเหตุการณ์ที่ต้องการอัปเดต จะทำการอัปเดตข้อมูลของเหตุการณ์นั้นๆ โดยใช้ Event.findByIdAndUpdate() ซึ่งจะอัปเดตข้อมูลโดยใช้ข้อมูลที่ถูกส่งเข้ามาในตัวแปร event และกำหนด category เป็น categoryId และใช้ตัวเลือก { new: true } เพื่อให้ค่าที่ถูกอัปเดตมาใหม่ถูกส่งกลับ
    const updatedEvent = await Event.findByIdAndUpdate(
      event._id,
      { ...event, category: event.categoryId },
      { new: true }
    );
    // ทำการ validate path ที่ถูกส่งเข้ามา โดยทำการอัปเดตข้อมูลหรือเรียกใช้งานตามที่เป็นไปได้
    revalidatePath(path);
    // ทำการอัปเดตข้อมูลของ event ให้เป็น JSON และคืนค่าเป็นข้อมูลของเหตุการณ์นั้น
    return JSON.parse(JSON.stringify(updatedEvent));
  } catch (error) {
    handleError(error);
  }
}

// ใช้สำหรับลบเหตุการณ์ (event) โดยมีการรับพารามิเตอร์เข้ามาสองตัว คือ eventId และ path ผ่าน Object ที่ชื่อ DeleteEventParams เพื่อใช้ในการลบข้อมูลเหตุการณ์นั้น ๆ ออกจากฐานข้อมูล
// DELETE
export async function deleteEvent({ eventId, path }: DeleteEventParams) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // ค้นหาและลบเหตุการณ์ที่มี eventId ที่ระบุออกจากฐานข้อมูลโดยใช้โมเดล Event ซึ่งเป็นอ็อบเจกต์ที่ใช้เก็บข้อมูลเหตุการณ์ และเก็บผลลัพธ์ที่ได้จากการลบลงในตัวแปร deletedEvent
    const deletedEvent = await Event.findByIdAndDelete(eventId);
    // หากมีการลบเหตุการณ์สำเร็จ (ค่า deletedEvent ไม่เป็น null หรือ undefined) จะทำการเรียกใช้ฟังก์ชั่น revalidatePath(path) เพื่อทำการตรวจสอบและปรับปรุงข้อมูลที่เกี่ยวข้องกับ path ที่ระบุ
    if (deletedEvent) revalidatePath(path);
  } catch (error) {
    handleError(error);
  }
}

// ดึงข้อมูลเหตุการณ์ (events) จากฐานข้อมูลโดยใช้เงื่อนไขต่าง ๆ ที่ระบุ เช่น query, limit, page, และ category
// GET ALL EVENTS
export async function getAllEvents({
  query,
  limit = 6,
  page,
  category,
}: GetAllEventsParams) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // ในส่วนของการกำหนดเงื่อนไขในการค้นหาข้อมูลของเหตุการณ์ มีการใช้ titleCondition เพื่อค้นหาจาก title โดยใช้ regular expression จากค่าที่รับมาจาก query และ categoryCondition ที่สร้างขึ้นจากการดึงข้อมูล category จากชื่อ category ที่ได้รับมา โดยใช้ฟังก์ชัน getCategoryByName
    const titleCondition = query
      ? { title: { $regex: query, $options: "i" } }
      : {};
    const categoryCondition = category
      ? await getCategoryByName(category)
      : null;
    // ตัวแปร conditions จะรวมเงื่อนไขการค้นหาข้อมูลทั้งหมดในรูปแบบของ MongoDB query ซึ่งจะใช้ในการค้นหาเหตุการณ์ในฐานข้อมูล
    const conditions = {
      $and: [
        titleCondition,
        categoryCondition ? { category: categoryCondition._id } : {},
      ],
    };
    // ต่อมาคือการคำนวณ skipAmount โดยนำหมายเลขหน้า (page) ที่รับมาและกำหนด limit ในการแสดงผลข้อมูลเหตุการณ์ และนำไปใช้ในการ skip ข้อมูลที่ต้องการ
    const skipAmount = (Number(page) - 1) * limit;
    // จากนั้นทำการ query ข้อมูลเหตุการณ์ด้วย Event.find(conditions) โดยใช้เงื่อนไขที่กำหนดไว้ รวมถึงการเรียงลำดับตาม createdAt ในลำดับจากใหม่ไปเก่า และกำหนด limit และ skip ตามที่คำนวณไว้ก่อนหน้า
    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(limit);
    // ข้อมูลเหตุการณ์ที่ได้จาก query จะถูก pass ผ่านฟังก์ชัน populateEvent เพื่อทำการเติมข้อมูลเพิ่มเติม (populate) จากอื่น ๆ ที่เกี่ยวข้องกับ event นั้น ๆ
    const events = await populateEvent(eventsQuery);
    // จำนวนของเหตุการณ์ที่เข้ากันทั้งหมดจะถูกนับด้วย Event.countDocuments(conditions) เพื่อใช้ในการคำนวณหน้าทั้งหมด (totalPages) ที่จะแสดงผลข้อมูล
    const eventsCount = await Event.countDocuments(conditions);
    // ส่งคืนข้อมูลที่ได้รับมาในรูปแบบ JSON และจำนวนหน้าทั้งหมดที่คำนวณไว้
    return {
      data: JSON.parse(JSON.stringify(events)),
      totalPages: Math.ceil(eventsCount / limit),
    };
  } catch (error) {
    handleError(error);
  }
}

// ใช้สำหรับดึงข้อมูลเหตุการณ์ (events) ของผู้ใช้ที่กำหนดโดยใช้ userId โดยมีตัวแปรเสริมเช่น limit, page ในการจำกัดจำนวนข้อมูลที่ต้องการแสดงผล
// GET EVENTS BY ORGANIZER
export async function getEventsByUser({
  userId,
  limit = 6,
  page,
}: GetEventsByUserParams) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // กำหนดเงื่อนไขในการค้นหาข้อมูลเหตุการณ์ โดยกำหนดให้ organizer เป็น userId ที่ระบุ
    const conditions = { organizer: userId };
    // คำนวณ skipAmount หรือจำนวนข้อมูลที่ต้องข้าม (skip) โดยใช้ข้อมูลจำนวนหน้าและ limit
    const skipAmount = (page - 1) * limit;
    // สร้าง query สำหรับค้นหาข้อมูลเหตุการณ์จากฐานข้อมูล โดยใช้ Event.find() และกำหนดเงื่อนไข การเรียงลำดับ (sort) และจำนวนข้อมูลที่ต้องการ (limit)
    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(limit);
    // ดึงข้อมูลเหตุการณ์ด้วย populateEvent() ซึ่งอาจจะเป็นการเติมข้อมูลเพิ่มเติมเข้าไปในเหตุการณ์ที่ได้รับมา
    const events = await populateEvent(eventsQuery);
    // นับจำนวนเหตุการณ์ทั้งหมดที่ตรงกับเงื่อนไขที่กำหนดด้วย Event.countDocuments()
    const eventsCount = await Event.countDocuments(conditions);
    // ส่งค่ากลับเป็นข้อมูลเหตุการณ์ที่ถูกจัดรูปแบบเป็น JSON และค่า totalPages ซึ่งเป็นจำนวนหน้าทั้งหมดที่สามารถแสดงข้อมูลได้
    return {
      data: JSON.parse(JSON.stringify(events)),
      totalPages: Math.ceil(eventsCount / limit),
    };
  } catch (error) {
    handleError(error);
  }
}

// ใช้ในการดึงข้อมูลกิจกรรมที่เกี่ยวข้องกับหมวดหมู่ที่กำหนด
// GET RELATED EVENTS: EVENTS WITH SAME CATEGORY
export async function getRelatedEventsByCategory({
  categoryId,
  eventId,
  limit = 3,
  page = 1,
}: GetRelatedEventsByCategoryParams) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // คำนวณ skipAmount โดยการหารหน้าที่ต้องการดึงกับ limit เพื่อใช้ในการข้ามข้อมูล
    const skipAmount = (Number(page) - 1) * limit;
    // สร้างเงื่อนไขสำหรับคิวรี่ฐานข้อมูล โดยระบุว่าต้องเป็นกิจกรรมในหมวดหมู่ที่กำหนดและไม่ใช่กิจกรรมที่มี ID เดียวกับ eventId
    const conditions = {
      $and: [{ category: categoryId }, { _id: { $ne: eventId } }],
    };
    // ทำคิวรี่ฐานข้อมูล Event ตามเงื่อนไขที่กำหนด โดยเรียงลำดับตามเวลาสร้างล่าสุด (createdAt) และข้ามข้อมูลตาม skipAmount และจำกัดจำนวนด้วย limit
    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(limit);
    // นำผลลัพธ์ที่ได้มาเติมข้อมูลเพิ่มเติมในฟังก์ชัน populateEvent() เพื่อดึงข้อมูลที่เกี่ยวข้อง
    const events = await populateEvent(eventsQuery);
    // นับจำนวนกิจกรรมที่ตรงเงื่อนไขทั้งหมดด้วย Event.countDocuments() เพื่อให้ได้จำนวนทั้งหมดของกิจกรรม
    const eventsCount = await Event.countDocuments(conditions);
    // ส่งผลลัพธ์ออกมาในรูปแบบของออบเจกต์ที่ประกอบด้วยข้อมูล event ที่ดึงมา และจำนวนหน้าทั้งหมดที่คำนวณได้
    return {
      data: JSON.parse(JSON.stringify(events)),
      totalPages: Math.ceil(eventsCount / limit),
    };
  } catch (error) {
    handleError(error);
  }
}
