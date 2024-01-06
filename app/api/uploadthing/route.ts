import { createNextRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "./core";

// ทำการสร้างการจัดการเส้นทางสำหรับการรับข้อมูลแบบ GET และ POST
// Export routes for Next App Router
export const { GET, POST } = createNextRouteHandler({
  router: ourFileRouter,
});
