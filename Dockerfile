# ==========================================
# 魔方最优解可视化系统 - Docker 部署
# ==========================================
# 多阶段构建：最终镜像仅含运行时依赖
# ==========================================

# ---------- Stage 1: 构建阶段 ----------
FROM python:3.11-slim AS builder

WORKDIR /app

# 安装编译依赖（kociemba 需要 C 编译器）
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装到独立目录
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ---------- Stage 2: 运行阶段 ----------
FROM python:3.11-slim AS runtime

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    PORT=5000

WORKDIR /app

# 从构建阶段复制已安装的 Python 包
COPY --from=builder /install /usr/local

# 复制应用源码
COPY src/ src/
COPY static/ static/
COPY templates/ templates/
COPY run.py .

# 创建非 root 用户（安全最佳实践）
RUN groupadd -r rubik && useradd -r -g rubik -d /app rubik && \
    chown -R rubik:rubik /app

USER rubik

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/health')" || exit 1

# 暴露端口
EXPOSE 5000

# 使用 Gunicorn 启动（生产模式）
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "src.api.app:app"]
