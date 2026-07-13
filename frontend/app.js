const seed = {
  products: [
    { id: 1, merchantId: 1, name: "德昂古树酸茶礼盒", category: "酸茶礼盒", price: 168, stock: 36, status: "APPROVED", sales: 12 },
    { id: 2, merchantId: 1, name: "45天发酵酸茶体验装", category: "体验装", price: 59, stock: 80, status: "APPROVED", sales: 24 },
    { id: 3, merchantId: 2, name: "茶魂守护人纪念币", category: "文创周边", price: 39, stock: 120, status: "PENDING", sales: 0 },
  ],
  contents: [
    { id: 1, title: "德昂族酸茶是什么", category: "酸茶科普", status: "PUBLISHED", summary: "介绍酸茶来源、微酸回甘的风味与德昂族古老茶农身份。" },
    { id: 2, title: "杀青、揉捻与45天发酵", category: "制作技艺", status: "PUBLISHED", summary: "把复杂手工经验拆解为三步核心记忆点。" },
  ],
  cart: [],
  orders: [],
  bookings: [],
  posters: [],
  afterSales: [],
  merchants: [
    { id: 1, shopName: "出冬瓜酸茶工坊", status: "APPROVED" },
    { id: 2, shopName: "茶魂文创铺", status: "PENDING" },
  ],
};

const gameSteps = [
  {
    title: "源起之魂",
    text: "擦去尘封信笺，理解德昂族与茶的关系。你的生活节奏更倾向于？",
    options: ["快速汲取核心", "放慢脚步，细细品味", "去芜存菁，只寻本源"],
  },
  {
    title: "自然之魂",
    text: "古茶林迷雾散开，茶王树正在发光。面对未知，你会如何前行？",
    options: ["目标明确，直奔终点", "顺其自然，享受沿途", "拨开迷雾，静守己心"],
  },
  {
    title: "技艺之魂",
    text: "酸茶坊里需要完成杀青、揉捻与发酵。古法制茶需等待多久？",
    options: ["10天，越快越好", "45天，慢慢发酵", "100天，越久越浓"],
  },
];

const API_BASE = "http://localhost:8080/api";
let db = load();
let role = localStorage.getItem("role") || "USER";
let token = localStorage.getItem("token") || "";
let apiOnline = false;
let view = "home";
let gameIndex = 0;
let gameChoices = [];

function load() {
  const raw = localStorage.getItem("sourTeaDemo");
  if (raw) return JSON.parse(raw);
  localStorage.setItem("sourTeaDemo", JSON.stringify(seed));
  return structuredClone(seed);
}

function save() {
  localStorage.setItem("sourTeaDemo", JSON.stringify(db));
}

async function backendLogin() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const result = await response.json();
    token = result.data?.token || "";
    localStorage.setItem("token", token);
    apiOnline = Boolean(token);
  } catch {
    apiOnline = false;
  }
}

async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`GET ${path} failed`);
  const result = await response.json();
  return result.data;
}

async function apiPost(path, body = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`POST ${path} failed`);
  const result = await response.json();
  return result.data;
}

async function syncFromBackend() {
  await backendLogin();
  if (!apiOnline) {
    render();
    return;
  }
  try {
    db.products = (await apiGet("/products")).map((product) => ({ sales: 0, ...product }));
    db.contents = await apiGet("/contents");
    if (role !== "USER") db.merchants = await apiGet("/merchants");
    db.orders = (await apiGet("/orders")).map((order) => ({
      ...order,
      no: order.no || order.orderNo,
      total: order.total ?? order.totalAmount,
    }));
    db.bookings = (await apiGet("/bookings")).map((booking) => ({
      ...booking,
      people: booking.people ?? booking.peopleCount,
      code: booking.code || booking.verifyCode,
    }));
    save();
  } catch {
    apiOnline = false;
  }
  render();
}

function $(selector) {
  return document.querySelector(selector);
}

function currency(value) {
  return `¥${Number(value).toFixed(2)}`;
}

function nextId(items) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

