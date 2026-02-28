---
marp: true
theme: uncover-minimal
paginate: true
math: katex
themes: [uncover-minimal]
---

# Marp Examples

Complete demonstration of Marp presentation capabilities

---

## Table of Contents

<!-- This auto-generates a table of contents -->
1. [Basic Formatting](#basic-formatting)
2. [Lists](#lists)
3. [Quotes and Footnotes](#quotes-and-footnotes)
4. [Code](#code)
5. [Tables](#tables)
6. [LaTeX Formulas](#latex-formulas)
7. [Images](#images)
8. [Multi-column Layouts](#multi-column-layouts)
9. [Backgrounds and Styling](#backgrounds-and-styling)
10. [Fragments (Animations)](#fragments-animations)

---

## Basic Formatting

### Headings work like regular Markdown

This is **bold text** and this is *italic text*.

You can also use ~~strikethrough~~ and `inline code`.

---

## Lists

### Unordered Lists

- First item
- Second item
  - Nested item
  - Another nested item
- Third item

### Ordered Lists

1. First step
2. Second step
3. Third step

---

## Quotes and Footnotes

> This is a blockquote.
> It can span multiple lines.
>
> — Author Name

Here's a sentence with a footnote[^1].

[^1]: This is the footnote content that appears at the bottom.

---

## Code

### JavaScript

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}

greet('Marp');
```

### Python

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

---

## Tables


### Simple Table

| Feature | Status | Notes |
|---------|--------|-------|
| Markdown | Yes | Full support |
| Code blocks | Yes | Syntax highlighting |
| Images | Yes | Local and remote |
| Math | Yes | KaTeX support |

---

## Tables

### Aligned Columns

| Left | Center | Right |
|:-----|:------:|------:|
| Default | Centered | Numbers |
| Text | Text | 1,234 |
| More | Data | 5,678 |



---

## LaTeX Formulas

### Inline and Block Math

Inline formula: $E = mc^2$

Block formula:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

---
## LaTeX Formulas

### More Examples

Quadratic formula:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Matrix:

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$

---

## Images

### Basic Image

![Demo image](static/demo-image.png)

---

## Images

### Sized Image

![width:300px](static/demo-image.png)

---

## Multi-column Layouts

### Using HTML Tables

<table>
<tr>
<td>

**Left Column**

- Point one
- Point two
- Point three

</td>
<td>

**Right Column**

- Another point
- More content
- Final item

</td>
</tr>
</table>

---

## Backgrounds and Styling

<!-- _backgroundColor: #1a1a2e -->
<!-- _color: #eaeaea -->

### Dark Slide

This slide has a custom dark background and light text color.

You can use HTML color codes or named colors.

---

<!-- _backgroundImage: url('static/demo-image.png') -->
<!-- _backgroundOpacity: 0.3 -->

### Image Background

This slide has an image background with reduced opacity.

---

## Fragments (Animations)

Use asterisk `*` for incremental reveal:

* This appears first
* This appears second
* This appears third
* This appears last

Press space to reveal each item!

---

<!-- _paginate: false -->

# Thank You!

## Questions?

- GitHub: https://github.com/marp-team/marp
- Docs: https://marp.app/

```
Contact: your-email@example.com
```
