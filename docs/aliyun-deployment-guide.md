# 德昂族酸茶平台部署手册

适用对象：自行部署毕设的项目维护者。目标环境：阿里云轻量应用服务器，Ubuntu 22.04 或 24.04；附 Alibaba Cloud Linux 3 的安装差异。文档日期：2026 年 9 月 15 日。

## 1 部署目标与边界

本方案将 Vue 前端和 Java 内容接口部署到一台服务器，由 Nginx 提供统一入口。部署完成后，获准访问的其他电脑无需安装项目环境，通过浏览器即可查看和操作演示页面。关闭你的电脑不会导致服务器上的服务停止。

**必须先理解：当前版本是可交互演示，不是所有数据均由服务器保存的完整电商系统。** 用户注册登录、购物车、订单、模拟支付退款、预约以及商家和管理员的大部分操作使用浏览器 localStorage。同一浏览器可以切换角色演示流程；不同电脑、浏览器或网站地址之间的交易数据不会自动同步。清除站点数据会丢失本地演示记录。

Java 目前在此部署方案中只提供公开内容读取接口 `/api/contents`。主方案不安装 MySQL，因为仅安装数据库并不能让现有交易流程变成后端持久化。不要切换到 `mysql` profile 并误认为完整业务已经接通。

所有交易仅为模拟，不接收真实付款，不填写真实身份证、收货地址等敏感信息。公开演示账号也不能当作真实系统的安全认证。

**访问链路**：浏览器 → Nginx 的 80 或 443 端口 → Vue 静态文件；内容请求经同源 `/api/contents` → 本机 Java 的 `127.0.0.1:8080`。Java、数据库和 Vite 开发端口不对公网开放。

**代码基线**：仓库 `15717082411/deang-sour-tea-platform`，分支 `codex/vue-final-frontend`，应用版本 `373a86ecdc664dbec9806eea101102c8004c21f8`。后续文档提交不代表应用功能自动升级。

## 2 部署前准备

先在阿里云轻量应用服务器控制台记录公网 IP、实际系统版本、登录用户名和可用登录方式。当前尚未读取到你的实例详情，因此本文不假设你已经购买某个具体配置。建议起点为 2 核 CPU、2 GB 内存、至少 5 GB 可用磁盘，仅用于低并发毕设演示；这不是压力测试结论。

本文中的 `SERVER_IP`、`SSH_USER` 和私钥路径都需要替换。服务器登录用户不是阿里云账号邮箱；以实例远程连接提示为准。不要把登录密码、私钥或云 AccessKey 写进 Git 仓库或发给他人。

**中国内地访问条件**：你给出的控制台地域为上海。面向公网提供网站服务前，应按阿里云当前要求完成备案等适用手续；直接使用公网 IP 不应被视为免备案方案。没有域名或尚未完成这些步骤时，可以先部署并通过第 9 节的 SSH 隧道自测，不必立即开放公网网站。备案与服务内容是否匹配，以阿里云审核和主管部门要求为准，见文末官方资料。

在控制台的实例“防火墙”中检查规则。轻量应用服务器通常管理的是实例防火墙，不要照搬 ECS 安全组页面的操作：

- TCP 22：只允许你当前网络的公网 IP，例如 `你的公网IP/32`；网络变化时再更新规则。
- TCP 80 和 443：自测阶段不必向所有人开放；满足公开访问条件后再按访问范围放行。只部署 HTTP 时不需要提前开放 443。
- TCP 8080、3306、5173：不对公网放行。

如果已有 OpenClaw、宝塔或其他网站，不要重置系统、删除配置或直接停止占用端口的进程。先确认现有业务，再决定共用 Nginx 或使用独立站点。本文以无端口冲突的普通 Linux 环境为基线。

## 3 在本机检查与构建

以下命令在你的 Mac 终端执行，不是在服务器执行。服务器只运行构建结果，不需要承担 Maven 和 Node 构建的内存开销。

### 3.1 检查工具

```bash
node -v
npm -v
java -version
mvn -v
```

建议 Node.js 22 LTS，最低满足当前项目依赖要求；Java 使用 JDK 17，Maven 3.9 系列。`mvn -v` 显示的 Java 也应为 17。安装 IDEA 不等于系统命令行已经配置好 JDK。

如果 Mac 已安装 Homebrew，但缺少上述环境，可执行以下命令。已有合适版本则跳过安装；环境变量作用于当前终端。

