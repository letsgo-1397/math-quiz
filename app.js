// ======================================
// 状态
// ======================================
let problems = [];
let assignments = [];

// ======================================
// 访问验证
// ======================================
// 修改密码: 在浏览器控制台执行以下代码,把输出的哈希值替换下面的 PASSWORD_HASH
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('你的新密码'))
//     .then(h => console.log(Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('')))
const PASSWORD_HASH = "1fc2210b9be582476c36820060ac77f04f6b274bb00b06f0b7b2069dc9a0f99a";
const AUTH_KEY = "math_quiz_auth";

function isAuthed() {
    return sessionStorage.getItem(AUTH_KEY) === "true";
}

const STORAGE_KEY = "math_quiz_problems";

function loadProblemsFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        problems = JSON.parse(raw);
        return true;
    }
    return false;
}

function saveProblems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(problems));
}

function getNextId() {
    if (problems.length === 0) return 1;
    const ids = problems.map(p => typeof p.id === "number" ? p.id : 0);
    return Math.max(...ids) + 1;
}

function downloadProblemsJSON() {
    const json = JSON.stringify(problems, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "problems_backup.json";
    a.click();
    URL.revokeObjectURL(url);
}

function confirmDeleteProblem(id) {
    document.getElementById("app").insertAdjacentHTML("beforeend", `
        <div class="modal-overlay" id="delete-confirm-modal">
            <div class="modal modal-sm">
                <div class="modal-header">
                    <h2>确认删除</h2>
                </div>
                <div class="modal-body">
                    <p>确定要删除 <strong>题目 ${id}</strong> 吗？此操作不可撤销。</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel" id="delete-cancel">取消</button>
                    <button class="btn btn-danger" id="delete-confirm">确认删除</button>
                </div>
            </div>
        </div>
    `);

    function closeModal() {
        document.getElementById("delete-confirm-modal").remove();
    }

    document.getElementById("delete-confirm-modal").addEventListener("click", function (e) {
        if (e.target === this) closeModal();
    });
    document.getElementById("delete-cancel").addEventListener("click", closeModal);

    document.getElementById("delete-confirm").addEventListener("click", function () {
        problems = problems.filter(p => p.id !== id);
        saveProblems();
        closeModal();

        // 刷新当前视图
        const route = getCurrentRoute();
        if (route.view === "problemDetail" && route.problemId === id) {
            window.location.hash = "#";
        } else {
            render();
        }
    });
}

let currentFilters = {
    chapter: "all",
    difficulty: "all",
    search: ""
};

// ======================================
// 工具函数
// ======================================
function difficultyStars(level) {
    return "★".repeat(level) + "☆".repeat(3 - level);
}

function getUniqueChapters() {
    return [...new Set(problems.map(p => p.chapter))];
}

function typesetMath() {
    renderMathInElement(document.body, {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$",  right: "$",  display: false }
        ],
        throwOnError: false
    });
}

function bodyToHTML(body) {
    const paragraphs = Array.isArray(body) ? body : [body];
    return paragraphs.map(p => `<p>${p}</p>`).join("");
}

function figureToHTML(figure) {
    return figure ? `<div class="problem-figure">${figure}</div>` : "";
}

async function verifyPassword(input) {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    return hashHex === PASSWORD_HASH;
}

function renderAuthPage() {
    document.getElementById("app").innerHTML = `
        <div class="auth-overlay">
            <div class="auth-card">
                <h2>请输入访问密码</h2>
                <p class="auth-subtitle">本题库仅供内部使用</p>
                <input type="password" id="auth-password" placeholder="输入密码" autofocus>
                <button class="auth-btn" id="auth-submit">确 认</button>
                <div class="auth-error" id="auth-error">密码错误，请重试</div>
            </div>
        </div>
    `;

    const input = document.getElementById("auth-password");
    const submit = document.getElementById("auth-submit");
    const error = document.getElementById("auth-error");

    async function tryAuth() {
        const ok = await verifyPassword(input.value);
        if (ok) {
            sessionStorage.setItem(AUTH_KEY, "true");
            error.classList.remove("show");
            loadData();
        } else {
            error.classList.add("show");
            input.value = "";
            input.focus();
        }
    }

    submit.addEventListener("click", tryAuth);
    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") tryAuth();
    });
}

