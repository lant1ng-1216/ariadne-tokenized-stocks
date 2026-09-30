// Browser-facing GET-only boundary. Credentials stay in the existing API process.
export async function proxyRead(request: Request, endpoint: "assets" | "research" | "candles" | "quote" | "preflight" | "asset-prices") {
    const incoming = new URL(request.url);
    const url = new URL("/api/" + endpoint, process.env.ARIADNE_API_ORIGIN ?? "http://127.0.0.1:18902");
    for (const key of ["query", "chainId", "platformId", "offset", "limit", "contractAddress", "bar", "walletAddress", "amount", "representation"]) {
        const value = incoming.searchParams.get(key);
        if (value !== null) {
            if (key === "representation") {
                for (const representation of incoming.searchParams.getAll(key)) url.searchParams.append(key, representation);
            }
            else url.searchParams.set(key, value);
        }
    }
    try {
        const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(endpoint === "preflight" ? 30000 : 12000) });
        const data = await response.json();
        return Response.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
    }
    catch {
        return Response.json({ error: { code: "service_unavailable", message: "Read-only data service is unavailable." } }, { status: 503 });
    }
}
