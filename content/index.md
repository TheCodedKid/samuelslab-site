---
publish: true
title: Samuel’s Lab
aliases:
  - Samuel’s Lab
---
Hi :], my name is Samuel. Welcome to my laboratory.

This is a work in progress, and I braindump on here a lot, so it may be messy on some pages, I sorry.

## now
- [[Code/web.samtalks.us|web.samtalks.us]]
- [[Resources/Samuel’s Keyboard Palace/Samuel’s Keyboard Palace|Samuel’s Keyboard Palace]]
- [[Writeups/Nix|Nix]]

## finished projects
```base
filters:
  and:
    - status == "finished"
formulas:
  sort_year: if(year, year, 0)
views:
  - type: list
    name: Finished projects
    order:
      - file.name
      - description
      - tags
      - year
    sort:
      - property: formula.sort_year
        direction: DESC
      - property: file.name
        direction: ASC
    limit: 6
```
[[main/Projects|all →]]

## writeups
```base
filters:
  and:
    - kind == "writeup"
views:
  - type: list
    name: Writeups
    order:
      - file.name
    sort:
      - property: file.mtime
        direction: DESC
    limit: 3
```
[[main/Writeups|all →]]