// ======================================
// 路由
// ======================================
function getCurrentRoute() {
    const hash = window.location.hash;

    let match = hash.match(/^#problem-(\d+)$/);
    if (match) return { view: "problemDetail", problemId: Number(match[1]) };

    match = hash.match(/^#assignment-(.+)$/);
    if (match) return { view: "assignmentDetail", assignmentId: match[1] };

    if (hash === "#assignments") return { view: "assignmentList" };

    return { view: "problemList" };
}

// ======================================
// 筛选(题库列表用)
// ======================================
function getFilteredProblems() {
    return problems.filter(p => {
        if (currentFilters.chapter !== "all" && p.chapter !== currentFilters.chapter) return false;
        if (currentFilters.difficulty !== "all" && p.difficulty !== currentFilters.difficulty) return false;

        const keyword = currentFilters.search.trim().toLowerCase();
        if (keyword) {
            const bodyText = Array.isArray(p.body) ? p.body.join(" ") : p.body;
            const haystack = (bodyText + " " + p.solution.join(" ") + " " + p.chapter).toLowerCase();
            if (!haystack.includes(keyword)) return false;
        }
        return true;
    });
}

// ======================================
// 渲染:筛选按钮
// ======================================
function filterButton(type, value, label) {
    const isActive = currentFilters[type] === value;
    return `<button 
        class="filter-btn ${isActive ? "active" : ""}"
        data-filter-type="${type}"
        data-filter-value="${value}">${label}</button>`;
}

function renderFilterButtons() {
    let chapterHTML = filterButton("chapter", "all", "全部");
    getUniqueChapters().forEach(ch => {
        chapterHTML += filterButton("chapter", ch, ch);
    });

    let difficultyHTML = filterButton("difficulty", "all", "全部");
    [1, 2, 3].forEach(d => {
        difficultyHTML += filterButton("difficulty", d, difficultyStars(d));
    });

    document.getElementById("filter-buttons").innerHTML = `
        <div class="filter-row">
            <span class="filter-label">章节</span>
            ${chapterHTML}
        </div>
        <div class="filter-row">
            <span class="filter-label">难度</span>
            ${difficultyHTML}
        </div>
    `;
}

// ======================================
// 渲染:单道题卡片(题库列表用)
// ======================================
function renderProblem(problem) {
    const bodyHTML = bodyToHTML(problem.body);
    const figureHTML = figureToHTML(problem.figure);
    const solutionHTML = problem.solution.map(p => `<p>${p}</p>`).join("");

    return `
        <article class="problem-card">
            <div class="problem-meta">
                <span class="tag tag-chapter">${problem.chapter}</span>
                <span class="tag tag-difficulty">${difficultyStars(problem.difficulty)}</span>
                <button class="btn-delete btn-delete-sm" data-problem-id="${problem.id}" title="删除">删除</button>
            </div>
            <h2 class="problem-title">
                <a href="#problem-${problem.id}">题目 ${problem.id}</a>
            </h2>
            <div class="problem-body">
                ${bodyHTML}
                ${figureHTML}
            </div>
            <details class="problem-solution">
                <summary>查看解析</summary>
                ${solutionHTML}
            </details>
        </article>
    `;
}

// ======================================
// 渲染:作业里的题卡片(多了一个来源徽章)
// ======================================
function renderProblemInAssignment(problem, sourceTagHTML) {
    const bodyHTML = bodyToHTML(problem.body);
    const figureHTML = figureToHTML(problem.figure);
    const solutionHTML = problem.solution.map(p => `<p>${p}</p>`).join("");

    // 引用题(数字 id)做成可点链接,临时题(字符串 id)只显示文字
    const titleHTML = typeof problem.id === "number"
        ? `<a href="#problem-${problem.id}">题目 ${problem.id}</a>`
        : `<span>${problem.id}</span>`;

    return `
        <article class="problem-card">
            <div class="problem-meta">
                ${sourceTagHTML}
                <span class="tag tag-chapter">${problem.chapter}</span>
                <span class="tag tag-difficulty">${difficultyStars(problem.difficulty)}</span>
            </div>
            <h2 class="problem-title">${titleHTML}</h2>
            <div class="problem-body">
                ${bodyHTML}
                ${figureHTML}
            </div>
            <details class="problem-solution">
                <summary>查看解析</summary>
                ${solutionHTML}
            </details>
        </article>
    `;
}

// ======================================
// 新增题目表单
// ======================================
function renderAddProblemForm() {
    const chapters = getUniqueChapters();

    document.getElementById("app").insertAdjacentHTML("beforeend", `
        <div class="modal-overlay" id="add-problem-modal">
            <div class="modal">
                <div class="modal-header">
                    <h2>新增题目</h2>
                    <button class="modal-close" id="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group form-group-chapter">
                            <label class="form-label">章节</label>
                            <input class="form-input" id="form-chapter"
                                   list="chapter-list" placeholder="选择或输入新章节" autocomplete="off">
                            <datalist id="chapter-list">
                                ${chapters.map(c => `<option value="${c}">`).join("")}
                            </datalist>
                        </div>
                        <div class="form-group form-group-difficulty">
                            <label class="form-label">难度</label>
                            <div class="star-picker" id="star-picker">
                                ${[1,2,3].map(i => `<span class="star-item" data-level="${i}">☆</span>`).join("")}
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">题目内容 <span class="form-hint">（每行一个段落，支持 $...$ 公式）</span></label>
                        <textarea class="form-textarea" id="form-body" rows="5" placeholder="输入题目内容..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">配图 SVG <span class="form-hint">（可选）</span></label>
                        <textarea class="form-textarea form-textarea-sm" id="form-figure" rows="3" placeholder="粘贴 SVG 代码..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">解析 <span class="form-hint">（每行一个步骤，支持 $...$ 公式）</span></label>
                        <textarea class="form-textarea" id="form-solution" rows="5" placeholder="输入解析步骤..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">实时预览</label>
                        <div class="preview-box" id="form-preview">
                            <p class="preview-placeholder">题目内容将在这里实时预览</p>
                        </div>
                    </div>
                    <div class="form-error" id="form-error"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel" id="modal-cancel">取消</button>
                    <button class="btn btn-primary" id="modal-submit">提交</button>
                </div>
            </div>
        </div>
    `);

    let selectedDifficulty = 1;

    // 星级选择器
    document.querySelectorAll(".star-item").forEach(star => {
        star.addEventListener("click", function () {
            selectedDifficulty = Number(this.dataset.level);
            document.querySelectorAll(".star-item").forEach((s, i) => {
                s.textContent = i < selectedDifficulty ? "★" : "☆";
                s.classList.toggle("active", i < selectedDifficulty);
            });
        });
        // 默认选中第一颗星
        if (star.dataset.level === "1") {
            star.textContent = "★";
            star.classList.add("active");
        }
    });

    const bodyTA = document.getElementById("form-body");
    const figureTA = document.getElementById("form-figure");
    const solutionTA = document.getElementById("form-solution");
    const preview = document.getElementById("form-preview");
    const error = document.getElementById("form-error");

    function updatePreview() {
        const bodyText = bodyTA.value.trim();
        const solutionText = solutionTA.value.trim();
        const figureText = figureTA.value.trim();

        if (!bodyText && !solutionText) {
            preview.innerHTML = `<p class="preview-placeholder">题目内容将在这里实时预览</p>`;
            return;
        }

        let html = "";
        if (bodyText) {
            const bodyLines = bodyText.split("\n").filter(l => l.trim());
            html += bodyLines.map(l => `<p>${l}</p>`).join("");
        }
        if (figureText) {
            html += `<div class="problem-figure">${figureText}</div>`;
        }
        if (solutionText) {
            html += `<hr style="margin:16px 0;border:none;border-top:1px dashed #e5e7eb;">`;
            const solLines = solutionText.split("\n").filter(l => l.trim());
            html += `<h3 style="font-size:14px;color:#6b7280;margin-bottom:8px;">解析</h3>`;
            html += solLines.map(l => `<p>${l}</p>`).join("");
        }
        preview.innerHTML = html;
        typesetMath();
    }

    let previewTimer;
    function debouncedPreview() {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(updatePreview, 300);
    }

    bodyTA.addEventListener("input", debouncedPreview);
    figureTA.addEventListener("input", debouncedPreview);
    solutionTA.addEventListener("input", debouncedPreview);

    function closeModal() {
        document.getElementById("add-problem-modal").remove();
    }

    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("modal-cancel").addEventListener("click", closeModal);
    document.getElementById("add-problem-modal").addEventListener("click", function (e) {
        if (e.target === this) closeModal();
    });

    document.getElementById("modal-submit").addEventListener("click", function () {
        const chapter = document.getElementById("form-chapter").value.trim();
        const bodyRaw = bodyTA.value.trim();
        const solutionRaw = solutionTA.value.trim();
        const figureRaw = figureTA.value.trim();

        // 验证
        if (!chapter) {
            error.textContent = "请填写章节";
            error.classList.add("show");
            return;
        }
        if (!bodyRaw) {
            error.textContent = "请填写题目内容";
            error.classList.add("show");
            return;
        }
        if (!solutionRaw) {
            error.textContent = "请填写解析";
            error.classList.add("show");
            return;
        }

        // 组装数据: body 单行 = 字符串, 多行 = 数组
        const bodyLines = bodyRaw.split("\n").filter(l => l.trim());
        const body = bodyLines.length === 1 ? bodyLines[0] : bodyLines;

        const solutionLines = solutionRaw.split("\n").filter(l => l.trim());
        const solution = solutionLines.length > 0 ? solutionLines : [];

        const newProblem = {
            id: getNextId(),
            chapter: chapter,
            difficulty: selectedDifficulty,
            body: body,
            solution: solution
        };

        if (figureRaw) {
            newProblem.figure = figureRaw;
        }

        problems.push(newProblem);
        saveProblems();
        closeModal();
        renderProblemListView();
    });
}

// ======================================
// 渲染:题库列表
// ======================================
function renderProblemList() {
    const filtered = getFilteredProblems();
    document.getElementById("results-count").textContent = `共 ${filtered.length} 道题`;

    const container = document.getElementById("problem-list");
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">没有符合条件的题目</div>`;
    } else {
        container.innerHTML = filtered.map(renderProblem).join("");
    }
    typesetMath();
}

function renderProblemListView() {
    document.getElementById("app").innerHTML = `
        <div class="toolbar">
            <button class="btn btn-primary" id="btn-add-problem">+ 新增题目</button>
            <button class="btn btn-secondary" id="btn-download-json">下载数据</button>
        </div>
        <section class="filters">
            <div class="search-row">
                <input type="search" id="search-input"
                       placeholder="搜索题目内容、章节、解析..."
                       value="${currentFilters.search}">
            </div>
            <div id="filter-buttons"></div>
        </section>
        <div class="results-count" id="results-count"></div>
        <div id="problem-list"></div>
    `;
    renderFilterButtons();
    renderProblemList();
}

// ======================================
// 渲染:题目详情
// ======================================
function renderProblemDetailView(problemId) {
    const problem = problems.find(p => p.id === problemId);

    if (!problem) {
        document.getElementById("app").innerHTML = `
            <a href="#" class="back-link">← 返回题库</a>
            <div class="empty-state">题目不存在</div>
        `;
        return;
    }

    const bodyHTML = bodyToHTML(problem.body);
    const figureHTML = figureToHTML(problem.figure);
    const solutionHTML = problem.solution.map(p => `<p>${p}</p>`).join("");

    document.getElementById("app").innerHTML = `
        <a href="#" class="back-link">← 返回题库</a>
        <article class="problem-card problem-detail">
            <div class="problem-meta">
                <span class="tag tag-chapter">${problem.chapter}</span>
                <span class="tag tag-difficulty">${difficultyStars(problem.difficulty)}</span>
                <button class="btn-delete" data-problem-id="${problem.id}">删除</button>
            </div>
            <h2 class="problem-title">题目 ${problem.id}</h2>
            <div class="problem-body">
                ${bodyHTML}
                ${figureHTML}
            </div>
            <div class="solution-detail">
                <h3>解析</h3>
                ${solutionHTML}
            </div>
        </article>
    `;
    typesetMath();
    window.scrollTo(0, 0);
}

// ======================================
// 渲染:作业列表
// ======================================
function renderAssignmentListView() {
    const sorted = [...assignments].sort((a, b) => b.date.localeCompare(a.date));

    const itemsHTML = sorted.map(a => {
        // 计数:引用 + 内嵌
        const count = (a.problemIds || []).length + (a.extraProblems || []).length;
        return `
            <a href="#assignment-${a.id}" class="assignment-card-link">
                <article class="assignment-card">
                    <div class="assignment-date">${a.date}</div>
                    <h3 class="assignment-title">${a.title}</h3>
                    ${a.note ? `<p class="assignment-note">${a.note}</p>` : ""}
                    <div class="assignment-meta">共 ${count} 道题</div>
                </article>
            </a>
        `;
    }).join("");

    document.getElementById("app").innerHTML = `
        <div class="page-header">
            <h2>作业</h2>
            <p class="page-subtitle">每日布置的练习,按日期倒序</p>
        </div>
        ${itemsHTML || `<div class="empty-state">还没有作业</div>`}
    `;
}

// ======================================
// 渲染:作业详情(支持引用 + 内嵌混合)
// ======================================
function renderAssignmentDetailView(assignmentId) {
    const assignment = assignments.find(a => a.id === assignmentId);

    if (!assignment) {
        document.getElementById("app").innerHTML = `
            <a href="#assignments" class="back-link">← 返回作业列表</a>
            <div class="empty-state">作业不存在</div>
        `;
        return;
    }

    // 从题库拿引用的题
    const referenced = (assignment.problemIds || [])
        .map(id => problems.find(p => p.id === id))
        .filter(p => p !== undefined);

    // 内嵌的题
    const inline = assignment.extraProblems || [];

    // 合并:引用题在前,内嵌题在后
    const allProblems = [...referenced, ...inline];

    // 缺失统计(引用了不存在的 id)
    const requestedCount = (assignment.problemIds || []).length + inline.length;
    const missingCount = requestedCount - allProblems.length;

    // 每道题加来源徽章
    const problemsHTML = allProblems.map((p, index) => {
        const isInline = index >= referenced.length;
        const sourceTag = isInline
            ? `<span class="source-badge source-inline">临时题</span>`
            : `<span class="source-badge source-ref">题库</span>`;
        return renderProblemInAssignment(p, sourceTag);
    }).join("");

    document.getElementById("app").innerHTML = `
        <a href="#assignments" class="back-link">← 返回作业列表</a>
        <div class="assignment-header">
            <div class="assignment-date-large">${assignment.date}</div>
            <h2>${assignment.title}</h2>
            ${assignment.note ? `<p class="assignment-note-large">${assignment.note}</p>` : ""}
            <div class="assignment-meta-large">
                共 ${allProblems.length} 道题${missingCount > 0 ? `(${missingCount} 道引用的题目数据缺失)` : ""}
            </div>
        </div>
        <div id="problem-list">${problemsHTML}</div>
    `;
    typesetMath();
    window.scrollTo(0, 0);
}

// ======================================
// 主渲染:根据路由分发
// ======================================
function render() {
    const route = getCurrentRoute();
    updateNavActiveState(route.view);

    if (route.view === "problemDetail") {
        renderProblemDetailView(route.problemId);
    } else if (route.view === "assignmentList") {
        renderAssignmentListView();
    } else if (route.view === "assignmentDetail") {
        renderAssignmentDetailView(route.assignmentId);
    } else {
        renderProblemListView();
    }
}

function updateNavActiveState(view) {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });

    if (view === "assignmentList" || view === "assignmentDetail") {
        document.querySelector('.nav-link[href="#assignments"]')?.classList.add("active");
    } else {
        document.querySelector('.nav-link[href="#"]')?.classList.add("active");
    }
}

