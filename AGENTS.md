# Repository Guidelines

## Project Structure & Module Organization

This repository contains a graduation-project MVP for the Deang sour tea platform.

- `frontend/`: static Web demo for culture content, H5 interaction, shop, cart, orders, booking, merchant center, and admin dashboard.
- `backend/`: Java 17 + Spring Boot 3 API scaffold with demo in-memory data.
- `backend/src/main/resources/db/schema.sql`: MySQL initialization script.
- `build_*_docx.py`: generators for PRD and technical-solution DOCX files.
- `*.docx`: generated planning deliverables.
- `*_ql/` and `*_render/`: preview/render QA artifacts.

## Build, Test, and Development Commands

Regenerate documents:

```bash
/Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 build_deang_sour_tea_prd.py
/Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 build_tech_solution_docx.py
```

Run/check the frontend demo:

```bash
open frontend/index.html
node --check frontend/app.js
```

Run the backend on a machine with JDK 17 and Maven. Default `demo` mode uses in-memory data; `mysql` mode uses MySQL and MyBatis-Plus:

```bash
cd backend
mvn spring-boot:run
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
```

## Coding Style & Naming Conventions

Use 4-space indentation for Python and JavaScript. Java code follows standard Spring Boot package naming under `com.deang.sourtea`. Keep generated filenames descriptive, for example `德昂族酸茶数字化互动体验平台_PRD.docx`.

Prefer editing generator scripts over manually editing generated DOCX files.

## Testing Guidelines

There is no formal test suite yet. For frontend changes, run `node --check frontend/app.js`, then manually verify role switching, H5 flow, cart, order, booking, merchant center, and admin approval. For document changes, regenerate the DOCX and confirm required terms such as `德昂族酸茶`, `普通用户`, `商家`, `管理员`, and `Spring Boot 3`.

## Commit & Pull Request Guidelines

This repo has no established commit history. Use concise imperative commits, such as `Add backend order API` or `Update PRD with merchant role`.

Pull requests should include a summary, affected files, verification steps, and screenshots or preview images for UI/DOCX layout changes.

## Security & Configuration Tips

Do not commit real credentials, API keys, production database URLs, or private user data. Keep environment-specific values in ignored `.env` or `application-local.yml` files.
