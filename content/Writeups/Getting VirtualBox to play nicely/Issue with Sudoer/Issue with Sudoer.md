---
publish: true
---
It happens, we just need to fix so that your user can run commands.

In the terminal, type:

```Bash
su
```

A password prompt will show up. Type the password and hit enter.

**Note: the password prompt will not type the characters on the display. This is for security reasons.

Then type:

```Bash
visudo
```

This will bring up the sudoer.d file in nano, which is a text editor. Using the arrow keys, scroll to the bottom right of the file. It should look something like this:

![[Media/Untitled 17.png|Untitled 17.png]]

Add the line that you see here, replacing the user “samuel” with your own. Type it exactly as your username is, with caps included if there are any.

Once that is done, hit Ctrl + O, and then hit enter. This is overwriting the previous save with what you added. Then hit Ctrl + X to exit.

Then type exit to exit the su terminal, and you should be placed right back into your normal prompt. To confirm that the error is fixed, type:

```Bash
sudo whoami
```

![[Media/Untitled 1 3.png|Untitled 1 3.png]]