// ======================================
// 数据加载:并行加载题库和作业
// ======================================
async function loadData() {
    if (window.location.protocol === "file:") {
        document.getElementById("app").innerHTML = `
            <div class="empty-state">
                <h3 style="margin-bottom: 12px;">需要通过 Live Server 打开</h3>
                <p>这个项目用 fetch 加载数据,不能直接双击 HTML 文件。</p>
                <p style="margin-top: 12px;">VS Code 里右键 index.html → "Open with Live Server"。</p>
            </div>
        `;
        return;
    }

    // 1. 先检查 localStorage 是否已有数据
    if (loadProblemsFromStorage()) {
        try {
            const assignmentsRes = await fetch("assignments.json");
            if (assignmentsRes.ok) {
                assignments = await assignmentsRes.json();
            }
        } catch (e) {
            console.error("作业数据加载失败:", e);
        }
        render();
        return;
    }

    // 2. localStorage 为空,从 JSON 文件导入种子数据
    try {
        const [problemsRes, assignmentsRes] = await Promise.all([
            fetch("problems.json"),
            fetch("assignments.json")
        ]);

        if (!problemsRes.ok) throw new Error(`problems.json: HTTP ${problemsRes.status}`);
        if (!assignmentsRes.ok) throw new Error(`assignments.json: HTTP ${assignmentsRes.status}`);

        problems = await problemsRes.json();
        assignments = await assignmentsRes.json();

        // 种子数据写入 localStorage
        saveProblems();

        render();
    } catch (error) {
        console.error("数据加载失败:", error);
        document.getElementById("app").innerHTML = `
            <div class="empty-state">
                <h3 style="margin-bottom: 12px;">数据加载失败</h3>
                <p style="font-size: 13px; color: #ef4444;">${error.message}</p>
                <p style="margin-top: 12px;">请检查 JSON 文件是否存在,以及格式是否正确。</p>
            </div>
        `;
    }
}

