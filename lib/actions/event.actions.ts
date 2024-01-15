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

// ใช้ในการค้นหา Category โดยจะค้นหา Category ที่มีชื่อ (name) ที่ตรงกัน
// ใช้ $regex (regular expression) ซึ่งมีเงื่อนไขว่าต้องตรงกับ name ที่ระบุทั้งหมดหรือบางส่วนโดยไม่สนใจตัวพิมพ์ใหญ่-เล็ก ($options: 'i' เพื่อ ignore case sensitivity)
// คืนค่าเป็น Category ที่พบตัวแรกที่ตรงกับเงื่อนไขนี้
const getCategoryByName = async (name: string) => {
  return Category.findOne({ name: { $regex: name, $options: "i" } });
};

// ใช้ในการ populate (เติมข้อมูล) ใน Event โดยรับ parameter เป็น query ที่ใช้ค้นหา Event
// ฟังก์ชั่นนี้จะทำการเติมข้อมูล ข้อมูลของ organizer และ category ใน Event โดยใช้ method populate() จาก MongoDB
// จะเติมข้อมูลของ organizer จาก model ของ User และ category จาก model ของ Category และเลือกเฉพาะ field ที่ต้องการคือ _id, firstName, lastName สำหรับข้อมูลของ User และ _id, name สำหรับข้อมูลของ Category
const populateEvent = (query: any) => {
  return query
    .populate({
      path: "organizer",
      model: User,
      select: "_id firstName lastName",
    })
    .populate({ path: "category", model: Category, select: "_id name" });
};

// ใช้สำหรับสร้าง event  (Event) ใหม่ในระบบ โดยรับพารามิเตอร์จาก CreateEventParams ซึ่งประกอบด้วย userId, event, และ path
// CREATE
export async function createEvent({ userId, event, path }: CreateEventParams) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // ค้นหาข้อมูลผู้ใช้ (organizer) จาก User โดยใช้ findById(userId) และเก็บข้อมูลในตัวแปร organizer
    const organizer = await User.findById(userId);
    // หากไม่พบข้อมูลผู้ใช้ จะทำการโยนข้อผิดพลาดด้วยข้อความ 'Organizer not found'
    if (!organizer) throw new Error("Organizer not found");
    // สร้าง event ใหม่ (newEvent) ด้วย Event.create() โดยใช้ข้อมูลจาก event และกำหนดค่า category จาก event.categoryId และ organizer จาก userId
    const newEvent = await Event.create({
      ...event,
      category: event.categoryId,
      organizer: userId,
    });
    // ทำการ revalidatePath(path) ซึ่งเป็นการตรวจสอบเส้นทาง (path) ที่ระบุเพื่อการตรวจสอบความถูกต้องหรือการทำงานอื่นๆ
    revalidatePath(path);
    // ส่งค่าข้อมูลของ event ใหม่ที่ถูกสร้าง
    return JSON.parse(JSON.stringify(newEvent));
  } catch (error) {
    handleError(error);
  }
}

// ใช้ในการดึงข้อมูล event จากฐานข้อมูลโดยใช้ eventId เป็นพารามิเตอร์ เพื่อค้นหา event ที่มี ID ตรงกับค่า eventId ที่ระบุ
// GET ONE EVENT BY ID
export async function getEventById(eventId: string) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // ค้นหา event  (event) จากฐานข้อมูลโดยใช้ ID ที่ระบุในพารามิเตอร์ eventId + นำผลลัพธ์ที่ได้จากการค้นหา event มาผ่านฟังก์ชัน populateEvent() ซึ่งอาจมีการปรับแต่งข้อมูลหรือการประมวลผลเพิ่มเติม
    const event = await populateEvent(Event.findById(eventId));
    // หากไม่พบ event ที่ตรงกับ eventId ที่ระบุ จะทำการโยนข้อผิดพลาด "Event not found"
    if (!event) throw new Error("Event not found");
    // หากพบ event จะทำการแปลงข้อมูล event ให้เป็น JSON และคืนค่าเป็นข้อมูลของ event นั้น
    return JSON.parse(JSON.stringify(event));
  } catch (error) {
    handleError(error);
  }
}