function statusText(status) {
  return {
    APPROVED: "已通过",
    PENDING: "待审核",
    PAID: "已支付",
    SHIPPED: "已发货",
    DONE: "已完成",
    REFUNDING: "售后中",
    VERIFIED: "已核销",
    "待核销": "待核销",
  }[status] || status;
}

function revenue() {
  return db.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
}

function setView(next) {
  view = next;
  render();
}

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  return tpl.content.cloneNode(true);
}

function render() {
  $("#roleSelect").value = role;
  const mode = apiOnline ? "后端API已连接" : "离线演示模式";
  $("#roleHint").textContent = `${role === "USER" ? "普通用户：浏览、预约、购买、评价" : role === "MERCHANT" ? "商家：商品、库存、订单、售后" : "管理员：审核、监管、数据看板"} · ${mode}`;
  const root = $("#view");
  root.innerHTML = "";
  const map = { home: renderHome, culture: renderCulture, h5: renderH5, shop: renderShop, cart: renderCart, booking: renderBooking, workspace: renderWorkspace };
  map[view]();
}

function renderHome() {
  $("#view").appendChild(cloneTemplate("homeTpl"));
  $("#metricProducts").textContent = db.products.filter((p) => p.status === "APPROVED").length;
  $("#metricOrders").textContent = db.orders.length;
  $("#metricBookings").textContent = db.bookings.length;
  $("#metricCodes").textContent = db.posters.length;
}

function renderCulture() {
  $("#view").appendChild(cloneTemplate("cultureTpl"));
  $(".content").insertAdjacentHTML("beforeend", `
    <h3>内容栏目</h3>
    <div class="grid two">
      ${db.contents.map((item) => `
        <article class="card">
          <span class="badge">${item.category}</span>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
        </article>
      `).join("")}
    </div>
  `);
}

