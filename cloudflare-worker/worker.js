export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight options request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, appsavylogin, formid, roleid, token, version, sourcetype",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Only forward requests to the target DHBVN endpoint
    const TARGET_URL = "https://chs.dhbvn.org.in/api/AppsavyServices/GetRelationalDataA";

    const modifiedHeaders = new Headers();
    const allowedHeaders = [
      "content-type",
      "appsavylogin",
      "formid",
      "roleid",
      "token",
      "version",
      "sourcetype",
    ];

    for (const [key, value] of request.headers.entries()) {
      if (allowedHeaders.includes(key.toLowerCase())) {
        modifiedHeaders.set(key, value);
      }
    }

    try {
      const response = await fetch(TARGET_URL, {
        method: request.method,
        headers: modifiedHeaders,
        body: request.method === "POST" ? await request.text() : undefined,
      });

      const responseBody = await response.text();
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Headers", "*");

      return new Response(responseBody, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") || "text/xml; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
