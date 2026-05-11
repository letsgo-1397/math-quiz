// ======================================
// 状态
// ======================================
let problems = [];
let assignments = [];

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

    try {
        const [problemsRes, assignmentsRes] = await Promise.all([
            fetch("problems.json"),
            fetch("assignments.json")
        ]);

        if (!problemsRes.ok) throw new Error(`problems.json: HTTP ${problemsRes.status}`);
        if (!assignmentsRes.ok) throw new Error(`assignments.json: HTTP ${assignmentsRes.status}`);

        problems = await problemsRes.json();
        assignments = await assignmentsRes.json();

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
    loadData();

    window.addEventListener("hashchange", function () {
        if (problems.length > 0) render();
    });

    const appEl = document.getElementById("app");

    appEl.addEventListener("click", function (e) {
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