function renderH5() {
  $("#view").appendChild(cloneTemplate("h5Tpl"));
  gameIndex = 0;
  gameChoices = [];
  paintGame();
  $("#nextGame").addEventListener("click", () => {
    const selected = document.querySelector(".option-list .selected");
    if (!selected) return alert("请选择一个答案");
    gameChoices.push(selected.textContent);
    gameIndex += 1;
    if (gameIndex >= gameSteps.length) {
      const recipe = buildRecipe();
      $("#gameTitle").textContent = "火塘终章";
      $("#gameText").textContent = `茶魂已聚。系统为你生成：${recipe}`;
      $("#gameOptions").innerHTML = "";
      $("#nextGame").disabled = true;
      $("#recipeResult").textContent = recipe;
      return;
    }
    paintGame();
  });
  $("#savePoster").addEventListener("click", () => {
    if (!gameChoices.length) return alert("请先完成H5互动");
    const code = `TEA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    db.posters.push({ code, recipe: buildRecipe(), createdAt: new Date().toLocaleString() });
    save();
    alert(`已生成海报核销码：${code}`);
    setView("booking");
  });
}

function paintGame() {
  const step = gameSteps[gameIndex];
  $("#gameTitle").textContent = step.title;
  $("#gameText").textContent = step.text;
  $("#gameOptions").innerHTML = step.options.map((option) => `<button>${option}</button>`).join("");
  document.querySelectorAll(".option-list button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".option-list button").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });
}

function buildRecipe() {
  const joined = gameChoices.join(" ");
  if (joined.includes("细细") || joined.includes("顺其自然")) return "优雅品味家：德昂酸茶 + 玫瑰 + 桂圆";
  if (joined.includes("本源") || joined.includes("静守")) return "纯粹本真者：原味德昂古树酸茶";
  return "极速先锋：德昂酸茶 + 小青柠 + 薄荷";
}

function renderShop() {
  $("#view").appendChild(cloneTemplate("shopTpl"));
  $("#cartCount").textContent = db.cart.reduce((sum, item) => sum + item.quantity, 0);
  $("#viewCart").addEventListener("click", () => setView("cart"));
  $("#productList").innerHTML = db.products
    .filter((product) => product.status === "APPROVED")
    .map((product) => `
      <article class="card product">
        <span class="badge">${product.category}</span>
        <h3>${product.name}</h3>
        <p>库存 ${product.stock} · 已售 ${product.sales}</p>
        <div class="price">${currency(product.price)}</div>
        <button class="primary" data-add="${product.id}">加入购物车</button>
      </article>
    `)
    .join("");
  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => addCart(Number(button.dataset.add)));
  });
}

function addCart(productId) {
  const product = db.products.find((item) => item.id === productId);
  if (!product || product.stock < 1) return alert("库存不足");
  const found = db.cart.find((item) => item.productId === productId);
  if (found) found.quantity += 1;
  else db.cart.push({ productId, quantity: 1 });
  save();
  renderShop();
}

function renderCart() {
  $("#view").appendChild(cloneTemplate("cartTpl"));
  $("#cartList").innerHTML = db.cart.length
    ? db.cart.map((item) => {
        const product = db.products.find((p) => p.id === item.productId);
        return `<div class="list-row"><span>${product.name} × ${item.quantity}</span><strong>${currency(product.price * item.quantity)}</strong></div>`;
      }).join("")
    : "<p>购物车为空。</p>";
  $("#checkout").addEventListener("click", () => {
    if (!db.cart.length) return alert("购物车为空");
    const total = db.cart.reduce((sum, item) => {
      const product = db.products.find((p) => p.id === item.productId);
      return sum + product.price * item.quantity;
    }, 0);
    db.cart.forEach((item) => {
      const product = db.products.find((p) => p.id === item.productId);
      product.stock -= item.quantity;
      product.sales += item.quantity;
    });
    const orderedItems = structuredClone(db.cart);
    const productIds = orderedItems.map((item) => item.productId);
    const order = { id: Date.now(), no: `ST${Date.now()}`, status: "PAID", total, items: orderedItems, createdAt: new Date().toLocaleString() };
    db.orders.push(order);
    db.cart = [];
    save();
    if (apiOnline) apiPost("/orders", { productIds }).then(syncFromBackend).catch(() => {});
    alert("模拟支付成功，订单已创建");
    setView("workspace");
  });
}

function renderBooking() {
  $("#view").appendChild(cloneTemplate("bookingTpl"));
  $("#bookingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = db.posters.at(-1)?.code || `TEA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    db.bookings.push({ id: Date.now(), date: form.get("date"), people: form.get("people"), phone: form.get("phone"), code, status: "待核销" });
    save();
    if (apiOnline) {
      apiPost("/bookings", { date: form.get("date"), peopleCount: form.get("people"), phone: form.get("phone") })
        .then(syncFromBackend)
        .catch(() => {});
    }
    renderBooking();
  });
  $("#bookingList").innerHTML = db.bookings.length
    ? db.bookings.map((item) => `<div class="list-row"><span>${item.date} · ${item.people}人 · ${item.code}</span><strong>${item.status}</strong></div>`).join("")
    : "<p>暂无预约。</p>";
}

function renderWorkspace() {
  $("#view").appendChild(cloneTemplate("workspaceTpl"));
  if (role === "USER") return renderUserWorkspace();
  if (role === "MERCHANT") return renderMerchantWorkspace();
  renderAdminWorkspace();
}

