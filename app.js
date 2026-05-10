// ======================================
// 题目数据
// ======================================
const problems = [
    {
        id: 1,
        chapter: "函数与方程",
        difficulty: 1,
        body: "解方程 $x^2 + 2x + 1 = 0$。",
        solution: [
            "左边是完全平方式：$x^2 + 2x + 1 = (x+1)^2$。",
            "所以方程化为 $(x+1)^2 = 0$,解得 $x = -1$(二重根)。"
        ]
    },
    {
        id: 2,
        chapter: "导数与积分",
        difficulty: 2,
        body: "求 $\\displaystyle\\int_0^1 \\frac{1}{1+x^2} \\, dx$ 的值。",
        solution: [
            "利用基本积分公式 $\\displaystyle\\int \\frac{1}{1+x^2}\\,dx = \\arctan x + C$。",
            "所以原式 $= \\arctan x \\Big|_0^1 = \\arctan 1 - \\arctan 0 = \\dfrac{\\pi}{4}$。"
        ]
    },
    {
        id: 3,
        chapter: "数列",
        difficulty: 3,
        body: "设 $\\{a_n\\}$ 为等差数列,$a_1 = 1$,$a_{10} = 19$。求 $\\displaystyle\\sum_{n=1}^{20} a_n$。",
        solution: [
            "由 $a_{10} = a_1 + 9d$ 得 $d = 2$,故 $a_n = 2n - 1$。",
            "$\\displaystyle\\sum_{n=1}^{20} a_n = \\frac{20(a_1 + a_{20})}{2} = \\frac{20 \\cdot (1 + 39)}{2} = 400$。"
        ]
    },
    {
        id: 4,
        chapter: "三角函数",
        difficulty: 1,
        body: "求 $\\sin\\dfrac{\\pi}{6} + \\cos\\dfrac{\\pi}{3}$ 的值。",
        solution: [
            "$\\sin\\dfrac{\\pi}{6} = \\dfrac{1}{2}$,$\\cos\\dfrac{\\pi}{3} = \\dfrac{1}{2}$。",
            "所以原式 $= \\dfrac{1}{2} + \\dfrac{1}{2} = 1$。"
        ]
    },
    {
        id: 5,
        chapter: "函数与方程",
        difficulty: 2,
        body: "已知函数 $f(x) = x^2 - 4x + 3$,求 $f(x)$ 在区间 $[0, 3]$ 上的最小值。",
        solution: [
            "$f(x) = (x-2)^2 - 1$,对称轴为 $x = 2$,在区间 $[0, 3]$ 内。",
            "因此最小值在 $x = 2$ 处取得,$f(2) = -1$。"
        ]
    }
];

// ======================================
// 状态
// ======================================
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

// 让 KaTeX 渲染 body 里的所有公式
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
// 路由:从 URL hash 解析当前应该显示哪个视图
// "" 或 "#" → 列表
// "#problem-3" → 第 3 道题详情
// ======================================
function getCurrentRoute() {
    const match = window.location.hash.match(/^#problem-(\d+)$/);
    if (match) {
        return { view: "detail", problemId: Number(match[1]) };
    }
    return { view: "list" };
}

// ======================================
// 筛选逻辑
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
// 渲染:单个题目卡片(列表里用)
// 标题用 <a href="#problem-N"> 包起来,点击就跳详情
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
// 渲染:题目列表(搜索/筛选时只重画这一块,搜索框焦点不丢)
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
// 渲染:列表视图(整个列表页的骨架)
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
// 主渲染:根据当前路由分发
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
// 初始化
// ======================================
document.addEventListener("DOMContentLoaded", function () {
    render();

    // URL hash 变化(浏览器前进/后退、点击 # 链接)
    window.addEventListener("hashchange", render);

    const appEl = document.getElementById("app");

    // 筛选按钮点击(事件委托)
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

    // 搜索框输入(事件委托;只重画列表,搜索框本身不动,焦点保留)
    appEl.addEventListener("input", function (e) {
        if (e.target.id !== "search-input") return;
        currentFilters.search = e.target.value;
        renderProblemList();
    });
});