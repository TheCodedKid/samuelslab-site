---
publish: true
---
## What is a keyboard?

So, I figured I should try Notion’s AI feature for what a keyboard is. Let’s see how it does:

_Prompt: what is a keyboard?_

> _A keyboard is a device that allows you to input text and commands into a computer or other electronic device. It typically consists of a set of keys that correspond to letters, numbers, and symbols, as well as various function keys and other special keys. When a key is pressed, it sends a signal to the computer, which then interprets the signal and performs the corresponding action or inputs the corresponding character._

Hmm, not bad. We can looking into this a bit more by asking a more specific question.

_Prompt: what is a mechanical keyboard?_

> _A mechanical keyboard is a type of keyboard that uses individual mechanical switches under each key instead of a rubber membrane. These switches provide a tactile and auditory feedback when a key is pressed, and are generally considered to be more durable and satisfying to type on than rubber dome keyboards. Mechanical keyboards are popular among gamers, writers, and other users who require a high level of precision and responsiveness from their keyboards._

Alright, also not bad. But there is a couple things in this response that I can comment on.

> …_uses individual mechanical switches under each key instead of a rubber membrane._

This is speaking in the sense of a _membrane_ keyboard, and they are generally very common. I myself don’t have any issues with them, as I do enjoy working with them just as much as mechanicals. It’s all preference. I am one to agree with anyone’s comfort in what they used, especially if they understand a majority of the options out there.

> _These switches provide a tactile and auditory feedback when a key is pressed…_

_Some_ do, and I mean both descriptions in this case. There are three main classes of mechanical switches: _linear, tactile,_ and _clicky_. In a way, clicky sits under tactile, as this is more of a sound characteristic than a feel, but these are generally the terms people look for when asking/speaking about the matter.

Auditory is also something that can not be associated directly 100% of the time to it’s class. Some switches can be (annoyingly) loud, such as _some_ clicky switches. Others can be designed to be silent, dubbed _silent_ switches (how fitting). There are many different terms that people use to describe the sound of a keyboard/switch. _Thocky_ is a very popular term, and is more often than not completely due to the switch entirely, rather the entire keyboard itself. It can be a deep thock, or a light thock. Creamy, smooth, pingy (you don’t want this), full, hollow (you also don’t want this), there are many different kinds of words used to describe.

  

At this point, you might have some idea as to _why_ one would build a custom keyboard. Kinda like what I said before:

> It’s all preference.

Sound, feel, look, man even smell (joke, now laugh). While it _can_ be a rather expensive hobby, you are literally talking to dorks that sit on their PCs (and work on them too), like me :]. Now, while that may seem like a jab at the community, there are some legitimate reasons to consider:

- Longevity
    - When I was growing up, learning how to build things, my father always believed in “building things that last”. I think that kinda rub off on me. Sure, your first one may not be the best, but making things “last” also means that you may have to fix it from time to time. Which is ok, that’s the cool part, you know how it was built, so naturally, you might know some way to fix it. And if not, I bet the internet does.
    - Guys, typing alot can be hard on the human hands, and there are whole diseases that can be an issue if not properly considered ([here](https://www.mayoclinic.org/diseases-conditions/carpal-tunnel-syndrome/symptoms-causes/syc-20355603)). You might already have on of these issues, but you still need to use a keyboard. Keyboards can be support to prevent and/or relieve the stress of an already painful set of typing hands.
- Looks
    - I know, I know. But I really do believe that if everything in my setup was navy blue, pink, or a color complement of those two (wild selection), I would be the happiest nerd alive. Now granted, I think I am one of the happiest nerds alive, but this would ice the cake. Having a color scheme within a keyboard that you worked hard to build, that is really something let me tell you. This is after you consider different mats, cables, decor, themes, etc.
- Education/you literary built it
    
    - Do things because you want to learn. That is the neat part about this process. Trust me, every time I put together one of these keyboards (which I have built many), there is always something new to learn. Yes, it is daunting, but that is why I am writing this. You build it, and it becomes your baby.
    
    ## How does it work?
    
    Yeah, yeah, I know. Sam going off on more electronic jargon. I promise I won’t go into it too much. :]
    
    Let’s look back at the quotes Notion gave early:
    
    > W_hen a key is pressed, it sends a signal to the computer…_
    
    Oh BOI, signals and interrupts and inputs. _Sounds just like college._
    
    A signal, as in an electronic signal, is sent to the computer utilizing the HID (human interface device) standard. Something within the keyboard is creating a signal that the computer can then understand. In order to do this, within the keyboard sits a smaller computer (wild concept, right?) called a _microcontroller._ There are a few different chips that everyone likes to use, such as the 32U4 (many different manufacturers make this chip) and the 2040 (one very cool company makes this chip). When creating the proper software to run on the computer, many tend to turn to [QMK](https://qmk.fm/). This kind of software is called _firmware,_ and there is a _huge_ amount of customizations that can be done with this software. (Look at the QMK Github, under the `keyboards` directory. That is the release of every public keyboard configuration using QMK.)
    
    > …_which then interprets the signal and performs the corresponding action…_
    
    So, actions can be alot of different things. Sure, the standard letters is a good start. What about volume control, or LED lighting control, or even [_macros_](https://www.howtogeek.com/802325/convenient-macros-for-your-keyboard/). All of this and more can be controlled through these actions assigned with the firmware or some kind of firmware interface, such as [VIA](https://www.caniusevia.com/) or [VIAL](https://get.vial.today/).
    
    > …_and performs the corresponding action or inputs the corresponding character._
    
    Ok so, I can geek out and tell you how computers have done this over the years, with the idea of character ROMs (a chip for just character storage, older computers use this such as the PET or VIC-20), but I won’t. Basically, HID handles this all for you, and by the power of ECE wizard hands, **_✧･ﾟit just works･ﾟ✧_**_._ (wizard gang).
    
      
    
    Now I hear you, “But Saaammmm, how does the keyboard’s microcontroller understand which keys are being pressed?” Ah, see this is possibly one of the coolest things I learned when I was studying, and it is called _multiplexing._ As nice as it would be to have a chip that can give a pin to every single switch on a keyboard, that is _normally_ not very possible.
    
    Now stay with me, PAY ATTENTION, I know I just said a sentence that may or may not have made sense. Let’s do an analogy to understand this system more clearly.
    
    _Think about a bunch of room, all of them have a light switch in the room_.