```bash
brew install node@22 openjdk@17 maven
export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
export PATH="$(brew --prefix node@22)/bin:$JAVA_HOME/bin:$PATH"
java -version
mvn -v
```

### 3.2 进入正确的项目

这台电脑已有项目，直接使用以下目录。不要误用外层旧版本目录。

```bash
cd "/Users/bytedance/Documents/New project/.worktrees/vue-final-frontend"
git status --short
git rev-parse HEAD
```

若在另一台电脑构建，则新建目录后克隆。以下固定到本文审阅的应用版本，便于复现；不要在有未提交修改的现有目录执行版本切换。

```bash
git clone --branch codex/vue-final-frontend \
  https://github.com/15717082411/deang-sour-tea-platform.git
cd deang-sour-tea-platform
git checkout --detach 373a86ecdc664dbec9806eea101102c8004c21f8
```

### 3.3 构建前后端

在项目根目录执行。任何步骤报错都先处理，不要继续使用旧的 `dist` 或 JAR 冒充本次构建结果。下面的子 Shell 会在出错时停止，不会退出你的整个终端。

```bash
(
  set -eu
  cd frontend
  npm ci
  npm run lint
  npm test
  VITE_API_BASE_URL=/api VITE_BASE_PATH=/ \
    VITE_STATIC_DEMO=false npm run build
  cd ../backend
  mvn -B clean package
)
```

成功后应得到 `frontend/dist/index.html` 和 `backend/target/sour-tea-platform-0.1.0.jar`。本方案不要运行 `build:pages`，也不要使用 GitHub Pages 的仓库名前缀。

**三个前端变量属于构建时配置**：`/api` 保证请求当前服务器，而不是访问者自己的 localhost；`/` 表示部署在站点根路径；`VITE_STATIC_DEMO=false` 允许检测 Java 内容接口。修改变量后必须重新构建，单纯重启 Nginx 不会生效。

### 3.4 制作上传包

仍在项目根目录执行。以下只打包静态产物和 JAR，不上传源码、`node_modules`、Maven 缓存、Git 历史或私钥。执行完成后记下最后打印的文件路径。

```bash
(
  set -eu
  test -f frontend/dist/index.html
  test -f backend/target/sour-tea-platform-0.1.0.jar
  STAGE=$(mktemp -d "${TMPDIR:-/tmp}/deang-release.XXXXXX")
  mkdir "$STAGE/web"
  cp -R frontend/dist/. "$STAGE/web/"
  cp backend/target/sour-tea-platform-0.1.0.jar "$STAGE/app.jar"
  git rev-parse HEAD > "$STAGE/REVISION.txt"
  PACKAGE="$HOME/Downloads/deang-release-$(date +%Y%m%d-%H%M%S).tar.gz"
  tar -czf "$PACKAGE" -C "$STAGE" web app.jar REVISION.txt
  shasum -a 256 "$PACKAGE"
  printf '上传文件：%s\n' "$PACKAGE"
)
```

## 4 登录服务器并安装运行环境

### 4.1 从本机连接

先在轻量控制台设置可用的 SSH 密钥或密码。密钥方式在 Mac 终端执行以下命令；全部占位值都先改为你的真实值。第一次连接时应通过控制台可信渠道核对主机指纹，不要关闭 SSH 主机校验。

```bash
chmod 600 "$HOME/.ssh/你的私钥.pem"
ssh -i "$HOME/.ssh/你的私钥.pem" SSH_USER@SERVER_IP
```

如果使用密码，改用 `ssh SSH_USER@SERVER_IP` 并在终端交互输入，密码不出现在命令里。首次部署也可以使用控制台的远程连接终端，但上传包仍需可用的 SCP 或控制台上传功能。

### 4.2 在服务器确认环境

```bash
cat /etc/os-release
uname -m
free -h
df -h /
sudo ss -ltnp
```

确认系统后，只执行下面对应的一组安装命令。80、443 或 8080 已被其他应用占用时，先识别归属，不要强行结束进程。如果是 Windows 或其他不在本文范围内的系统，先停止并调整方案，不要直接重装已有服务器。

Ubuntu 22.04 或 24.04：

```bash
sudo apt-get update
sudo apt-get install -y openjdk-17-jre-headless nginx curl nano
```

Alibaba Cloud Linux 3：

```bash
sudo dnf install -y java-17-openjdk-headless nginx curl nano
```

