"""
EcoSort AI - TACO Dataset Downloader (Sequential / Polite Mode)
================================================================
Why sequential?  Flickr rate-limits by IP.  Running 3+ parallel
workers is equivalent to sending a burst — every burst triggers
a 429.  One worker with a ~1.5 s pause between requests stays
well inside the limit and typically downloads at 0.5–1 image/s.

Estimated time for 1500 images:  ~40–50 minutes total
(already-downloaded images are skipped instantly).

Usage (run from EcoSortAI root):
    python datasets/download_taco.py
"""

import json
import ssl
import time
import urllib.request
import urllib.error
from pathlib import Path


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT    = Path(__file__).resolve().parent
RAW_DIR         = PROJECT_ROOT / "raw" / "taco" / "data"
ANNOTATIONS_URL = (
    "https://raw.githubusercontent.com/"
    "pedropro/TACO/master/data/annotations.json"
)
ANNOTATIONS_FILE = RAW_DIR / "annotations.json"


# ============================================================
# TUNING  (one worker, polite delay — avoids all 429s)
# ============================================================

POLITE_DELAY  = 1.5   # seconds between every request
ON_429_WAIT   = 60    # seconds to cool down after a 429
MAX_RETRIES   = 3     # per image
TIMEOUT       = 60    # seconds per HTTP request


# ============================================================
# SSL  (relaxed — some Flickr CDN nodes have quirky certs)
# ============================================================

_SSL_CTX               = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode    = ssl.CERT_NONE

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; EcoSortAI/3.0; "
        "+https://github.com/ecosortai)"
    )
}


# ============================================================
# DOWNLOAD ONE FILE  (sequential, with retry)
# ============================================================

def download_one(url: str, dest: Path) -> str:
    """
    Returns  'ok'      on success
             'skipped' if the file already exists
             'failed'  after all retries are exhausted
    """

    # Already have it?
    if dest.exists() and dest.stat().st_size > 0:
        return "skipped"

    dest.parent.mkdir(parents=True, exist_ok=True)

    for attempt in range(1, MAX_RETRIES + 1):

        try:
            req = urllib.request.Request(url, headers=_HEADERS)

            with urllib.request.urlopen(
                req, timeout=TIMEOUT, context=_SSL_CTX
            ) as resp:
                dest.write_bytes(resp.read())

            return "ok"

        except urllib.error.HTTPError as exc:

            if exc.code == 429:
                # Read Retry-After if server sent one
                retry_after = exc.headers.get("Retry-After", None)
                wait = int(retry_after) if retry_after else ON_429_WAIT

                print(
                    f"    [429] Cooling down {wait}s "
                    f"(attempt {attempt}/{MAX_RETRIES})  "
                    f"{dest.name}"
                )
                time.sleep(wait)

            elif exc.code in (403, 404, 410):
                # Permanent — don't waste retries
                return "failed"

            else:
                print(
                    f"    [HTTP {exc.code}] "
                    f"attempt {attempt}/{MAX_RETRIES}  {dest.name}"
                )
                time.sleep(POLITE_DELAY * 2)

        except Exception as exc:
            print(
                f"    [{type(exc).__name__}] "
                f"attempt {attempt}/{MAX_RETRIES}  {dest.name}"
            )
            time.sleep(POLITE_DELAY * attempt)

    return "failed"


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("EcoSort AI - TACO Downloader (Sequential / Polite)")
    print("=" * 60)

    RAW_DIR.mkdir(parents=True, exist_ok=True)


    # --------------------------------------------------------
    # Step 1 — annotations.json
    # --------------------------------------------------------

    print()
    print("Step 1: annotations.json ...")

    if not ANNOTATIONS_FILE.exists():
        ok = download_one(ANNOTATIONS_URL, ANNOTATIONS_FILE)
        if ok == "failed":
            print("  ERROR: Could not download annotations.json")
            return
    else:
        print("  Already exists — skipping.")


    # --------------------------------------------------------
    # Step 2 — Build task list
    # --------------------------------------------------------

    with open(ANNOTATIONS_FILE, "r", encoding="utf-8") as f:
        coco = json.load(f)

    all_images = coco.get("images", [])
    print(f"\nStep 2: {len(all_images)} images in dataset")

    tasks = []
    already = 0

    for img in all_images:
        url  = img.get("flickr_url") or img.get("coco_url", "")
        name = img.get("file_name", "")
        if not url or not name:
            continue
        dest = RAW_DIR / name
        if dest.exists() and dest.stat().st_size > 0:
            already += 1
        else:
            tasks.append((url, dest))

    print(f"  Already downloaded : {already}")
    print(f"  Remaining to fetch : {len(tasks)}")

    if not tasks:
        print("\n  All images present — nothing to do.")
        print("  Run the next pipeline step:")
        print("    python ai/preprocessing/convert_coco_to_yolo.py")
        return

    eta_min = len(tasks) * (POLITE_DELAY + 0.5) / 60
    print(f"  Estimated time     : ~{eta_min:.0f} min  "
          f"(at {POLITE_DELAY}s gap + download time)")


    # --------------------------------------------------------
    # Step 3 — Sequential download
    # --------------------------------------------------------

    print()
    print("Step 3: Downloading images (sequential, 1.5s gap) ...")
    print("-" * 60)

    ok_count   = 0
    fail_count = 0
    start_time = time.time()

    for i, (url, dest) in enumerate(tasks, 1):

        status = download_one(url, dest)

        if status == "ok":
            ok_count += 1
        else:
            fail_count += 1

        # Progress line every 10 images
        if i % 10 == 0 or i == len(tasks):
            elapsed = time.time() - start_time
            done    = already + ok_count
            total   = len(all_images)
            pct     = done / total * 100
            speed   = ok_count / elapsed * 60 if elapsed > 0 else 0

            print(
                f"  [{pct:5.1f}%]  {done}/{total}  "
                f"| +{ok_count} downloaded  "
                f"| {fail_count} failed  "
                f"| {speed:.1f} img/min"
            )

        # Polite delay — keep Flickr happy
        if status != "failed":
            time.sleep(POLITE_DELAY)


    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    elapsed_total = time.time() - start_time

    print()
    print("=" * 60)
    print("DOWNLOAD COMPLETE")
    print("=" * 60)
    print(f"  Downloaded : {ok_count}")
    print(f"  Already had: {already}")
    print(f"  Failed     : {fail_count}  (Flickr deleted / private)")
    print(f"  Time taken : {elapsed_total/60:.1f} min")

    total_ok = already + ok_count
    print(f"\n  Total usable images: {total_ok}")

    if fail_count > 0:
        print(
            "\n  TIP: Re-run this script to retry failed images.\n"
            "  You can safely proceed with the pipeline now —\n"
            "  the converter skips images that weren't downloaded."
        )

    print()
    print("Next step:")
    print("  python ai/preprocessing/convert_coco_to_yolo.py")


if __name__ == "__main__":
    main()
