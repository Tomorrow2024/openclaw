import { chromium } from "playwright";
import WebSocket from "ws";

const CDP_URL = "ws://127.0.0.1:18792/cdp";

async function testWs() {
  console.log("Testing raw WebSocket connection...");
  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(CDP_URL);
    ws.on("open", () => {
      console.log("Raw WS connected!");
      ws.send(JSON.stringify({ id: 999, method: "Browser.getVersion" }));
      setTimeout(() => {
        ws.close();
        resolve();
      }, 1000);
    });
    ws.on("message", (data) => {
      console.log("Raw WS received:", data.toString());
    });
    ws.on("error", (err) => {
      console.error("Raw WS error:", err);
      reject(err);
    });
  });
}

async function main() {
  await testWs();
  console.log(`Connecting to ${CDP_URL} with Playwright...`);
  try {
    const browser = await chromium.connectOverCDP(CDP_URL);
    console.log("Connected to browser!");
    
    const contexts = browser.contexts();
    console.log(`Contexts: ${contexts.length}`);
    
    const context = contexts[0];
    if (!context) {
        console.error("No context found");
        await browser.close();
        return;
    }

    const pages = context.pages();
    console.log(`Pages: ${pages.length}`);
    pages.forEach(p => console.log(` - ${p.url()}`));

    const mgPage = pages.find(p => p.url().includes("mgkaoqin") || p.url().includes("MG"));
    
    if (mgPage) {
        console.log(`Found MG Page: ${mgPage.url()}`);
        console.log("Attempting screenshot...");
        try {
            await mgPage.screenshot({ path: "mg-debug.png" });
            console.log("Screenshot success!");
        } catch (e) {
            console.error("Screenshot failed:", e);
        }

        console.log("Attempting evaluate...");
        try {
            const title = await mgPage.evaluate(() => document.title);
            console.log(`Page Title: ${title}`);
        } catch (e) {
            console.error("Evaluate failed:", e);
        }

    } else {
        console.log("MG Page not found in Playwright context.");
    }

    await browser.close();

  } catch (err) {
    console.error("Connection failed:", err);
  }
}

main();
