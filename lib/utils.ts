import { type ClassValue, clsx } from "clsx";

import { twMerge } from "tailwind-merge";
import qs from "query-string";

import { UrlQueryParams, RemoveUrlQueryParams } from "@/types";

// รับพารามิเตอร์แบบ Rest ที่รวมกันเป็นคลาส CSS โดยใช้ twMerge และ clsx จากไลบรารี clsx และ tailwind-merge ตามลำดับ เพื่อรวมคลาส CSS และให้เป็นรูปแบบที่ถูกต้องสำหรับการใช้งานกับ Tailwind CSS
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// รับวันที่และเวลาแบบ string และจัดรูปแบบใหม่เป็นวันที่และเวลาในรูปแบบที่กำหนดโดยใช้ toLocaleString ของวัตถุ Date ซึ่งให้ผลลัพธ์เป็น string ตามตัวเลือกที่กำหนด เช่น วัน, เวลา, รายวันที่, รายเวลา, เป็นต้น
export const formatDateTime = (dateString: Date) => {
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    month: "short", // abbreviated month name (e.g., 'Oct')
    day: "numeric", // numeric day of the month (e.g., '25')
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    month: "short", // abbreviated month name (e.g., 'Oct')
    year: "numeric", // numeric year (e.g., '2023')
    day: "numeric", // numeric day of the month (e.g., '25')
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  };

  // toLocaleString() ใช้สำหรับการแปลงวัตถุ Date เป็นสตริงตามภาษาและรูปแบบที่กำหนด เช่น วันที่ และเวลาตามท้องถิ่น หรือรูปแบบที่กำหนดเองได้ด้วยตัวเลือกต่าง ๆ ที่ส่งผ่านเข้าไปในฟังก์ชันนี้ เช่น en-US เป็นภาษาและรูปแบบเวลาที่ใช้ในตัวอย่างด้านบนนี้และ dateTimeOptions, dateOptions, และ timeOptions เป็นตัวแปรที่กำหนดรูปแบบวันที่และเวลาที่ต้องการแสดงผลออกมาในแต่ละกรณีของ formattedDateTime, formattedDate, และ formattedTime ตามลำดับที่กำหนด
  const formattedDateTime: string = new Date(dateString).toLocaleString(
    "en-US",
    dateTimeOptions
  );
  const formattedDate: string = new Date(dateString).toLocaleString(
    "en-US",
    dateOptions
  );
  const formattedTime: string = new Date(dateString).toLocaleString(
    "en-US",
    timeOptions
  );

  return {
    dateTime: formattedDateTime,
    dateOnly: formattedDate,
    timeOnly: formattedTime,
  };
};

// รับไฟล์และสร้าง URL object โดยใช้ URL.createObjectURL เพื่อให้เป็น URL ที่สามารถใช้งานได้สำหรับไฟล์ดังกล่าว
export const convertFileToUrl = (file: File) => URL.createObjectURL(file);

// จัดรูปแบบราคาที่รับเป็น string ให้เป็นรูปแบบเงินที่สามารถอ่านได้ด้วย Intl.NumberFormat ในภาษาอังกฤษ (USD)
export const formatPrice = (price: string) => {
  // ทำการแปลง price ที่เป็นสตริงเป็นตัวเลขโดยใช้ parseFloat() เพื่อทำการแปลงเป็นตัวเลขทศนิยม ตัวอย่างเช่น "50.25" จะถูกแปลงเป็น 50.25
  const amount = parseFloat(price);

  // จัดรูปแบบตัวเลขที่ได้มาใหม่ในรูปแบบของสกุลเงินดอลลาร์สหรัฐ (USD) โดยใช้การจัดรูปแบบที่เป็นเงิน ซึ่งจะเพิ่มเครื่องหมายสกุลเงินดอลลาร์ และคั่นระหว่างหลักพัน
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  // คืนค่าเป็นสตริงที่เป็นราคาที่ถูกจัดรูปแบบแล้วตามที่กำหนด
  return formattedPrice;
};

