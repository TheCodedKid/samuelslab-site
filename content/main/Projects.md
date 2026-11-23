---
publish: true
---
_things I've built or am still building_

Things I've built, am building, or shelved with most of the work done.

## finished
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
```

## in progress
- [[Projects/Project Tunnel Vision/Project Tunnel Vision|Project Tunnel Vision]]
- [[Projects/Server Build/Server Build|Server Build]]

---
[[index|Samuel’s Lab]]