function renderUserWorkspace() {
  $("#workspaceContent").innerHTML = `
    <h2>普通用户中心</h2>
    <div class="grid three">
      <article class="card"><h3>我的订单</h3>${db.orders.map((o) => `<div class="mini-row"><span>${o.no}<br>${currency(o.total)} · ${statusText(o.status)}</span><span>${o.status === "SHIPPED" ? `<button data-done="${o.id}">确认收货</button>` : ""}${["PAID", "SHIPPED"].includes(o.status) ? `<button data-refund="${o.id}">申请售后</button>` : ""}</span></div>`).join("") || "<p>暂无订单</p>"}</article>
      <article class="card"><h3>我的预约</h3>${db.bookings.map((b) => `<p>${b.date} · ${b.code} · ${statusText(b.status)}</p>`).join("") || "<p>暂无预约</p>"}</article>
      <article class="card"><h3>我的海报</h3>${db.posters.map((p) => `<p>${p.code}<br>${p.recipe}</p>`).join("") || "<p>暂无海报</p>"}</article>
    </div>
  `;
  document.querySelectorAll("[data-done]").forEach((button) => {
    button.addEventListener("click", () => {
      db.orders.find((order) => order.id === Number(button.dataset.done)).status = "DONE";
      save();
      renderUserWorkspace();
    });
  });
  document.querySelectorAll("[data-refund]").forEach((button) => {
    button.addEventListener("click", () => {
      const order = db.orders.find((item) => item.id === Number(button.dataset.refund));
      order.status = "REFUNDING";
      db.afterSales.push({ id: nextId(db.afterSales), orderId: order.id, reason: "用户申请售后", status: "待商家处理" });
      save();
      renderUserWorkspace();
    });
  });
}

function renderMerchantWorkspace() {
  const rows = db.orders.map((order) => `<tr><td>${order.no}</td><td>${currency(order.total)}</td><td>${statusText(order.status)}</td><td><button data-ship="${order.id}">发货</button></td></tr>`).join("");
  $("#workspaceContent").innerHTML = `
    <h2>商家中心</h2>
    <div class="metrics">
      <div><strong>${db.products.length}</strong><span>商品数</span></div>
      <div><strong>${db.orders.length}</strong><span>订单数</span></div>
      <div><strong>${currency(revenue())}</strong><span>销售额</span></div>
      <div><strong>${db.afterSales.length}</strong><span>售后单</span></div>
    </div>
    <form id="productForm" class="card form inline-form">
      <h3>发布酸茶商品</h3>
      <label>商品名 <input name="name" required placeholder="如：德昂酸茶试饮装" /></label>
      <label>分类 <input name="category" required placeholder="酸茶礼盒/文创周边" /></label>
      <label>价格 <input name="price" type="number" min="1" value="88" required /></label>
      <label>库存 <input name="stock" type="number" min="1" value="20" required /></label>
      <button class="primary">提交审核</button>
    </form>
    <table class="table"><thead><tr><th>订单号</th><th>金额</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>暂无订单</td></tr>"}</tbody></table>
    <h3>商品管理</h3>
    <div class="grid three">${db.products.map((p) => `<article class="card"><h3>${p.name}</h3><p>库存 ${p.stock} · 状态 ${statusText(p.status)}</p><button data-restock="${p.id}">补货+10</button></article>`).join("")}</div>
    <h3>售后处理</h3>
    <table class="table"><thead><tr><th>售后单</th><th>订单</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${db.afterSales.map((item) => `<tr><td>${item.id}</td><td>${item.orderId}</td><td>${item.status}</td><td><button data-after="${item.id}">处理完成</button></td></tr>`).join("") || "<tr><td colspan='4'>暂无售后</td></tr>"}
    </tbody></table>
  `;
  $("#productForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    db.products.push({
      id: nextId(db.products),
      merchantId: 1,
      name: form.get("name"),
      category: form.get("category"),
      price: Number(form.get("price")),
      stock: Number(form.get("stock")),
      status: "PENDING",
      sales: 0,
    });
    save();
    if (apiOnline) {
      apiPost("/products", {
        merchantId: 1,
        name: form.get("name"),
        category: form.get("category"),
        price: Number(form.get("price")),
        stock: Number(form.get("stock")),
      }).then(syncFromBackend).catch(() => {});
    }
    renderMerchantWorkspace();
  });
  document.querySelectorAll("[data-ship]").forEach((button) => {
    button.addEventListener("click", () => {
      const order = db.orders.find((item) => item.id === Number(button.dataset.ship));
      order.status = "SHIPPED";
      save();
      if (apiOnline) apiPost(`/orders/${order.id}/ship`).then(syncFromBackend).catch(() => {});
      renderMerchantWorkspace();
    });
  });
  document.querySelectorAll("[data-restock]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = db.products.find((item) => item.id === Number(button.dataset.restock));
      product.stock += 10;
      save();
      renderMerchantWorkspace();
    });
  });
  document.querySelectorAll("[data-after]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = db.afterSales.find((entry) => entry.id === Number(button.dataset.after));
      item.status = "商家已处理";
      save();
      renderMerchantWorkspace();
    });
  });
}

