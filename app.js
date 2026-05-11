// ======================================
// 状态:problems 初始为空数组,fetch 完成后填充
// ======================================
let problems = [];

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

// ======================================
// 路由
// ======================================
function getCurrentRoute() {
    const match = window.location.hash.match(/^#problem-(\d+)$/);
    if (match) {
        return { view: "detail", problemId: Number(match[1]) };
    }
    return { view: "list" };
}

// ======================================
// 筛选
// ======================================
function getFilteredProblems() {
    return problems.filter(p => {
        if (currentFilters.chapter !== "all" && p.chapter !== currentFilters.chapter) return false;
        if (currentFilters.difficulty !== "all" && p.difficulty !== currentFilters.difficulty) return false;

        const keyword = currentFilters.search.trim().toLowerCase();
        if (keyword) {
            const haystack = (p.body + " " + p.solution.join(" ") + " " + p.chapter).toLowerCase();
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
// 渲染:单道题
// ======================================
function renderProblem(problem) {
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
                <p>${problem.body}</p>
            </div>
            <details class="problem-solution">
                <summary>查看解析</summary>
                ${solutionHTML}
            </details>
        </article>
    `;
}

// ======================================
// 渲染:题目列表
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

// ======================================
// 渲染:列表视图
// ======================================
function renderListView() {
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
// 渲染:详情视图
// ======================================
function renderDetailView(problemId) {
    const problem = problems.find(p => p.id === problemId);

    if (!problem) {
        document.getElementById("app").innerHTML = `
            <a href="#" class="back-link">← 返回列表</a>
            <div class="empty-state">题目不存在</div>
        `;
        return;
    }

    const solutionHTML = problem.solution.map(p => `<p>${p}</p>`).join("");

    document.getElementById("app").innerHTML = `
        <a href="#" class="back-link">← 返回列表</a>
        <article class="problem-card problem-detail">
            <div class="problem-meta">
                <span class="tag tag-chapter">${problem.chapter}</span>
                <span class="tag tag-difficulty">${difficultyStars(problem.difficulty)}</span>
            </div>
            <h2 class="problem-title">题目 ${problem.id}</h2>
            <div class="problem-body">
                <p>${problem.body}</p>
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
// 主渲染:根据路由分发
// ======================================
function render() {
    const route = getCurrentRoute();
    if (route.view === "detail") {
        renderDetailView(route.problemId);
    } else {
        renderListView();
    }
}

// ======================================
// 数据加载:异步从 problems.json 读题
// ======================================
async function loadProblems() {
    // 检测是否双击 HTML 打开(file:// 协议),给出明确提示
    if (window.location.protocol === "file:") {
        document.getElementById("app").innerHTML = `
            <div class="empty-state">
                <h3 style="margin-bottom: 12px;">需要通过 Live Server 打开</h3>
                <p>这个项目现在用 fetch 加载数据,不能直接双击 HTML 文件。</p>
                <p style="margin-top: 12px;">VS Code 里右键 index.html → "Open with Live Server"。</p>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch("problems.json");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        problems = await response.json();
        render();
    } catch (error) {
        console.error("题目加载失败:", error);
        document.getElementById("app").innerHTML = `
            <div class="empty-state">
                <h3 style="margin-bottom: 12px;">题目加载失败</h3>
                <p style="font-size: 13px; color: #ef4444;">${error.message}</p>
                <p style="margin-top: 12px;">请检查 <code>problems.json</code> 是否存在,以及 JSON 格式是否正确。</p>
            </div>
        `;
    }
}

// ======================================
// 初始化
// ======================================
document.addEventListener("DOMContentLoaded", function () {
    // 启动:加载数据,加载完会自动 render
    loadProblems();

    // hash 变化(数据没加载完时不动作)
    window.addEventListener("hashchange", function () {
        if (problems.length > 0) render();
    });

    const appEl = document.getElementById("app");

    // 筛选按钮点击
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

    // 搜索框输入
    appEl.addEventListener("input", function (e) {
        if (e.target.id !== "search-input") return;
        currentFilters.search = e.target.value;
        renderProblemList();
    });
});