---
publish: true
---
# Stick MP3 Player Project

This document outlines the concept and components for a portable MP3 player project, tentatively named "Stick MP3".

## Core Concept

A compact, portable MP3 player. Potential features include Bluetooth connectivity and the ability to shuffle songs from a specific year.

## Hardware Components

### Microcontroller

*   **Option 1 (with Bluetooth):** nRF52840
*   **Option 2 (without Bluetooth):** RP2040

### Audio Components

*   **Amplifier:** PAM8302A
*   **DAC (Digital-to-Analog Converter):** PCM5100A
    *   [ROHM Semiconductor BU94502CMUV-E2](https://www.mouser.com/ProductDetail/ROHM-Semiconductor/BU94502CMUV-E2?qs=4v%252BiZTmLVHG%252BRmo6ShTdsA%3D%3D)
    *   [ROHM Semiconductor BU94502AMUV-E2](https://www.mouser.com/ProductDetail/ROHM-Semiconductor/BU94502AMUV-E2?qs=FwrL%252BevIYAbtZW/qPiZaGg%3D%3D)

### Display

*   **Screen:** Monochrome LCD
    *   [Display Visions EA-DOGM132L-5](https://www.digikey.com/en/products/detail/display-visions/EA-DOGM132L-5/4896710)
    *   [Display Visions EA-DOGM132W-5](https://www.digikey.com/en/products/detail/display-visions/EA-DOGM132W-5/4896712)

### Other Components

*   **Buzzer (Optional):**
    *   [CUI Devices CMI-9705-0380-SMT-TR](https://www.digikey.com/en/products/detail/cui-devices/CMI-9705-0380-SMT-TR/10326194)

## Inspiration and Related Projects

*   **"Bumpy" Project:** [https://www.mattkeeter.com/projects/bumpy/](https://www.mattkeeter.com/projects/bumpy/)
*   **PicoADK Hardware (Synth):** [https://github.com/DatanoiseTV/PicoADK-Hardware?tab=readme-ov-file](https://github.com/DatanoiseTV/PicoADK-Hardware?tab=readme-ov-file)
*   **YouTube Discussion on Pi Pico Audio:** [https://www.youtube.com/watch?v=Oh3nYZvKaAM&t=560s](https://www.youtube.com/watch?v=Oh3nYZvKaAM&t=560s)
*   **Reddit Embedded Discussion:** [https://www.reddit.com/r/embedded/comments/12bnnr8/pi_pico_audio_project_could_use_advice/](https://www.reddit.com/r/embedded/comments/12bnnr8/pi_pico_audio_project_could_use_advice/)
*   **Arduino Pico Discussions:** [https://github.com/earlephilhower/arduino-pico/discussions/1854](https://github.com/earlephilhower/arduino-pico/discussions/1854)
*   **Raspberry Pi Forums:** [https://forums.raspberrypi.com/viewtopic.php?t=342419](https://forums.raspberrypi.com/viewtopic.php?t=342419)
*   **YouTube - Pico Audio Project:** [https://www.youtube.com/watch?v=CgqECxhqJEo](https://www.youtube.com/watch?v=CgqECxhqJEo)
## Coding Resources

### Rust

*   **YouTube Tutorial:** [https://www.youtube.com/watch?v=Yi0WRF5WPFw](https://www.youtube.com/watch?v=Yi0WRF5WPFw)
*   **Raspberry Pi Forums:** [https://forums.raspberrypi.com/viewtopic.php?t=337270](https://forums.raspberrypi.com/viewtopic.php?t=337270)
*   **Rust Crate (threepm):** [https://lib.rs/crates/threepm](https://lib.rs/crates/threepm)
*   **GitHub (pico-PDM):** [https://github.com/AkiyukiOkayasu/pico-PDM](https://github.com/AkiyukiOkayasu/pico-PDM)
*   **Reddit (Rust):** [https://www.reddit.com/r/rust/comments/18w4g37/how_to_repeatedly_send_the_same_values_for_the/](https://www.reddit.com/r/rust/comments/18w4g37/how_to_repeatedly_send_the_same_values_for_the/)
*   **Rust Crate (optivorbis):** [https://lib.rs/crates/optivorbis](https://lib.rs/crates/optivorbis)
*   **Docs.rs (ssd1306):** [https://docs.rs/ssd1306/latest/ssd1306/](https://docs.rs/ssd1306/latest/ssd1306/) (For screen driver)

### MicroPython

*   **GitHub (micropython-i2s-examples):** [https://github.com/miketeachman/micropython-i2s-examples](https://github.com/miketeachman/micropython-i2s-examples)
*   **YouTube:** [https://www.youtube.com/watch?v=fH23Kvl_o_o](https://www.youtube.com/watch?v=fH23Kvl_o_o)
*   **YouTube:** [https://www.youtube.com/watch?v=YqFRxxXMS_Q](https://www.youtube.com/watch?v=YqFRxxXMS_Q)

### CircuitPython

*   **Adafruit Learning System (MP3 Playback RP2040):** [https://learn.adafruit.com/mp3-playback-rp2040/pico-i2s-mp3](https://learn.adafruit.com/mp3-playback-rp2040/pico-i2s-mp3)
