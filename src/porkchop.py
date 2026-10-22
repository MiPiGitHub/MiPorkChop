#!/usr/bin/env python3
"""MiPorkChop 0.1: local guarded switch and status LED.

Hardware: Raspberry Pi 4B
- Maintained SPST switch: BCM GPIO17 (physical pin 11) to GND (pin 9).
- Green LED: BCM GPIO27 (physical pin 13) through a 330-ohm resistor
  to LED anode (+); LED cathode (-) to GND (physical pin 14).
- Switch CLOSED = BUZZIN'; switch OPEN = NOT BUZZIN'.
- No external voltage is connected to GPIO pins.

No cloud access, credentials, or network connectivity are required.
"""

import logging
import signal
import threading

from gpiozero import Button, LED

SWITCH_GPIO = 17
LED_GPIO = 27
BOUNCE_SECONDS = 0.05

logger = logging.getLogger("miporkchop")


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    stop_event = threading.Event()

    def request_stop(signum: int, _frame: object) -> None:
        logger.info("Received signal %s; shutting down", signum)
        stop_event.set()

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)

    # pull_up=True: open switch reads HIGH; closed-to-ground reads LOW.
    # Button.is_pressed is True when the contact closes to ground.
    with Button(SWITCH_GPIO, pull_up=True, bounce_time=BOUNCE_SECONDS) as switch:
        with LED(LED_GPIO, initial_value=False) as status_led:

            def apply_switch_state() -> None:
                buzzin = switch.is_pressed
                if buzzin:
                    status_led.on()
                else:
                    status_led.off()
                logger.info(
                    "Physical switch: %s | Green LED: %s",
                    "CLOSED / BOYS ARE BUZZIN'" if buzzin else "OPEN / NOT BUZZIN'",
                    "ON" if buzzin else "OFF",
                )

            switch.when_pressed = apply_switch_state
            switch.when_released = apply_switch_state
            apply_switch_state()  # Restore the physical state after boot.
            logger.info("MiPorkChop 0.1 ready. Press Ctrl+C to stop.")
            stop_event.wait()

    logger.info("MiPorkChop stopped; LED released.")


if __name__ == "__main__":
    main()
