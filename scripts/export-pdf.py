#!/usr/bin/env python3
"""Export resume as PDF using Playwright.

Usage:
    python3 scripts/export-pdf.py                    # default: ~/Desktop/Tom_di_Mino_Resume.pdf
    python3 scripts/export-pdf.py -o resume.pdf      # custom output path
    python3 scripts/export-pdf.py --dev-server       # assume dev server is already running
"""
import argparse
import asyncio
import os
import subprocess
import sys
import time

DEV_SERVER_URL = "http://localhost:4321/resume"
DEFAULT_OUTPUT = os.path.expanduser("~/Desktop/Tom_di_Mino_Resume.pdf")


async def export_pdf(url: str, output_path: str) -> None:
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate and wait for all resources (fonts, images)
        await page.goto(url, wait_until="networkidle")

        # Force light theme (matches beforeprint handler)
        await page.evaluate("document.documentElement.setAttribute('data-theme', 'light')")

        # Strip inline animation styles — inView-triggered elements may
        # still have opacity:0 if they haven't been scrolled into view
        await page.evaluate("""
            document.querySelectorAll('[data-animate]').forEach(el => {
                el.style.opacity = '';
                el.style.transform = '';
            });
        """)

        # Let styles settle
        await asyncio.sleep(0.3)

        # Generate PDF — use @page size from CSS, zero margins here so
        # the CSS @page margins are the only ones applied
        await page.pdf(
            path=output_path,
            prefer_css_page_size=True,
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
            page_ranges="1-2",
        )

        await browser.close()
        print(f"PDF exported to {output_path}")


def wait_for_server(url: str, timeout: int = 30) -> bool:
    """Poll until the dev server responds."""
    import urllib.request
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(1)
    return False


def main():
    parser = argparse.ArgumentParser(description="Export resume as PDF")
    parser.add_argument("-o", "--output", default=DEFAULT_OUTPUT, help="Output PDF path")
    parser.add_argument("--dev-server", action="store_true", help="Assume dev server is already running")
    args = parser.parse_args()

    server_proc = None

    if not args.dev_server:
        # Check if server is already running
        try:
            import urllib.request
            urllib.request.urlopen(DEV_SERVER_URL, timeout=2)
            print("Dev server already running.")
        except Exception:
            print("Starting Astro dev server...")
            project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            server_proc = subprocess.Popen(
                ["npx", "astro", "dev", "--port", "4321"],
                cwd=project_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            if not wait_for_server(DEV_SERVER_URL):
                print("ERROR: Dev server failed to start within 30s", file=sys.stderr)
                server_proc.kill()
                sys.exit(1)
            print("Dev server ready.")

    try:
        asyncio.run(export_pdf(DEV_SERVER_URL, args.output))
    finally:
        if server_proc:
            server_proc.terminate()
            server_proc.wait(timeout=5)

    # Open the PDF for preview
    if sys.platform == "darwin":
        subprocess.run(["open", args.output])


if __name__ == "__main__":
    main()
