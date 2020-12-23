//@ts-check
const {chromium} = require('playwright');
require('dotenv').config();

let in_stock = false

//Timer for random page reloads
const timer = ms => new Promise(res => setTimeout(res, ms))

async function SignIn(page) {
  console.log("Trying to sign in...");
  try {
    await page.click('[class="nav-line-2 nav-long-width"] >> text="Account & Lists"');
    await page.type('#ap_email',process.env.AMZ_Email);
    await page.keyboard.press('Enter');
    await page.type('#ap_password',process.env.AMZ_PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForNavigation();
    console.log("Sign in complete");
  } catch {
    console.log("Error signing in...")
    process.exit(1);
  }

}

async function CheckPricing(page) {
  console.log("Iterating over prices...");
  try {
    const gpu_offers = await page.$$('[class="a-row a-spacing-mini olpOffer"]');
  for (let gpu of gpu_offers) {
    const gpu_button = await gpu.$eval('[class="a-button a-button-normal a-spacing-micro a-button-primary a-button-icon olpAtcBtnWrap"]', el => el.getAttribute("id"));
    let gpu_price = await gpu.$eval('.olpOfferPrice',e => e.textContent);
    gpu_price = gpu_price.replace(/\s+/g, '');
    gpu_price = gpu_price.replace('$','');
    gpu_price = gpu_price.replace(',','');
    gpu_price = parseFloat(gpu_price);
    if (gpu_price < parseFloat(process.env.AMZ_MAX_PRICE)) {
      console.log("GPU Found, adding to cart...");
      in_stock=true;
      await AddToCart(page,gpu_button);
    } else {
      in_stock = false;
    }
  }
  await Promise.race([
    page.reload(),
    page.waitForNavigation({waitUntil:'networkidle'})
  ]);
  } catch {
    console.log("Error checking pricing...");
    process.exit(1);
  }
}

async function AddToCart(page,gpu_button) {
  console.log("Starting purchase process");
  try {
    await page.click(`#${gpu_button}`);
    await page.waitForNavigation();
    await page.click(`#hlb-ptc-btn-native`);
    await Checkout(page);
  } catch(e) {
    console.log("Issue adding to cart..");
    process.exit(1);
  }
}
async function Checkout(page) {
  console.log("Checking out")
  try {
    await page.waitForNavigation();
    await page.click('[name="placeYourOrder1"]')
  } catch {
    console.log("Error checking out...")
    process.exit(1);
  }

}

//Main entry
(async () => {

  const browser = await chromium.launch({headless:false});
  const page = await browser.newPage();
  console.log("new page opened");
  try{
  await page.goto(process.env.AMZ_URL);
  console.log("at Amazon now");
  await SignIn(page);
  while(in_stock === false) {
    await CheckPricing(page);
    let ms = Math.floor((Math.random() * 2000) + 1000);
    console.log(`Waiting ${ms}ms before continuing...`);
    await timer(ms);
  }
  console.log("Purchase successful");
  await browser.close();
  process.exit(1)
  } catch(e){
    console.log("Error, program exiting.");
    await browser.close();
    process.exit(1)
  }
})();