// ======================================
// 初始化
// ======================================
document.addEventListener("DOMContentLoaded", function () {
    if (!isAuthed()) {
        renderAuthPage();
        return;
    }

    loadData();

    window.addEventListener("hashchange", function () {
        if (problems.length > 0) render();
    });

    const appEl = document.getElementById("app");

    appEl.addEventListener("click", function (e) {
        // 删除按钮
        const deleteBtn = e.target.closest(".btn-delete");
        if (deleteBtn) {
            const problemId = Number(deleteBtn.dataset.problemId);
            confirmDeleteProblem(problemId);
            return;
        }

        // 新增题目按钮
        if (e.target.id === "btn-add-problem") {
            renderAddProblemForm();
            return;
        }

        // 下载数据按钮
        if (e.target.id === "btn-download-json") {
            downloadProblemsJSON();
            return;
        }

        // 筛选按钮
        const btn = e.target.closest(".filter-btn");
        if (!btn) return;

        const type = btn.dataset.filterType;
        let value = btn.dataset.filterValue;
        if (type === "difficulty" && value !== "all") {
            value = Number(value);
        }
        currentFilters[type] = value;
        renderFilterButtons();
        renderProblemList();
    });

    appEl.addEventListener("input", function (e) {
        if (e.target.id !== "search-input") return;
        currentFilters.search = e.target.value;
        renderProblemList();
    });
});
