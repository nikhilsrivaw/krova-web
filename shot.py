import asyncio, sys, re
from playwright.async_api import async_playwright
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1280, "height": 900})
        await pg.goto("https://www.aqirox.com", wait_until="networkidle")
        await pg.wait_for_timeout(2000)
        txt = await pg.inner_text("body")
        print("=== CLAIMS THAT NEED EVIDENCE ===")
        for pat in [r"\d+\+?\s*(ACTIVE USERS|USERS|CLIENTS|BUSINESSES)", r"\d\.\d\s*/\s*5",
                    r"[+-]?\d+%", r"\bISO\b", r"\bSOC\b", r"certified", r"trusted by"]:
            for m in set(re.findall(pat, txt, re.I)):
                print("  ", m)
        print()
        print("=== FULL TEXT (rest) ===")
        print(txt[900:3200])
        await b.close()

asyncio.run(main())
