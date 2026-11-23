---
publish: true
---
_"Connecting tomorrow is fun until you sit in the server room with no headphones"_

## Intro

[5gstartup](https://github.com/TheCodedKid/5gstartup) — the **ComSovereign 5G Startup and Interface Script (5GSIS)**. A Python 3 script to manage and ensure proper deployment of ComSovereign's 5G Mini Tower system.

The problem: bringing the device up from a complete shutdown takes time, and certain configurations have to be re-entered on every deployment. Leaving the machine on isn't great either — too many Linux services to configure properly, and the unit is transported often. This script is the temporary solution: faster, more reliable startup and ongoing management of the GnB and Core module backend.

## The cheese

Python 3, leans on [Paramiko](https://www.paramiko.org/) (SSH) and [pySerial](https://pyserial.readthedocs.io/en/latest/) (serial).

One-shot run:

```bash
python3 main.py
```

Service user (WIP):

```bash
useradd 5gstartup
```

## Resources

- [Repo](https://github.com/TheCodedKid/5gstartup)
- [Paramiko](https://www.paramiko.org/)
- [pySerial](https://pyserial.readthedocs.io/en/latest/)

---
[[main/Code|Code]]
