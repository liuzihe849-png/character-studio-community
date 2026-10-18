# Character Studio

**先在 Codex 中确认设计，再在这里精调字符与动画。内置 7 套精选模板，也支持打开已确认作品的项目包。**

公开源码供个人免费使用，商业使用须取得作者另行授权。**这是 source-available 项目，不使用 MIT / Apache 等标准开源许可。** 详见 [LICENSE](LICENSE)。

<img src="docs/preview/T01.jpg" width="220" alt="Flutter 蝴蝶模板"> <img src="docs/preview/T02.jpg" width="220" alt="Pelagic 水母模板"> <img src="docs/preview/T11.jpg" width="220" alt="COLD SIGNAL 可乐瓶模板">

## 最省事的使用方式：把仓库交给你的 AI

把下面这段话发给你自己的 Codex 或其它有终端能力的 AI：

> 请安装并启动 https://github.com/liuzihe849-png/character-studio-community 。先阅读仓库里的 AGENTS.md 和 docs/AI_SETUP.md，创建独立 Python 虚拟环境，安装依赖，运行检查与测试，然后启动完整编辑器。保留全部功能和 7 套模板，不要改写成演示页面。不要读取、复制或使用项目作者的账号、密钥与聊天。需要 AI 时，帮助我连接我自己电脑上的 Codex 或我自行提供的模型 API。不要把本地服务暴露到公网。

这个项目适合**下载后在自己的电脑运行**：不用作者部署服务器，也不需要作者提供 AI 额度。它不是 GitHub Pages 上点击即用的在线服务。

## 手动启动

需要 Python 3.10 或更高版本、现代桌面浏览器。首次安装依赖需要联网。

```bash
git clone https://github.com/liuzihe849-png/character-studio-community.git
cd character-studio-community
python3 setup.py --start
```

Windows 可以把最后一行换为 `py -3 setup.py --start`，或双击 `start.bat`。macOS 可在安装 Python 后双击 `start.command`。

已安装依赖时：

```bash
# macOS / Linux
.venv/bin/python start.py
# Windows
.venv\Scripts\python.exe start.py
```

浏览器默认打开 `http://127.0.0.1:8895/`；端口占用时会选择后续空闲端口，以终端输出为准。保持终端运行，按 Ctrl+C 停止。**这是本机地址，不是发给其他人的网站地址；分享本仓库链接即可。**

## 推荐制作流程

1. **使用模板**：直接选一套已完成作品，创建副本，调整字符、速度和支持的独立动效。
2. **全新创作**：在自己的 Codex 中提供参考，先确认静态海报，再确认动态预览；准备兼容的可编辑项目后自动载入，或使用顶部「打开项目包」。
3. **精调与导出**：编辑器内 AI 帮助修改当前作品；保存项目备份，导出 PNG / MP4。

顶部「更多 → 在 Codex 中创作」可以复制创作指令。单张图片和视频没有完整的图层或三维运动数据，不能当作可编辑项目载入。制作与项目格式详见 [创作工作流](docs/CREATIVE_WORKFLOW.md)。

## 编辑器功能

- 正式入口：使用7套精选模板，或打开 Codex 中已确认的可编辑项目包。
- 实验室：保留参考分析、范围提取、简单排版、预设结构和旧草稿，入口在「更多」。不作为默认创作路径，不承诺复现参考审美。
- 模板编辑：主体字符样式、颗粒大小与疏密、速度、辉光，以及适用图层的独立动画。
- 字幕与标题：支持对应图层的像素入画、打字、闪动、电压不稳定等效果。
- AI 对话：使用自己的 Codex 或 Responses / Chat Completions 兼容 API；支持受控参数修改、预览核对与历史恢复。
- 保存、项目 ZIP 备份/导入、PNG 和 MP4 导出。视频编码器由依赖提供，不要求安装 Swift。
- 模板原件只读。使用模板创建独立副本，不覆盖原作。

## 模板库只有这 7 套

| 模板 | 动态主体 |
|---|---|
| Flutter | 蝴蝶振翅 |
| Pelagic | 水母收缩与浮游 |
| I’m OK | 百合开合 |
| groupies | 鸢尾开合 |
| STILL FEELING? | 电视场景与像素字幕 |
| COLD SIGNAL | 三维字符瓶形与悬浮 |
| GROW FLOW | 磷光花形转火焰消散 |

## 连接你自己的 AI

**不用 AI 也能编辑模板和导出。** 需要对话精调当前作品时，点击顶部「连接我的 AI」。全新设计仍先在 Codex 中完成确认。

### 本机 Codex：不需要 API Key

1. 在自己的电脑安装并登录 [Codex CLI](https://developers.openai.com/codex/cli)。程序也会尝试检测支持的 macOS Codex 桌面安装路径。
2. 选择「本机 Codex」，点击「测试连接」；未登录时使用「登录 Codex」。
3. 返回「对话改图」，描述修改要求。编辑器会开启自己的专属会话，不会继承你原来的聊天。

每个人使用**自己电脑上的 Codex、自己的账号与额度**。仓库没有作者的登录凭据。Codex 在本机运行客户端，模型请求仍可能发送到其云端服务。

当前集成面向本机个人使用；不要把 Codex 登录凭据移到共享服务器，或把这个本地接入当作托管/商业服务授权。[官方 app-server 接入边界](https://developers.openai.com/codex/app-server#auth-endpoints)。

### 自己的模型 API

选择「自己的模型 API」，填写接口地址、协议、模型名称及 API Key，然后保存并测试连接。模型需要支持工具调用；分析参考图还需要相应看图能力。豆包等聊天软件的会员账号不等于其模型开放 API。服务商的模型、费用和支持情况由使用者自行确认。

## 作品和密钥在哪里

- Windows：`%LOCALAPPDATA%\CharacterStudioCommunity`
- macOS：`~/Library/Application Support/Character Studio Community`
- Linux：`~/.local/share/character-studio-community`，支持 `XDG_DATA_HOME`。

作品在其 `editor/projects` 中；AI 连接设置、对话、草稿在同级隐藏的 `.character-studio-private` 中，不会进入项目 ZIP。升级仓库不会清空这些数据。删除本地目录前请先备份自己的作品。

`python start.py --data-dir <你自己的目录>` 可指定独立空间。此目录应放在仓库外；不要提交其中的密钥与聊天。更多见 [隐私与安全](SECURITY.md)。

## 能力与验证边界

- 参考提取是 2.5D 字符浮雕；花朵、水母、蝴蝶有预设三维结构，不是任意物体自动完整三维重建。
- 烘焙在底图里的文字/Logo不能像独立文字层一样改写。哪些参数可编辑以模板的实际图层为准。
- 当前服务是本机单用户工具，不是已经具备注册、租户隔离的公网 SaaS。保持监听 `127.0.0.1`。
- macOS 上已完成完整编辑器、7 模板加载、保存恢复、新建与视频导出验证。Windows / Linux 提供跨平台源码、启动方式和测试流程；没有对应实机时不宣称已通过实机验收。
- 未接通真实服务商账号的接口不能仅凭配置页面宣称可用。测试会使用模拟 API 验证协议，不消耗你的真实额度。

## 检查与反馈

```bash
python start.py --check
python -m unittest discover -s tests -v
```

报告问题时可附系统、Python 版本、操作步骤和错误信息；不要附密钥、完整连接设置或私人聊天。项目保持作者署名和商用授权入口，未授予第三方品牌、专辑或商标的额外使用权。
