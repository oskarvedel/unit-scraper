const puppeteer = require("puppeteer");
const fs = require("fs");

async function scrapeBoxdepotetUnits() {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 }); // Set the window size
  await page.goto("https://boxdepotet.dk/priser-booking/"); // Main page URL

  // Get all 'a' elements with the classes 'elementor-button', 'elementor-button-link', and 'elementor-size-sm' that are descendants of 'div' elements with the class 'elementor-widget-container' and have the text 'Book online'
  const departmenUrls = await page.$$eval(
    ".elementor-button.elementor-button-link.elementor-size-sm",
    (buttons) =>
      buttons
        .filter((button) => button.textContent.trim() === "Book online")
        .map((button) => button.href)
  );

  const allLocationsUnitData = [];
  var singleLocationsUnitData = [];

  var counter = 0;
  for (let url of departmenUrls) {
    await page.goto(url);

    if (counter === 0) {
      // Wait for the cookie popup to appear
      await page.waitForSelector(
        "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll"
      );

      // Click the 'Allow all' button
      await page.click(
        "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll"
      );
    }

    // Click the 'alle rum' button
    await page.click(
      ".grow.text-center.text-label.border-solid.border-2.border-primary.rounded.bg-white.text-text a"
    );

    const roomData = await extractRoomData(page);

    allLocationsUnitData.push({ url, roomData });
    counter++;
  }

  // Save the JSON data to a file
  fs.writeFileSync(
    "boxdepotetUnits.json",
    JSON.stringify(allLocationsUnitData, null, 2)
  );
  return;
}

// Function to extract data from the room list
async function extractRoomData(page) {
  // Get all 'div' elements with the class 'booking-room__container'
  const rooms = await page.$$(".booking-room__container");

  // Create an empty array to store the extracted data
  const roomData = [];

  for (const room of rooms) {
    // Extract the room number
    const roomNumber = await room.$eval(
      ".booking-room__number .text-value",
      (span) => span.innerText
    );

    // Extract the price
    const price = await room.$eval(
      ".booking-room__price .text-value",
      (span) => span.innerText
    );

    // Extract the size in cubic meters
    const cubicMeters = await room.$eval(
      "#cubic_meters",
      (span) => span.innerText
    );

    // Extract the size in square meters
    const squareMeters = await room.$eval(
      "#square_meters",
      (span) => span.innerText
    );

    // Extract the 'ledig' status
    const availability = await room.$eval(
      ".booking-room__availability .booking-room__badge span",
      (span) => span.innerText
    );
    // Extract the 'Book rum' button URL
    const bookUrl = await room.$eval(
      ".booking-room__actions a.booking-btn__primary",
      (a) => a.href
    );

    // Add the extracted data to the roomData array
    roomData.push({
      roomNumber,
      price,
      cubicMeters,
      squareMeters,
      availability,
      bookUrl,
    });
  }
  return roomData;
}

scrapeBoxdepotetUnits().then(console.log).catch(console.error);
