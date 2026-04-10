const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on("console", (msg) => {
    console.log(`[BROWSER LOG] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  page.on("pageerror", (err) => {
    console.log(`[PAGE ERROR]: ${err.message}`);
  });

  await page.goto("http://localhost:3000");

  await page.evaluate(() => {
    localStorage.setItem("gitmurph-user", JSON.stringify({
      name: "Old User",
      email: "old@example.com",
      skillLevel: "beginner",
      interests: ["ai", "old-emoji-id-that-was-removed"],
      joinedAt: Date.now()
    }));
  });

  await page.reload({ waitUntil: "networkidle0" });

  console.log("Page reloaded with old storage.");
  await browser.close();
})();