// อัปเดตข้อมูลของ event  (event) ที่ถูกส่งเข้ามา โดยมีข้อมูลที่ต้องการอัปเดตเก็บอยู่ในตัวแปร event และมีข้อมูลเกี่ยวกับผู้ใช้ (userId) และพาธ (path) ที่เป็นพารามิเตอร์ที่ส่งมาด้วยด้วย
// UPDATE
export async function updateEvent({ userId, event, path }: UpdateEventParams) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // ทำการค้นหา event ที่ต้องการอัปเดตโดยใช้ findById(event._id)
    const eventToUpdate = await Event.findById(event._id);
    // ตรวจสอบว่ามี event นี้อยู่หรือไม่ และตรวจสอบว่าผู้ใช้ที่ต้องการทำการอัปเดตเป็นผู้จัด event  (organizer) หรือไม่ ถ้าไม่ใช่ผู้จัด event หรือไม่พบ event ที่ต้องการอัปเดต ก็จะทำการ throw Error ออกมา
    if (!eventToUpdate || eventToUpdate.organizer.toHexString() !== userId) {
      throw new Error("Unauthorized or event not found");
    }
    // หากผู้ใช้เป็นผู้จัด event และพบ event ที่ต้องการอัปเดต จะทำการอัปเดตข้อมูลของ event นั้นๆ โดยใช้ findByIdAndUpdate() ซึ่งจะอัปเดตข้อมูลโดยใช้ข้อมูลที่ถูกส่งเข้ามาในตัวแปร event และกำหนด category เป็น categoryId และใช้ตัวเลือก { new: true } เพื่อให้ค่าที่ถูกอัปเดตมาใหม่ถูกส่งกลับ
    const updatedEvent = await Event.findByIdAndUpdate(
      event._id,
      { ...event, category: event.categoryId },
      { new: true }
    );
    // ทำการ validate path ที่ถูกส่งเข้ามา โดยทำการอัปเดตข้อมูลหรือเรียกใช้งานตามที่เป็นไปได้
    revalidatePath(path);
    // ทำการอัปเดตข้อมูลของ event ให้เป็น JSON และคืนค่าเป็นข้อมูลของ event นั้น
    return JSON.parse(JSON.stringify(updatedEvent));
  } catch (error) {
    handleError(error);
  }
}

// ใช้สำหรับลบ event โดยมีการรับพารามิเตอร์เข้ามาสองตัว คือ eventId และ path
// DELETE
export async function deleteEvent({ eventId, path }: DeleteEventParams) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // ค้นหาและลบ event ที่มี eventId ที่ระบุออกจากฐานข้อมูล
    const deletedEvent = await Event.findByIdAndDelete(eventId);
    // หากมีการลบ event สำเร็จ (ค่า deletedEvent ไม่เป็น null หรือ undefined) จะทำการเรียกใช้ฟังก์ชั่น revalidatePath(path) เพื่อทำการตรวจสอบและปรับปรุงข้อมูลที่เกี่ยวข้องกับ path ที่ระบุ
    if (deletedEvent) revalidatePath(path);
  } catch (error) {
    handleError(error);
  }
}

