"""
从 problems.json 挑题目,生成 Word(.docx)。

用法:
    python tools/export_docx.py 1 3 6
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


def main():
    if len(sys.argv) < 2:
        print("用法: python tools/export_docx.py 1 3 6")
        sys.exit(1)

    wanted_ids = [int(x) for x in sys.argv[1:]]
    problems = json.loads(PROBLEMS_PATH.read_text(encoding="utf-8"))

    selected = []
    for pid in wanted_ids:
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

    docx_name = "练习_" + "_".join(str(i) for i in wanted_ids) + ".docx"
    docx_path = OUTPUT_DIR / docx_name

    cmd = [
        "pandoc",
        str(md_path),
        "-f", "markdown+tex_math_dollars",      # 关键:启用 $...$ 数学公式
        "-o", str(docx_path),
    ]

    print(f"正在生成: {docx_path.name}")
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")

    if result.returncode != 0:
        print("生成失败:")
        print(result.stderr)
        sys.exit(1)

    print(f"完成 → {docx_path}")


if __name__ == "__main__":
    main()