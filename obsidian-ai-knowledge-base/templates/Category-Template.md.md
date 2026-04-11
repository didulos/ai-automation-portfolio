---
type: category
---

# {{title}}

## 이 분야의 핵심 용어들

```dataview
TABLE category, status
FROM "01-Terms"
WHERE contains(category, this.file.name)
SORT file.name ASC