//  รับข้อมูลและปรับ URL ที่มีการเพิ่มหรือเปลี่ยนแปลง query parameters ของ URL ในการทำงานกับ query string โดยใช้ qs.parse เพื่อแปลง query string ให้เป็น object, และใช้ qs.stringifyUrl เพื่อสร้าง URL ใหม่โดยใส่ query parameters ใหม่
export function formUrlQuery({ params, key, value }: UrlQueryParams) {
  // ทำการแปลง params ที่เป็น string เป็น object โดยใช้ qs.parse()
  const currentUrl = qs.parse(params);

  // ทำการเพิ่มหรืออัพเดทค่าของ key ใน object นี้ด้วย value ที่ระบุ เพื่อที่จะทำการสร้าง URL query string ใหม่
  currentUrl[key] = value;

  // ฟังก์ชันจะส่งคืน URL query string ใหม่ที่สร้างขึ้นมา โดยใช้ qs.stringifyUrl() สำหรับแปลง object กลับเป็น query string URL อีกครั้ง โดยที่กำหนด URL ปัจจุบันด้วย window.location.pathname และใช้ object ที่เก็บ query string ใหม่ที่อัพเดทแล้ว เพื่อที่จะสร้าง URL ใหม่ที่มีการเปลี่ยนแปลงค่าของ parameter ตามที่กำหนดมาให้กับ key นั้น ๆ โดยที่ skipNull: true ใช้สำหรับข้ามค่าที่เป็น null ในการสร้าง URL query string ใหม่
  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query: currentUrl,
    },
    { skipNull: true }
  );
}

// ลบ keys ที่ระบุออกจาก query parameters ใน URL และสร้าง URL ใหม่ โดยรับข้อมูลซึ่งประกอบด้วย properties สองอย่างคือ params และ keysToRemove
export function removeKeysFromQuery({
  params,
  keysToRemove,
}: RemoveUrlQueryParams) {
  // ใช้ qs.parse เพื่อแปลงสตริง params เป็นอ็อบเจ็กต์ที่มีโครงสร้างของพารามิเตอร์ใน URL เพื่อทำการจัดการกับมันได้ง่ายขึ้น
  const currentUrl = qs.parse(params);

  // วนลูปผ่าน keysToRemove และใช้ delete เพื่อลบคีย์ที่ระบุออกจากอ็อบเจ็กต์ที่เก็บข้อมูลของพารามิเตอร์ URL
  keysToRemove.forEach((key) => {
    delete currentUrl[key];
  });

  // หลังจากที่ลบพารามิเตอร์ที่ต้องการออกแล้ว ใช้ qs.stringifyUrl เพื่อสร้าง object URL ใหม่
  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query: currentUrl,
    },
    { skipNull: true }
  );
}

// รับข้อมูล error และทำการ log ข้อผิดพลาดด้วย console.error และเกิดข้อผิดพลาดใหม่ด้วย throw new Error เพื่อทำการ throw ข้อผิดพลาดออกมา
export const handleError = (error: unknown) => {
  // ทำการแสดงข้อผิดพลาดที่เกิดขึ้นในคอนโซลเพื่อทราบข้อมูลเพิ่มเติมของข้อผิดพลาดที่เกิดขึ้น
  console.error(error);

  // ทำการสร้างข้อผิดพลาดใหม่โดยใช้ new Error() โดยตรวจสอบว่า error ที่รับเข้ามาเป็นชนิดข้อมูลแบบ string หรือไม่ หากเป็น string จะนำ error นั้นๆ มาเป็นข้อความของข้อผิดพลาด แต่หากไม่ใช่ string จะทำการแปลง error เป็น JSON string แล้วนำมาเป็นข้อความของข้อผิดพลาด
  throw new Error(typeof error === "string" ? error : JSON.stringify(error));
};
