import { proxyRead } from "@/read-api";

export const GET = (request: Request) => proxyRead(request, "asset-prices");
