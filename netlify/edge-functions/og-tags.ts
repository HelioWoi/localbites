export default async (request, context) => {
  const response = await context.next();
  response.headers.set("x-og-debug", "edge-function-is-running");
  return response;
};
