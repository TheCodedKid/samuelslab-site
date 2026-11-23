---
publish: true
---
project ideas to build while learning rust, or just cool things to make

---

**generic chinese smart ring crate**

those cheap BLE health rings flooding aliexpress/temu all use the same undocumented protocol. someone reverse engineered it and the internals are surprisingly simple — GATT service `0x56ff`, cleartext, no encryption. write commands to `0x33f3`, read notifications from `0x33f4`. 20-byte packets: byte 0 is command ID, rest is little-endian payload zero-padded.

commands worth implementing:

| command | ID |
|---|---|
| time sync | `0x01` |
| activity query | `0x02` |
| live heart rate stream | `0x14` / stop `0x15` |
| SpO2 | `0x23` |
| sleep timeline | `0x11` |
| activity timeline | `0x13` |
| set step goal | `0x1a` |
| find ring | `0x04` |

battery level uses standard BLE Battery Service `0x180F` separately.

in rust, `btleplug` handles cross-platform BLE (linux/mac/windows). crate would expose async streams for HR/SpO2 and typed structs for activity data. reference reverse engineering: [pulseloopios BLE diagram](https://github.com/jesbin/pulseloopios/blob/main/docs/ble-interaction.png)

---

[[Resources/Learning Rust/Learning Rust|Learning Rust]]