// ดึงข้อมูล event  (events) จากฐานข้อมูลโดยใช้เงื่อนไขต่างๆ
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
    // ในส่วนของการกำหนดเงื่อนไขในการค้นหาข้อมูลของ event
    // ใช้ titleCondition เพื่อค้นหาจาก title โดยใช้ regular expression จากค่าที่รับมาจาก query
    // และ categoryCondition ที่สร้างขึ้นจากการดึงข้อมูล category จากชื่อ category ที่ได้รับมา โดยใช้ฟังก์ชัน getCategoryByName
    const titleCondition = query
      ? { title: { $regex: query, $options: "i" } }
      : {};
    const categoryCondition = category
      ? await getCategoryByName(category)
      : null;
    // ตัวแปร conditions จะรวมเงื่อนไขการค้นหาข้อมูลทั้งหมดในรูปแบบของ MongoDB query ซึ่งจะใช้ในการค้นหา event ในฐานข้อมูล
    const conditions = {
      $and: [
        titleCondition,
        categoryCondition ? { category: categoryCondition._id } : {},
      ],
    };
    // ต่อมาคือการคำนวณ skipAmount โดยนำหมายเลขหน้า (page) ที่รับมาและกำหนด limit ในการแสดงผลข้อมูล event และนำไปใช้ในการ skip ข้อมูลที่ต้องการ
    const skipAmount = (Number(page) - 1) * limit;
    // จากนั้นทำการ query ข้อมูล eventcode ด้วย find โดยใช้เงื่อนไขที่กำหนดไว้ รวมถึงการเรียงลำดับตาม createdAt ในลำดับจากใหม่ไปเก่า และกำหนด limit และ skip ตามที่คำนวณไว้ก่อนหน้า
    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(limit);
    // ข้อมูล event ที่ได้จาก query จะถูก pass ผ่านฟังก์ชัน populateEvent เพื่อทำการเติมข้อมูลเพิ่มเติม
    const events = await populateEvent(eventsQuery);
    // จำนวนของ event ที่เข้ากันทั้งหมดจะถูกนับด้วย countDocuments เพื่อใช้ในการคำนวณหน้าทั้งหมด (totalPages) ที่จะแสดงผลข้อมูล
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

// ใช้สำหรับดึงข้อมูล event  (events) ของผู้ใช้ที่กำหนดโดยใช้ userId โดยมีตัวแปรเสริมเช่น limit, page ในการจำกัดจำนวนข้อมูลที่ต้องการแสดงผล
// GET EVENTS BY ORGANIZER
export async function getEventsByUser({
  userId,
  limit = 6,
  page,
}: GetEventsByUserParams) {
  try {
    // เชื่อมต่อเสร็จสมบูรณ์ก่อนทำขั้นตอนถัดไป
    await connectToDatabase();
    // กำหนดเงื่อนไขในการค้นหาข้อมูล event  โดยกำหนดให้ organizer เป็น userId ที่ระบุ
    const conditions = { organizer: userId };
    // คำนวณ skipAmount โดยใช้ข้อมูลจำนวนหน้าและ limit
    const skipAmount = (page - 1) * limit;
    // สร้าง query สำหรับค้นหาข้อมูล event จากฐานข้อมูล โดยใช้ find และกำหนดเงื่อนไข การเรียงลำดับ และจำนวนข้อมูลที่ต้องการ
    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(limit);
    // ดึงข้อมูล event ด้วย populate จะเป็นการเติมข้อมูลเพิ่มเติมเข้าไป
    const events = await populateEvent(eventsQuery);
    // นับจำนวน event ทั้งหมดที่ตรงกับเงื่อนไข countDocuments
    const eventsCount = await Event.countDocuments(conditions);
    // ส่งค่ากลับเป็นข้อมูล event ที่ถูกจัดรูปแบบเป็น JSON และค่า totalPages
    return {
      data: JSON.parse(JSON.stringify(events)),
      totalPages: Math.ceil(eventsCount / limit),
    };
  } catch (error) {
    handleError(error);
  }
}

// ใช้ในการดึงข้อมูล event ที่เกี่ยวข้องกับหมวดหมู่ที่กำหนด
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
    // คำนวณ skipAmount โดยใช้ข้อมูลจำนวนหน้าและ limit
    const skipAmount = (Number(page) - 1) * limit;
    // สร้างเงื่อนไขสำหรับคิวรี่ฐานข้อมูล โดยระบุว่าต้องเป็น event ในหมวดหมู่ที่กำหนดและไม่ใช่ event ที่มี ID เดียวกับ eventId
    const conditions = {
      $and: [{ category: categoryId }, { _id: { $ne: eventId } }],
    };
    // ทำคิวรี่ฐานข้อมูล Event ตามเงื่อนไขที่กำหนด และกำหนดเงื่อนไข การเรียงลำดับ และจำนวนข้อมูลที่ต้องการ
    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(limit);
    // นำผลลัพธ์ที่ได้มาเติมข้อมูลเพิ่มเติมในฟังก์ชัน populate
    const events = await populateEvent(eventsQuery);
    // นับจำนวน event ที่ตรงเงื่อนไขทั้งหมดด้วย countDocuments เพื่อให้ได้จำนวนทั้งหมดของ event
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
