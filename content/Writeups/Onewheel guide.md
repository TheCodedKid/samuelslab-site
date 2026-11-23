---
publish: true
kind: writeup
---
*Yo, what's up Thomas*
Writing this for a dude I sold my onewheel to, sorta kinda guide thing.

### Voltage Reference Chart
![[Media/Pasted image 20260915001658.png|376]]
## Reading Pint battery voltage with Nosedive

[Nosedive](https://getnosedive.com/) is a third-party iPhone and Apple Watch app that can connect directly to a Onewheel over Bluetooth. On an older, unpatched original Pint, it can show the battery pack voltage that the controller broadcasts over BLE.

> [!warning] Do not update a compatible Pint
> Original Pint firmware **Gemini 5050 and older** still sends pack voltage over BLE. Future Motion removed that value starting with **Gemini 5059**, according to the OWCE compatibility documentation. That means 5059, 5069, the 5100 Haptic Buzz firmware, and newer releases cannot provide this value to Nosedive through the stock controller's BLE connection.
>
> Updating the phone app and updating the board's firmware are different things. Do not approve a **board firmware** update if preserving voltage telemetry or mod compatibility matters. If the official Onewheel app presents an update screen, close it and use Nosedive instead.

### Reading the voltage

1. Install [Nosedive from the App Store](https://apps.apple.com/app/id6752789126).
2. Turn on the Pint and enable Bluetooth on the phone.
3. Fully close the official Onewheel app so it does not hold the board's Bluetooth connection (if you have it installed).
4. Open Nosedive, connect to the board, and add/open the battery-voltage reading in the board display.
5. For the most useful state-of-charge reading, check the voltage while stopped and dismounted. Voltage sags under acceleration, hills, cold weather, and other heavy loads.

The stock Pint uses a 15-series lithium-ion pack and reaches about **63 V when fully charged**. Voltage is useful for checking an extended-range battery when the displayed percentage is wrong, but it is not an exact fuel gauge and pack voltage alone cannot reveal a weak individual cell. Always obey low-battery pushback and board/BMS warnings.

### If Nosedive does not show voltage

Check the firmware number in the board information/diagnostics screen. On an original Pint running **5059 or newer**, a blank or unavailable voltage field is expected—the board is no longer transmitting that value. This is a firmware limitation, not a Nosedive setting.

There is no normal app toggle that turns the missing BLE characteristic back on. The practical options are:

- **Only need battery diagnostics:** install a read-only [OWIE Gum Stick](https://avaspark.com/products/owie-gum-stick-xr-pint), or build the open-source [OWIE](https://github.com/lolwheel/Owie) hardware. It reads the BMS and exposes pack voltage, current, and individual cell voltages over its own Wi-Fi page. This works around the missing telemetry, but it **does not restore stock BLE voltage inside Nosedive**.
- **On firmware older than Gemini 5100:** [ReWheel/FFMWheel](https://www.fixmypev.com/diy/onewheel/rewheel/) may be able to flash a compatible older or patched Pint firmware over Bluetooth. Back up the board's settings and encryption key first and verify the exact firmware/bootloader support. A failed flash can brick the controller.
- **On Gemini 5100 or newer:** normal Bluetooth ReWheel is not compatible. The community [Pint/Pint X Unlocker](https://owtk.pages.dev/) can check whether the board's bootloader supports the separate downgrade process. Stop if it reports the board as incompatible; the safer route is an experienced independent Onewheel/PEV repair technician.
- **For extensive battery or controller mods:** use only a BMS-interposer whose vendor explicitly supports the installed firmware, or convert the board to a VESC-based controller. A VESC conversion replaces the Future Motion controller/firmware limitation entirely, and Nosedive officially supports VESC boards, but this is a full controls-and-tuning project rather than a quick fix.

> [!danger] Firmware and battery modifications
> Downgrading can remove Haptic Buzz and other safety behavior. Opening the battery enclosure, intercepting BMS wiring, or flashing firmware can void service/warranty support and can cause a fire, controller damage, or a sudden cutout if done incorrectly. Verify compatibility before buying parts, and do not treat a voltage display as protection against a nosedive.

### Sources

- [Nosedive official site](https://getnosedive.com/) and [App Store listing](https://apps.apple.com/app/id6752789126)
- [OWCE README—firmware versions that no longer send voltage](https://github.com/OnewheelCommunityEdition/OWCE_App#readme)
- [OWCE firmware-update FAQ](https://owce.app/faq/unofficial_app_update)
- [Known Pint hardware/firmware list](https://owce.app/hwfw)
- [OWIE project and installation notes](https://github.com/lolwheel/Owie)
- [FixMyPEV ReWheel compatibility guide](https://www.fixmypev.com/diy/onewheel/rewheel/)
- [FixMyPEV Pint/Pint X downgrade overview](https://www.youtube.com/watch?v=kMA3nA1Ymkg)
