# 创作确认 → 可编辑项目 → 动态精调

Character Studio 的正式职责是编辑已有设计的字符与动画，不以实验性自动排版替代视觉设计。

## 用户的两条主路径

- 使用模板：选取7套已完成作品之一，创建独立副本，调节并导出。
- 打开项目包：载入在 Codex 中已确认的设计与动画，精调并导出。

“更多 → 在 Codex 中创作”提供可复制的创作指令。用户在自己的 Codex 中附参考、提出要求；编辑器内聊天只帮助修改当前作品。全新设计、重新排版或未知主体重建应回到设计确认环节，不以局部调参冒充完成。

## Codex 制作顺序与确认点

1. 读取用户参考，明确构图、文字、字体、光色、材质、主体结构和运动要求。列出需要保持的视觉特征，不默认添加以前作品中的波形、条码或装饰。
2. 制作静态稿，实际展示，等待用户确认视觉方向。不要用配置正确代替审美确认。
3. 从同一设计制作动态预览，明确每个元素的运动方式与哪些部分能切换字符。等待用户确认运动效果，保留标题完整、画幅完整和连续运动。
4. 在当前编辑器的能力内准备可编辑素材与参数。未知主体需要新的渲染器时，先适配代码、运行并验证；单独项目包不能携带可执行渲染器，不能把花型模板或浮雕当作任意物体完整三维模型。
5. 验证导入、字符/动效参数改变实际画面、保存恢复、PNG与MP4导出。项目完成后尽量自动载入当前用户的本机编辑器，并同时保留ZIP作为备份或分享文件。

确认是用户对效果的确认；程序返回成功、模型自述和“视觉核对”复选框不能代替用户确认。

## 当前可导入的项目格式

ZIP根目录为 `project.json`，素材放在 `assets/`。格式名是 `character-studio-project`，不是仓库源码ZIP，也不是把PNG/MP4改后缀。项目只含声明式配置与PNG素材，不运行包内代码。最稳妥的起点是对匹配类型的项目使用编辑器“更多 → 备份项目”，再遵守对应校验修改。

- v1 运动场：720×960，180×240的运动图块，6秒基础周期；需要base、mask、atlas、thumbnail，帧数2..150，列数1..15。适合已预制的连续字符运动。
- v2 电视：`renderer: crt-screen`，720×1280，25/30fps，6秒基础周期；需要base、mask、thumbnail，以及屏幕角点、字幕和时间轴配置。
- v3 图层：`renderer: raster-poster`，720×1080或720×1280，25/30fps，6秒基础周期；需要base、source、thumbnail和受支持的图层。可使用已有字符曲面、浮雕、磷光或其他受支持图层。source为720×1080或720×1280。

所有类型还需要title、name、description、lower、inkColor、glowColor、intersection、softInk。`editableSettings`保存已确认的参数；图片路径均指向ZIP中的素材。

真实格式与参数范围以这些代码为准：

- `src/project_state.py:backup`：从已有作品生成完整项目包。
- `src/project_import.py:import_project`：包结构、素材和尺寸的校验。
- `src/crt_project.py`、`src/raster_project.py`、`src/poster_layers.py`：渲染器与图层能力。
- `src/project_state.py`：可编辑设置、版本和参数校验。

可在本机用Python验证：

```python
import sys
from pathlib import Path
sys.path.insert(0, 'src')
from project_import import import_project
scratch = Path('/tmp/character-project-check')  # Windows改为自己的临时目录
scratch.mkdir(parents=True, exist_ok=True)
result = import_project(Path('approved-project.zip').read_bytes(), scratch)
print(result['project']['id'])
```

这一步只验证格式；仍要实际打开编辑器检查画面与运动。自动载入可对正在运行的本机服务 `POST /api/projects/import`，请求体为ZIP二进制、Content-Type为application/zip，然后打开 `/?project=<返回的project.id>`。只使用当前用户明确指定的本机实例，保留原件、历史与私有数据。

## 编辑器里的调节边界

- 能做：已有动态主体的字符风格、大小、疏密；整体速度；受支持图层的文字、位置与独立动效；保存恢复与导出。
- 不保证：任意单图自动分层、未知物体完整三维重建、摄影背景修补、任意字体字符化、新渲染器代码自动导入。
- 备份ZIP可继续编辑；PNG/MP4是最终展示文件；JSON参数需要匹配原项目素材。

“更多 → 实验室 · 参考图试作”保留旧草稿、选区提取、简单排版和预设结构，用于试验，不是正式创作的必经步骤，也不承诺还原参考审美。
