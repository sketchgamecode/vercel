export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.statusCode = 200;
  res.end(
    JSON.stringify({
      message: "Admin test handler working!",
      method: req.method,
      url: req.url
    })
  );
}