验证输出，`/usr/bin/java` 必须实际指向 Java 17。若有多版本，用系统 alternatives 工具选择正确版本，或在第 7 节服务文件中填写 Java 17 的绝对路径。

```bash
/usr/bin/java -version
nginx -v
sudo nginx -t
```

## 5 上传并创建发布目录

### 5.1 从本机上传

另开一个 Mac 终端，替换成第 3 节实际生成的包名和服务器信息。密码登录方式去掉 `-i` 参数。

```bash
scp -i "$HOME/.ssh/你的私钥.pem" \
  "$HOME/Downloads/deang-release-实际时间.tar.gz" \
  SSH_USER@SERVER_IP:~/deang-release.tar.gz
```

### 5.2 在服务器安装产物

先比较 `sha256sum` 与本机构建包的哈希是否一致。首次部署前，确认系统没有其他用途的 `deang` 用户或同名目录；如已存在，先检查来源再复用。

```bash
sha256sum "$HOME/deang-release.tar.gz"
tar -tzf "$HOME/deang-release.tar.gz"
getent passwd deang
ls -ld /srv/deang-tea
```

首次安装时，最后两条显示“没有该用户或目录”是正常的。确认无同名资源后创建服务用户和目录；这两条只在首次部署执行。

```bash
sudo useradd --system --user-group --no-create-home \
  --home-dir /nonexistent --shell /usr/sbin/nologin deang
sudo install -d -m 0755 /srv/deang-tea/releases
```

下列命令在同一个服务器终端执行。若任何一步失败，请停止；不要继续切换 current。文件名和路径检查只针对你自己刚生成的发布包，不执行来源不明的压缩包。

```bash
RELEASE=$(date +%Y%m%d-%H%M%S)
(
  set -eu
  TARGET="/srv/deang-tea/releases/$RELEASE"
  sudo install -d -m 0755 "$TARGET"
  sudo tar --no-same-owner -xzf "$HOME/deang-release.tar.gz" -C "$TARGET"
  sudo chown -R root:root "$TARGET"
  sudo find "$TARGET" -type d -exec chmod 755 {} \;
  sudo find "$TARGET" -type f -exec chmod 644 {} \;
  test -f "$TARGET/web/index.html"
  test -f "$TARGET/app.jar"
  sudo ln -s "$TARGET" /srv/deang-tea/current
)
```

最后的 `ln -s` 仅适用于首次发布。升级时按第 11 节操作，不覆盖既有发布目录。

## 6 配置服务器防火墙

阿里云实例防火墙与服务器操作系统防火墙是两层，需要分别检查。不要为了让网页可访问而关闭防火墙。

Ubuntu 使用 UFW 时，先执行 `sudo ufw status verbose`。如果显示 inactive，不必为了本次部署盲目启用；由云防火墙限制入站，并记录当前状态。如果已启用，在保持当前 SSH 会话的情况下，按需允许 HTTP 与 HTTPS；SSH 规则必须在任何修改前确认仍允许你的 IP。

```bash
sudo ufw status verbose
```

仅当 UFW 已启用且准备开放网站时执行：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Alibaba Cloud Linux 3 如启用了 firewalld，先检查 `sudo firewall-cmd --state` 和 `sudo firewall-cmd --get-active-zones`，再在实际承载网卡的 zone 添加 `http`、`https` 服务。不要假设默认 zone 就是网卡所在 zone；已有自定义网络策略时先保留它们。

仅通过 SSH 隧道自测时无需增加公网 80 或 443 规则。8080 始终仅绑定回环地址，不配置公网放行。

## 7 让 Java 服务开机自启

在服务器执行 `sudo nano /etc/systemd/system/deang-tea.service`，粘贴下面的完整内容。nano 中按 Control+O、回车保存，Control+X 退出。该文件若已存在，先备份再修改。

```ini
[Unit]
Description=Deang Sour Tea Content API
After=network.target

[Service]
Type=simple
User=deang
Group=deang
WorkingDirectory=/srv/deang-tea/current
ExecStart=/usr/bin/java -Xms128m -Xmx512m \
  -jar /srv/deang-tea/current/app.jar \
  --spring.profiles.active=demo \
  --server.address=127.0.0.1 --server.port=8080
Restart=on-failure
RestartSec=5
SuccessExitStatus=143
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
UMask=0027

[Install]
WantedBy=multi-user.target
```

