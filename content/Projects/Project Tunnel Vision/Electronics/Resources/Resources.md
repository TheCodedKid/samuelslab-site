---
publish: true
---
[**Control an 8x8 matrix of LEDs**](https://docs.arduino.cc/built-in-examples/display/RowColumnScanning)

Most (if not all) matrix systems such utilize something veyr similiar to what you see below:

![[Media/Untitled 28.png|Untitled 28.png]]

Figure 1: A typically electronic matrix configuration

There is a fair amount of logic that needs to go between the matrix and then microcontroller to get this to work properly. Thankfully, I don’t need to think about that part too much.

The [**IS31FL3731**](https://www.lumissil.com/assets/pdf/core/IS31FL3731_DS.pdf) is the perfect solution for this, as it can drive up to 144 led
