---
publish: true
status: finished
description: >-
  Linux shell + USB driver that only opens a session while an RP2040 'staff' is
  plugged in
tags:
  - embedded
  - hardware
repo: 'https://github.com/TheCodedKid/thewizardkit'
---
_"OOM"_

## Intro

[The Wizard Kit](https://github.com/TheCodedKid/thewizardkit) is a shell/driver combo for a more secure way to use Linux. An RP2040 board acts as the "key" or "wizard staff" — the Linux module sees probe and disconnect events from it, and a custom shell listens to those events to gate access. The shell only becomes accessible while the device is connected.

Co-authored with [@RaidToRadar](https://github.com/RaidToRadar).

## The cheese

The two halves:

- **Driver** — a USB device driver that surfaces probe/disconnect events for the RP2040 staff.
- **Shell** — listens to those events and only opens an interactive session while the staff is plugged in. Yank the staff, lose the shell.

## Resources

- [Repo](https://github.com/TheCodedKid/thewizardkit)
- [Writing a Simple USB Driver](https://www.linuxjournal.com/article/7353)
- [Writing USB Device Drivers (kernel docs)](https://docs.kernel.org/driver-api/usb/writing_usb_driver.html)
- [USB Device Driver Example – Embetronicx Part 34](https://embetronicx.com/tutorials/linux/device-drivers/usb-device-driver-example/)
- [AcollaMolla/USB-driver](https://github.com/AcollaMolla/USB-driver)

---
[[main/Code|Code]]
