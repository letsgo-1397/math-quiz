"""
生成 Word (.docx)。

用法1 — 从题库按 ID 导出:
    python tools/export_docx.py 1 3 6

用法2 — 从 Markdown 文件导出 (配合网页"导出题目"按钮):
    python tools/export_docx.py exports/数学练习.md
"""

import base64
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROBLEMS_PATH = ROOT / "problems.json"
OUTPUT_DIR = ROOT / "exports"
OUTPUT_DIR.mkdir(exist_ok=True)

# 匹配 markdown 图片语法中的 base64 PNG: ![xxx](data:image/png;base64,...)
DATA_URI_RE = re.compile(r"!\[([^\]]*)\]\(data:image/png;base64,([^)]+)\)")


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


def extract_png_from_markdown(markdown, output_dir):
    """把 markdown 中的 base64 PNG data URI 提取存为文件,替换为文件引用."""
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    counter = 0

    def replace_match(match):
        nonlocal counter
        b64data = match.group(2)
        png_path = output_dir / f"_fig_{counter}.png"
        png_path.write_bytes(base64.b64decode(b64data))
        counter += 1
        return f"![]({png_path})"

    return DATA_URI_RE.sub(replace_match, markdown)


def run_pandoc(md_path, docx_path):
    cmd = [
        "pandoc",
        str(md_path),
        "-f", "markdown+tex_math_dollars",
        "-o", str(docx_path),
    ]
    print(f"正在生成: {docx_path.name}")
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        print("生成失败:")
        print(result.stderr)
        sys.exit(1)
    print(f"完成 → {docx_path}")


def file_mode(md_path):
    """直接转换 markdown 文件为 docx (配合网页导出)."""
    md_path = Path(md_path)
    if not md_path.exists():
        print(f"文件不存在: {md_path}")
        sys.exit(1)

    markdown = md_path.read_text(encoding="utf-8")
    markdown = extract_png_from_markdown(markdown, OUTPUT_DIR / "_figures")
    md_path = OUTPUT_DIR / "_processed.md"
    md_path.write_text(markdown, encoding="utf-8")

    docx_path = OUTPUT_DIR / Path(sys.argv[1]).with_suffix(".docx").name
    run_pandoc(md_path, docx_path)


def id_mode(ids):
    """从 problems.json 按 ID 选取题目导出 (原有模式)."""
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
    markdown = extract_png_from_markdown(markdown, OUTPUT_DIR / "_figures")

    md_path = OUTPUT_DIR / "_temp.md"
    md_path.write_text(markdown, encoding="utf-8")

    docx_name = "练习_" + "_".join(str(i) for i in ids) + ".docx"
    docx_path = OUTPUT_DIR / docx_name
    run_pandoc(md_path, docx_path)


def main():
    if len(sys.argv) < 2:
        print("用法:")
        print("  python tools/export_docx.py 1 3 6")
        print("  python tools/export_docx.py exports/数学练习.md")
        sys.exit(1)

    first_arg = sys.argv[1]

    # 检测: 如果参数是 .md 文件, 用文件模式; 否则用 ID 模式
    if first_arg.endswith(".md"):
        file_mode(first_arg)
    else:
        ids = [int(x) for x in sys.argv[1:]]
        id_mode(ids)


if __name__ == "__main__":
    main()