`-Xmx512m` 是 Java 堆上限，不是整个 Java 进程的总内存上限。2 GB 机器应避免同时运行重型面板、数据库和本地构建。这里使用 demo profile，不配置数据库；后端 demo 启动时会生成临时 JWT 密钥，但本方案不公开它的认证和管理接口。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now deang-tea
sudo systemctl status deang-tea --no-pager
sudo journalctl -u deang-tea -n 80 --no-pager
curl -fsS http://127.0.0.1:8080/api/contents
```

预期：服务显示 active，内容接口返回包含 `data` 的 JSON。失败时先看日志并修复，不要继续把一个异常服务当作部署成功。不要用 `npm run dev`、IDEA Run 或长期挂着终端的方式替代 systemd。

## 8 配置 Nginx 统一入口

在服务器执行 `sudo nano /etc/nginx/conf.d/deang-tea.conf`。若同名文件已存在，先备份。把配置中的 `SERVER_IP` 替换为真实公网 IP；后续绑定域名时可以写成 `server_name SERVER_IP tea.example.com;`，其中域名也必须替换。

```nginx
server {
    listen 80;
    server_name SERVER_IP;
    root /srv/deang-tea/current/web;
    index index.html;
    client_max_body_size 1m;

    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location = /api/contents {
        limit_except GET { deny all; }
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    location ^~ /api/ {
        return 404;
    }

    location ~ /\. {
        deny all;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

此配置只开放 Java 的内容读取接口；HEAD 随 GET 允许。其他 `/api/` 路径返回 404，内容写入返回 403，避免把后端 demo 管理接口暴露给公网。前端本地演示角色切换仍然可用。不要把整个 `/api/` 无条件代理到 demo 后端。

`try_files` 用于解决 Vue 路由页面刷新后 404。不要添加 GitHub Pages 的子路径，不要删除服务器上其他站点配置来“解决”默认页面问题。

```bash
(
  set -eu
  sudo nginx -t
  sudo systemctl enable --now nginx
  sudo systemctl reload nginx
  curl -I -H 'Host: SERVER_IP' http://127.0.0.1/
  curl -fsS -H 'Host: SERVER_IP' http://127.0.0.1/api/contents
)
```

只有 `nginx -t` 成功后才继续启动或重载。测试时同样替换 Host 里的 `SERVER_IP`，否则可能误测默认站点。

Alibaba Cloud Linux 3 若启用 SELinux 且出现权限拒绝，请先检查审计日志。不要执行 `setenforce 0` 或 `chmod 777`。确认是 Nginx 读取新目录或反向代理被策略阻止后，再由管理员为 `/srv/deang-tea` 设置持久的 Web 内容标签，并按需授予 HTTP 服务网络连接权限；这属于系统策略调整，不应盲目复制到其他业务机器。

## 9 验证访问与交互

### 9.1 尚未开放公网时

在 Mac 终端建立 SSH 隧道并保持终端运行。它让本机 18080 端口转发到服务器 Nginx，不需要公开服务器 80 端口。

```bash
ssh -i "$HOME/.ssh/你的私钥.pem" -N \
  -L 18080:127.0.0.1:80 SSH_USER@SERVER_IP
```

为使浏览器以 `localhost` 访问时命中本站点，可在本项目的 Nginx `server_name` 中临时加上 `localhost`，例如 `server_name SERVER_IP localhost;`，通过 `nginx -t` 后重载。已有 localhost 站点时不要重复配置。然后在本机访问 `http://localhost:18080`。停止隧道按 Control+C；服务器服务不会停止。

不要向其他人分享服务器管理员私钥。隧道用于维护者自测，不是把管理员权限发给所有预览者的方案。

### 9.2 具备公网访问条件后

按第 2 节放行 80，再访问 `http://你的公网IP`。正式分享建议完成第 10 节的域名和 HTTPS；纯 HTTP 不保证传输保密，即使演示也不要输入真实资料。

用手机关闭 Wi-Fi 后访问，或让另一网络的电脑访问，确认不是只能在本机打开。浏览器开发者工具 Network 中，`/api/contents` 应访问当前站点并返回 200，不应出现 `localhost:8080`。

按以下顺序验收，且用测试数据：

1. 打开首页、科普内容、商品页；刷新一个非首页路由，页面仍可打开。
2. 用 `user_demo` 登录，测试加入购物车、创建订单、模拟支付、查看订单。
3. 在同一个浏览器切换 `merchant_demo` 和 `admin_demo`，验证页面提供的商家处理和管理流程。
4. 上述三个账号密码均为 `Demo123!`。它们是公开演示账号，不是服务器账号。
5. 换一个浏览器打开，确认页面可用，并理解之前的本地订单不共享；这不是服务器数据库故障。
6. 在服务器检查服务状态与端口：Nginx 监听网站端口，Java 只监听 `127.0.0.1:8080`。

```bash
sudo systemctl is-enabled deang-tea nginx
sudo systemctl is-active deang-tea nginx
sudo ss -ltnp
curl -o /dev/null -s -w '%{http_code}\n' \
  -H 'Host: SERVER_IP' http://127.0.0.1/api/auth/login
```

最后一条应返回 404，证明该入口没有公开后端认证接口。确认无其他工作会受影响后，可以在控制台重启实例，再重复页面和接口检查，以验证开机自启。未测试重启前不要记录为“已验证自启恢复”。

## 10 域名与 HTTPS

本节只在你已有可使用域名、完成适用备案并希望分享常规浏览器链接时执行。不需要为部署额外购买数据库或负载均衡器。

1. 在域名 DNS 中新增 A 记录，主机名例如 `tea`，记录值为服务器公网 IP。得到的完整域名是 `tea.你的域名`，不要照抄示例域名。
2. 修改本站点 `server_name`，加入完整域名，验证 HTTP 域名能够命中该站点。
3. 在阿里云数字证书管理服务或其他可信 CA 申请该域名证书，完成域名验证，下载 Nginx 格式证书。可用免费额度与有效期以申请时页面为准，本文不承诺免费期限。
4. 将完整证书链保存为服务器 `/etc/nginx/ssl/deang-tea/fullchain.pem`，私钥保存为 `privkey.pem`。目录仅由 root 管理，私钥权限 600，禁止提交 Git。
5. 在现有 server 块中把 `listen 80;` 改为下面三行，保留其余路由；证书的域名必须与 `server_name` 中用于 HTTPS 访问的域名一致。

```nginx
listen 443 ssl;
ssl_certificate /etc/nginx/ssl/deang-tea/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/deang-tea/privkey.pem;
```

再增加独立 HTTP 跳转块，替换 `tea.example.com`，不要原样使用：

```nginx
server {
    listen 80;
    server_name tea.example.com;
    return 301 https://tea.example.com$request_uri;
}
```

检查私钥属主与权限，然后执行 `sudo nginx -t`；通过后重载并放行 443。访问 `https://你的域名`，确认无证书警告。IP 地址通常不在该域名证书的有效范围，不要用 HTTPS IP 链接验收域名证书。

记录证书到期日并安排续期。续期后替换证书、验证配置并重载 Nginx。HTTP 改 HTTPS、IP 改域名或切换端口都会改变浏览器存储的来源，原有 localStorage 订单不会自动迁移，应重新准备演示数据。

## 11 更新与回滚

更新时先在本机构建和测试，再按第 3 节生成新包、第 5 节上传。不要在运行目录上覆盖解压，也不要删掉当前正常版本。每次保留应用版本号和压缩包哈希。

在服务器按第 5.2 节创建新的 `releases/$RELEASE` 并解压、设置权限、检查文件，但不要再次执行首次发布的 `ln -s`。确认 current 是本项目的符号链接后，在同一终端记录旧版本并切换：

```bash
test -L /srv/deang-tea/current
PREVIOUS=$(readlink -f /srv/deang-tea/current)
printf '回滚目录：%s\n' "$PREVIOUS"
(
  set -eu
  test -L /srv/deang-tea/current
  test -f "/srv/deang-tea/releases/$RELEASE/app.jar"
  test -f "/srv/deang-tea/releases/$RELEASE/web/index.html"
  sudo ln -s "/srv/deang-tea/releases/$RELEASE" /srv/deang-tea/current.next
  sudo mv -Tf /srv/deang-tea/current.next /srv/deang-tea/current
  sudo systemctl restart deang-tea
  sudo systemctl status deang-tea --no-pager
  curl -fsS http://127.0.0.1:8080/api/contents
)
```

然后重复第 9 节的 Nginx 和浏览器验收。短暂重启 Java 时，前端可能退回演示内容，因此“首页能打开”不等于后端更新成功。升级前后测试期间尽量避免其他人操作。

若验证失败，在仍保留 `PREVIOUS` 的同一终端执行以下回滚。终端已关闭则先把 `PREVIOUS` 设为你记录的旧版本绝对路径，并确认该目录存在。

```bash
(
  set -eu
  test -n "$PREVIOUS"
  test -f "$PREVIOUS/app.jar"
  sudo ln -s "$PREVIOUS" /srv/deang-tea/rollback.next
  sudo mv -Tf /srv/deang-tea/rollback.next /srv/deang-tea/current
  sudo systemctl restart deang-tea
  curl -fsS http://127.0.0.1:8080/api/contents
)
```

如果更新还修改了 Nginx 或 systemd 文件，必须同步恢复它们的备份，并分别执行配置检查、daemon-reload 和必要的重载。只切换应用目录不能回滚所有系统配置。

至少保留最近两个验收通过的发布目录，并备份本站点 Nginx、systemd 配置。含 TLS 私钥的备份应加密且限制访问。服务器文件备份不包含各访问者浏览器里的订单；答辩前应重新准备可重复的演示步骤。

## 12 常见问题与交付清单

**网站打不开**：先查实例运行状态、公网 IP、云防火墙、系统防火墙，再查 `nginx -t` 与监听端口。不要第一时间把所有端口开放。

**显示 Nginx 欢迎页**：检查访问域名或 IP 与 `server_name` 是否一致，以及 `conf.d/*.conf` 是否由主配置加载。用 `sudo nginx -T` 查看实际配置，不删除其他人的站点。

**页面刷新 404 或资源白屏**：检查 Vue 的 `try_files`、前端 base 是否为 `/`、`current/web/index.html` 是否存在。源码已改但页面不变时，重新构建并确认切换到了新发布目录。

**内容 API 502**：检查 Java 状态、启动日志、8080 监听地址；确认使用 JDK 17。SELinux 环境还要检查反向代理权限。用服务器本机 curl 先区分 Java 故障和 Nginx 故障。

**Maven 构建失败**：确认 `mvn -v` 使用 JDK 17，网络能访问依赖仓库，本机 Maven 缓存可写。若默认缓存权限受限，可用 `mvn -B -Dmaven.repo.local="$HOME/.m2-deang" clean package`；不要用 sudo 构建造成更多属主问题，也不要直接跳过测试。

**服务退出或内存不足**：查看 `journalctl -u deang-tea`、`free -h` 和内核 OOM 记录；先停止不需要的重型服务或升级内存。不要为了让服务启动而盲目放宽所有系统限制。

**用户在另一台电脑看不到订单**：这是当前浏览器本地演示架构的边界。需要跨设备真实共享账户、商品和订单时，应先补齐后端业务、权限和数据库迁移，再更新部署方案。

**部署完成的最低记录**：

- 记录服务器系统、应用 commit、发布目录、最终访问地址和部署日期。
- 前端构建与后端测试打包成功；不是复用无法追溯的旧产物。
- 首页、非首页刷新、内容 API 以及三种角色演示已实际验收。
- Java 没有监听公网；后端认证和管理 API 未通过 Nginx 暴露。
- 开机自启配置、重启恢复测试、日志查看和回滚路径均有记录。
- 公网访问条件及 HTTPS 状态已明确；没有把模拟支付描述为真实收款。

**本次文档生成前的检查记录**：前端 ESLint、33 个测试文件中的 259 个测试及生产构建通过；后端 Maven 打包尝试因本机默认缓存目录写入受限而中止，未据此宣称后端打包通过。本次未登录服务器完成安装、未验证公网连通性，也未执行上述部署命令。部署后的结果需由你按清单实际确认。

## 官方资料

- [阿里云轻量应用服务器防火墙管理](https://help.aliyun.com/zh/simple-application-server/user-guide/manage-the-firewall-of-a-server)
- [阿里云 ICP 备案申请概述](https://help.aliyun.com/zh/icp-filing/basic-icp-service/user-guide/icp-filing-application-overview)
- [个人网站备案流程](https://help.aliyun.com/zh/icp-filing/basic-icp-service/getting-started/quick-start-for-icp-filing-for-personal-websites)
- [Nginx try_files 官方说明](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)
- [Alibaba Cloud Linux 3 软件与更新记录](https://help.aliyun.com/zh/alinux/product-overview/release-notes-for-alibaba-cloud-linux)
- [阿里云 Linux 环境的 Nginx 安装参考](https://help.aliyun.com/zh/terraform/manually-build-an-lnmp-environment-on-a-centos-instance)

本手册仅引用最后一份资料中的系统与 Nginx 安装信息，不要求部署其中的 MySQL 或 PHP。
