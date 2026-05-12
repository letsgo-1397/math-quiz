"""
生成 PDF。

用法1 — 从题库按 ID 导出:
    python tools/export_pdf.py 1 3 6

用法2 — 从 Markdown 文件导出:
    python tools/export_pdf.py exports/数学练习.md
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROBLEMS_PATH = ROOT / "problems.json"
OUTPUT_DIR = ROOT / "exports"
OUTPUT_DIR.mkdir(exist_ok=True)


def difficulty_stars(level):
    return "★" * level + "☆" * (3 - level)


def render_body(body):
    if isinstance(body, list):
        return "\n\n".join(body)
    return body


def problem_to_markdown(problem):
    lines = []
    lines.append(f"## 题目 {problem['id']}")
    lines.append("")
    lines.append(f"**章节**:{problem['chapter']} | **难度**:{difficulty_stars(problem['difficulty'])}")
    lines.append("")
    lines.append(render_body(problem["body"]))
    lines.append("")
    lines.append("### 解析")
    lines.append("")
    for step in problem["solution"]:
        lines.append(step)
        lines.append("")
    return "\n".join(lines)


def run_pandoc(md_path, pdf_path):
    cmd = [
        "pandoc",
        str(md_path),
        "-f", "markdown+tex_math_dollars",
        "-o", str(pdf_path),
        "--pdf-engine=xelatex",
        "-V", "CJKmainfont=Microsoft YaHei",
        "-V", "mainfont=Times New Roman",
        "-V", "geometry:margin=2cm",
        "-V", "fontsize=12pt",
    ]
    print(f"正在生成: {pdf_path.name}")
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        print("生成失败:")
        print(result.stderr)
        sys.exit(1)
    print(f"完成 → {pdf_path}")


def file_mode(md_path):
    md_path = Path(md_path)
    if not md_path.exists():
        print(f"文件不存在: {md_path}")
        sys.exit(1)
    pdf_path = OUTPUT_DIR / md_path.with_suffix(".pdf").name
    run_pandoc(md_path, pdf_path)


def id_mode(ids):
    problems = json.loads(PROBLEMS_PATH.read_text(encoding="utf-8"))

    selected = []
    for pid in ids:
        found = next((p for p in problems if p["id"] == pid), None)
        if found is None:
            print(f"警告:找不到题目 id = {pid}")
            continue
        selected.append(found)

    if not selected:
        print("没有有效题目,退出")
        sys.exit(1)

    title = f"# 数学练习({len(selected)} 道)\n\n"
    markdown = title + "\n".join(problem_to_markdown(p) for p in selected)

    md_path = OUTPUT_DIR / "_temp.md"
    md_path.write_text(markdown, encoding="utf-8")

    pdf_name = "练习_" + "_".join(str(i) for i in ids) + ".pdf"
    pdf_path = OUTPUT_DIR / pdf_name
    run_pandoc(md_path, pdf_path)


def main():
    if len(sys.argv) < 2:
        print("用法:")
        print("  python tools/export_pdf.py 1 3 6")
        print("  python tools/export_pdf.py exports/数学练习.md")
        sys.exit(1)

    first_arg = sys.argv[1]

    if first_arg.endswith(".md"):
        file_mode(first_arg)
    else:
        ids = [int(x) for x in sys.argv[1:]]
        id_mode(ids)


if __name__ == "__main__":
    main()
