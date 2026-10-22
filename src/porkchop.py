#!/usr/bin/env python3
"""MiPorkChop 0.3: GPIO switch, LED, and Cloudflare status heartbeat."""
import json
import logging
import os
import signal
import threading
import time
import urllib.error
import urllib.request
from gpiozero import Button, LED

SWITCH_GPIO = 17
LED_GPIO = 27
HEARTBEAT_SECONDS = 60
logger = logging.getLogger("miporkchop")

def post_status(url, token, state):
    data = json.dumps({"state": state}).encode("utf-8")
    request = urllib.request.Request(
        url.rstrip("/") + "/api/status", data=data,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        result = json.load(response)
        if not result.get("ok") or result.get("state") != state:
            raise ValueError("Unexpected Worker response")
    return result

def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    worker_url = os.environ.get("WORKER_URL", "").strip()
    token = os.environ.get("DEVICE_API_TOKEN", "").strip()
    if not worker_url.startswith("https://") or not token:
        raise SystemExit("WORKER_URL (https) and DEVICE_API_TOKEN are required")
    stop = threading.Event()
    changed = threading.Event()
    def shutdown(signum, frame):
        stop.set()
        changed.set()
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    with Button(SWITCH_GPIO, pull_up=True, bounce_time=0.05) as switch:
        with LED(LED_GPIO, initial_value=False) as led:
            def changed_callback():
                changed.set()
            switch.when_pressed = changed_callback
            switch.when_released = changed_callback
            changed.set()
            last_sent = None
            next_attempt = 0
            while not stop.is_set():
                state = "CLOSED" if switch.is_pressed else "OPEN"
                if state == "CLOSED":
                    led.on()
                else:
                    led.off()
                now = time.monotonic()
                if (changed.is_set() or last_sent is None or now >= next_attempt):
                    changed.clear()
                    try:
                        post_status(worker_url, token, state)
                        logger.info("Reported switch state %s", state)
                        last_sent = state
                        next_attempt = time.monotonic() + HEARTBEAT_SECONDS
                    except (urllib.error.URLError, ValueError, TimeoutError, OSError) as exc:
                        logger.warning("Status delivery failed (%s); retrying", type(exc).__name__)
                        next_attempt = time.monotonic() + 10
                # Wake for switch changes, retry, or heartbeat; GPIO callbacks never block on network.
                changed.wait(timeout=min(1, max(0, next_attempt - time.monotonic())))
            led.off()
    logger.info("Stopped and released GPIO")

if __name__ == "__main__":
    main()
