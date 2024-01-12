const puppeteer = require("puppeteer");
const fs = require("fs");

// Function to extract data from the room list
async function extractRoomData(page) {
  const rooms = await page.$$(".room-list-item");
  const roomData = [];
  for (const room of rooms) {
    // Clicking the div with the aria-label "m<sup>2</sup>"
    const m2div = await page.$x("//div[@aria-label='m<sup>2</sup>']");
    if (m2div.length > 0) {
      await m2div[0].click();
    } else {
      console.log('Div with aria-label "m<sup>2</sup>" not found');
    }
    const m2 = await room.$eval(
      ".room-list-item__size span",
      (span) => span.innerText
    );

    // Clicking the div with the aria-label "m<sup>3</sup>"
    const m3div = await page.$x("//div[@aria-label='m<sup>3</sup>']");
    if (m3div.length > 0) {
      await m3div[0].click();
    } else {
      console.log('Div with aria-label "m<sup>3</sup>" not found');
    }

    const m3 = await room.$eval(
      ".room-list-item__size span",
      (span) => span.innerText
    );

    const available = await room.$eval(
      ".room-list-item__size small",
      (small) => small.innerText
    );
    const price = await room.$eval(
      ".room-list-item__price",
      (price) => price.innerText
    );
    roomData.push({ m2, m3, available, price });
  }
  return roomData;
}

async function scrapeNettoLagerUnits() {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 }); // Set the window size
  await page.goto("https://www.nettolager.dk/lagerhoteller/"); // Main page URL

  // Wait for the cookie button to appear and then click it
  await page.waitForSelector(
    "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll"
  );
  await page.click("#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll");

  // Code to extract department URLs goes here
  const departmentUrls = await page.$$eval(
    ".department-card .department-card__content a",
    (anchors) => anchors.map((anchor) => anchor.href)
  );

  const allLocationsUnitData = [];
  var singleLocationsUnitData = [];

  var counter2 = 0;
  for (let url of departmentUrls) {
    await page.goto(url);
    // Clicking through the carousel buttons
    const sizeButtons = await page.$$(
      ".p-button.p-component.p-button-gray.p-button-circle"
    );
    if (sizeButtons.length === 0) {
      continue;
    }
    // Clicking the button with the class "p-carousel-prev p-link"
    const button = await page.$("button.p-carousel-prev.p-link");
    if (button) {
      await button.click();
    } else {
      console.log(
        'Button with class "p-carousel-prev p-link" not found or it is disabled'
      );
    }
    var counter1 = 0;
    for (const button of sizeButtons) {
      await button.hover(); // Hover over the button to ensure it's visible
      // await page.waitForTimeout(1000); // Wait for 1 second
      await button.click(); // Then click the button
      // Clicking the div with the aria-label "Alle rum"
      const divs = await page.$x("//div[@aria-label='Alle rum']");
      if (divs.length > 0) {
        await divs[0].hover();
        await divs[0].click();
      } else {
        console.log('Div with aria-label "Alle rum" not found');
      }
      await page.waitForSelector(".room-list-item", { visible: true });
      const roomData = await extractRoomData(page);
      // console.log(roomData);

      singleLocationsUnitData.push(...roomData);
      counter1++;
      if (counter1 === 7) {
        const nextButton = await page.$("button.p-carousel-next.p-link");
        if (nextButton) {
          await nextButton.click();
        } else {
          console.log('Button with class "p-carousel-next p-link" not found');
        }
      }
      if (counter1 === 14) {
        const nextButton = await page.$("button.p-carousel-next.p-link");
        if (nextButton) {
          await nextButton.click();
        } else {
          console.log('Button with class "p-carousel-next p-link" not found');
        }
      }
    }
    allLocationsUnitData.push({ url, singleLocationsUnitData });
    singleLocationsUnitData = [];
    counter2++;
    if (counter2 === 20) {
      console.log(JSON.stringify(allLocationsUnitData, null, 2));
    }
  }

  // Save the JSON data to a file
  fs.writeFileSync(
    "nettolagerUnits.json",
    JSON.stringify(allLocationsUnitData, null, 2)
  );
}

////////////////////////////

scrapeNettoLagerUnits().then(console.log).catch(console.error);