function renderAdminWorkspace() {
  $("#workspaceContent").innerHTML = `
    <h2>管理员后台</h2>
    <div class="metrics">
      <div><strong>${db.products.length}</strong><span>商品总数</span></div>
      <div><strong>${db.orders.length}</strong><span>订单总数</span></div>
      <div><strong>${currency(revenue())}</strong><span>交易额</span></div>
      <div><strong>${db.bookings.length}</strong><span>预约数</span></div>
    </div>
    <form id="contentForm" class="card form inline-form">
      <h3>新增酸茶科普内容</h3>
      <label>标题 <input name="title" required /></label>
      <label>栏目 <input name="category" value="酸茶科普" required /></label>
      <label>摘要 <input name="summary" required /></label>
      <button class="primary">发布内容</button>
    </form>
    <h3>商家审核</h3>
    <table class="table"><thead><tr><th>商家</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${db.merchants.map((m) => `<tr><td>${m.shopName}</td><td>${statusText(m.status)}</td><td><button data-merchant="${m.id}">通过</button></td></tr>`).join("")}
    </tbody></table>
    <h3>商品审核</h3>
    <table class="table"><thead><tr><th>商品</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${db.products.map((p) => `<tr><td>${p.name}</td><td>${statusText(p.status)}</td><td><button data-approve="${p.id}">通过</button></td></tr>`).join("")}
    </tbody></table>
    <h3>预约核销</h3>
    <table class="table"><thead><tr><th>日期</th><th>核销码</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${db.bookings.map((b) => `<tr><td>${b.date}</td><td>${b.code}</td><td>${statusText(b.status)}</td><td><button data-verify="${b.id}">核销</button></td></tr>`).join("") || "<tr><td colspan='4'>暂无预约</td></tr>"}
    </tbody></table>
  `;
  $("#contentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    db.contents.push({ id: nextId(db.contents), title: form.get("title"), category: form.get("category"), summary: form.get("summary"), status: "PUBLISHED" });
    save();
    if (apiOnline) {
      apiPost("/contents", { title: form.get("title"), category: form.get("category"), summary: form.get("summary") })
        .then(syncFromBackend)
        .catch(() => {});
    }
    renderAdminWorkspace();
  });
  document.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = db.products.find((item) => item.id === Number(button.dataset.approve));
      product.status = "APPROVED";
      save();
      if (apiOnline) apiPost(`/admin/products/${product.id}/approve`).then(syncFromBackend).catch(() => {});
      renderAdminWorkspace();
    });
  });
  document.querySelectorAll("[data-merchant]").forEach((button) => {
    button.addEventListener("click", () => {
      const merchant = db.merchants.find((item) => item.id === Number(button.dataset.merchant));
      merchant.status = "APPROVED";
      save();
      if (apiOnline) apiPost(`/admin/merchants/${merchant.id}/approve`).then(syncFromBackend).catch(() => {});
      renderAdminWorkspace();
    });
  });
  document.querySelectorAll("[data-verify]").forEach((button) => {
    button.addEventListener("click", () => {
      const booking = db.bookings.find((item) => item.id === Number(button.dataset.verify));
      booking.status = "VERIFIED";
      save();
      if (apiOnline) apiPost("/bookings/verify", { code: booking.code || booking.verifyCode }).then(syncFromBackend).catch(() => {});
      renderAdminWorkspace();
    });
  });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-view]");
  if (target) setView(target.dataset.view);
});

$("#roleSelect").addEventListener("change", (event) => {
  role = event.target.value;
  localStorage.setItem("role", role);
  syncFromBackend();
});

$("#resetDemo").addEventListener("click", () => {
  if (!confirm("确认重置演示数据？")) return;
  db = structuredClone(seed);
  save();
  setView("home");
});

render();
syncFromBackend();
