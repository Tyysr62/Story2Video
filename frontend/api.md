# 服务端接口方案

# 1. GET /v1/stories

Code block  
```txt
1 curl -X GET "http://localhost:8080/v1/stories" -H "X-User-ID: 11111111-2222-3333-4444-555555555555"
```

Code block  
```javascript
1 {"items":[{id":"aff9edc-cdad-4c26-8c3b-8fb44f8a6898","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T19:51:54.190894+08:00","updated_at":"2025-12-01T19:53:54.399044+08:00","content":"穿越沙漠寻找古城","title":"沙漠秘境","style":"movie","duration":0,"status":"ready","timeline":null,"cover_url":"","video_url":"/static/aff9edc-cdad-4c26-8c3b-8fb44f8a6898_FINAL_MOVIE.mp4"},{"id":"cf000374-bdf4-403f-8112-d57fb5617cb1","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T19:39:51.915875+08:00","updated_at":"2025-12-01T19:39:51.915875+08:00","content":"花田里的冒险","title":"花田传说","style":"movie","duration":0,"status":"generating","timeline":null,"cover_url":"","video_url":"】【},{id":"3d38342b-c4d2-4171-ab87-bda85a36136e FINAL_MOVIE.mp4"},{"id":"95134d9c-8ca0-407b-b0f7-a4df9bcfe69c","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T19:19:20.273197+08:00","updated_at":"2025-12-01T19:41:13.032344+08:00","content":"小狗找妈妈的故事","title":"温馨短片","style":"movie","duration":0,"status":"ready","timeline":null,"cover_url":"","video_url":"/static/3d38342b-c4d2-4171-ab87-bda85a36136e FINAL_MOVIE.mp4"},{"id":"95134d9c-8ca0-407b-b0f7-a4df9bcfe69c","user_id":"11111111-2222-3333-4444-55
```

- 列表含5条故事，其中新增的雪山奇缘已ready并附带视频URL。

# 2. POST /v1/stories

Code block  
```txt
1 curl -X POST "http://localhost:8080/v1/stories" -H "Content-Type: application/json" -H "X-User-ID: 11111111-2222-3333-4444-555555555555" -d '{"display_name":"雪山奇缘","script_content":"两名旅人在雪山中迷路的故事","style":"movie"}'
```

Code block  
```json
1 {"operation_name":"operations/b0b3a96d-dca3-42f4-a85b-e551a2bee5fd","state":"queued","create_time":"2025-12-01T20:40:30.761361+08:00"}
```

- 任务入队成功。

3. GET /v1/operations/b0b3a96d...

Code block  
```batch
1 curl -X GET "http://localhost:8080/v1/operations/b0b3a96d-dca3-42f4-a85b-e551a2bee5fd" -H "X-User-ID: 1111111-2222-3333-4444-555555555555"
```

Code block  
```json
1 {"id":"b0b3a96d-dca3-42f4-a85b-e551a2bee5fd","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T20:40:30.761361+08:00","updated_at":"2025-12-01T20:40:37.220895+08:00","story_id":"4fbb04b3-db6d-4928-AA2d-2514a2469a82","shot_id":"00000000-0000-0000-0000-000000000000","type":"story_create","payload":{"style":"movie","display_name":"雪山奇缘","script_content":"两名旅人在雪山中迷路的故事"},"status":"succeeded","retries":0,"error msg":"","worker":"story-worker","started_at":"2025-12-01T20:40:31.789637+08:00","finished_at":"2025-12-01T20:40:37.220517+08:00"}
```

- Kafka worker 正常拉取并写入 Story/Shots。

4. GET /v1/operations/2d6c6355... (花田传说)

Code block  
```batch
1 curl -X GET "http://localhost:8080/v1/operations/2d6c6355-f634-4ac8-bcf1-
```

```txt
d543f635c080" -H "X-User-ID: 1111111-2222-3333-4444-55555555555"
```

Code block  
```txt
1 {"id":"2d6c6355-f634-4ac8-bcf1-d543f635c080","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T19:39:51.917938+08:00","updated_at":"2025-12-01T19:39:55.175971+08:00","story_id":"cf000374-bdf4-403f-8112-d57fb5617cb1","shot_id":"00000000-0000-0000-0000000000000","type":"story_create","payload":{"style":"movie","display_name":"花田传说","script_content":"花田里的冒险"},"status":"failed","retries":0,"error msg":"rpc error: code = Internal desc = create storyboard: model service /api/v1/storyboard/create status=502 body={'detail':'LLM 分镜生成失败，请稍后重试"}", "worker":"started_at":"2025-12-01T19:39:52.935581+08:00","finished_at":"2025-12-01T19:39:55.172329+08:00"}
```

- 依旧是模型 HTTP 502，所以失败与服务端无关。

5. GET /v1/stories/{4fbb}/shots

Code block  
```batch
1 curl -X GET "http://localhost:8080/v1/stories/4fbb04b3-db6d-4928-AA2d-2514a2469a82/shots" -H "X-User-ID: 1111111-2222-3333-4444-555555555555"
```

Code block  
```javascript
1 {"shots": ["id":"e6289115-9e5b-4625-98b0-413cd47d8f0a","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T20:40:37.19697+08:00","updated_at":"2025-12-01T20:40:37.19697+08:00","story_id":"4fbb04b3-db6d-4928-AA2d-2514a2469a82","sequence":"1","title":"两名旅人","description":"写实风格。冷色调的顶光照射，高对比度的阴影。画面左侧，两名穿着登山服的旅人先低头查看指南针，然后抬头望向画面右上方的雪山，最后互相确认眼神。","details":"写实风格。冷色调的顶光照射，高对比度的阴影。画面左侧，两名穿着登山服的旅人先低头查看指南针，然后抬头望向画面右上方的雪山，最后互相确认眼神。","narration":"迷雾笼罩雪山","type":"水平横移拍摄","transition":"none","voice":"紧张","status":"done","image_url":"","bgm":"]},{"id":"18bc2686-65c7-47b5-a445-6af3bb0ac560","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T20:40:37.201424+08:00","updated_at":"2025-12-01T20:40:37.201424+08:00","story_id":"4fbb04b3-db6d-4928-AA2d-2514a2469a82","sequence":"2","title":"旅人","description":"电影感。暖色的逆光透过雪山，柔和渐变的阴影。画面右侧，一名旅人先从背包中拿出保温杯，然后将热水倒入保温杯，最后用手
```

指擦拭杯口雾气。", "details": "电影感。暖色的逆光透过雪山，柔和渐变的阴影。画面右侧，一名旅人先从背包中拿出保温杯，然后将热水倒入保温杯，最后用手指擦拭杯口雾气。", "narration": "寒冷吞噬勇气", "type": "镜头推进", "transition": "none", "voice": "孤

独", "status": "done", "image_url": "", "bgm": "", { "id": "2c9a259b-7903-4a64-8638-

44ed67743df2", "user_id": "11111111-2222-3333-4444-

5555555555555", "created_at": "2025-12-

01T20:40:37.204882+08:00", "updated_at": "2025-12-

01T20:40:37.204882+08:00", "story_id":"4fbb04b3-db6d-4928-AA2d-

2514a2469a82", "sequence":"3","title":"旅人","description":"赛博朋克。霓虹的侧光打在脸上，高对比度的阴影。画面前景，一名旅人先用手机打开地图APP，然后将手指滑动屏幕，最后露出迷茫的表情。", "details":"赛博朋克。霓虹的侧光打在脸上，高对比度的阴影。画面前景，一名旅人先用手机打开地图APP，然后将手指滑动屏幕，最后露出迷茫的表情。", "narration":"信号消失","type":"绕轴横向左旋转","transition":"none","voice":"绝

望", "status": "done", "image_url": "", "bgm": "", {,"id": "fad52d6d-a7ea-4ff9-ae98-

303f091b9fb7", "user_id": "11111111-2222-3333-4444-

5555555555555", "created_at": "2025-12-

01T20:40:37.208792+08:00", "updated_at": "2025-12-

01T20:40:37.208792+08:00","story_id":"4fbb04b3-db6d-4928-AA2d-

2514a2469a82", "sequence":"4","title":"旅人","description":"水墨画。冷色的顶光照射，柔和的阴影。画面背景，一名旅人先用登山杖戳向雪地，然后蹲下身用手指挖出雪块，最后将雪块捏成雪球。", "details":"水墨画。冷色的顶光照射，柔和的阴影。画面背景，一名旅人先用登山杖戳向雪地，然后蹲下身用手指挖出雪块，最后将雪块捏成雪球。", "narration":"雪中寻路","type":"垂直升降拍摄","transition":"none","voice":"冷

静", "status": "done", "image_url": "", "bgm": "", {,"id": "7f6be4b7-9bec-48f3-8026-

af71f5bb39a0", "user_id": "11111111-2222-3333-4444-

5555555555555", "created_at": "2025-12-

01T20:40:37.215037+08:00", "updated_at": "2025-12-

01T20:40:37.215037+08:00","story_id":"4fbb04b3-db6d-4928-AA2d-

2514a2469a82", "sequence":"5","title":"两名旅人","description":"电影感。暖色的逆光透过雪山，柔和渐变的阴影。画面中央，两名旅人先互相搀扶着向前走，然后停下脚步仰望星空，最后同时指向远方的雪峰。","details":"电影感。暖色的逆光透过雪山，柔和渐变的阴影。画面中央，两名旅人先互相搀扶着向前走，然后停下脚步仰望星空，最后同时指向远方的雪峰。","narration":"命运指引方向","type":"固定机位","transition":"none","voice":"希

望", "status": "done", "image_url": "", "bgm": ""}]

# - 5个镜头全部落库且status:done。

# 6. GET /v1/stories/{4fbb}/shots/{e628} (再生成前)

# Code block

1 curl -X GET "http://localhost:8080/v1/stories/4fbb04b3-db6d-4928-AA2d-2514a2469a82/shots/e6289115-9e5b-4625-98b0-413cd47d8f0a" -H "X-User-ID: 1111111-2222-3333-4444-555555555555"

Code block  
```json
1 {"id":"e6289115-9e5b-4625-98b0-413cd47d8f0a","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T20:40:37.19697+08:00","updated_at":"2025-12-01T20:40:37.19697+08:00","story_id":"4fbb04b3-db6d-4928-AA2d-2514a2469a82","sequence":"1","title":"两名旅人","description":"写实风格。冷色调的顶光照射，高对比度的阴影。画面左侧，两名穿着登山服的旅人先低头查看指南针，然后抬头望向画面右上方的雪山，最后互相确认眼神。","details":"写实风格。冷色调的顶光照射，高对比度的阴影。画面左侧，两名穿着登山服的旅人先低头查看指南针，然后抬头望向画面右上方的雪山，最后互相确认眼神。","narration":"迷雾笼罩雪山","type":"水平横移拍摄","transition":"none","voice":"紧张","status":"done","image_url":"","bgm":""}
```

- 镜头数据正常。

# 7. PATCH /v1/stories/{4fbb}/shots/{e628}

Code block  
```txt
1 curl -X PATCH "http://localhost:8080/v1/stories/4fbb04b3-db6d-4928-AA2d-2514a2469a82/shots/e6289115-9e5b-4625-98b0-413cd47d8f0a" -H "Content-Type:application/json" -H "X-User-ID: 11111111-2222-3333-4444-555555555555" -d{'"shot": {"details":"改为夜晚星空场景","narration":"星空照亮前路"}}"
```

Code block  
```javascript
1 {"id":"e6289115-9e5b-4625-98b0-413cd47d8f0a","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T20:40:37.19697+08:00","updated_at":"2025-12-01T20:41:04.833295+08:00","story_id":"4fbb04b3-db6d-4928-AA2d-2514a2469a82","sequence":"1","title":"两名旅人","description":"写实风格。冷色调的顶光照射，高对比度的阴影。画面左侧，两名穿着登山服的旅人先低头查看指南针，然后抬头望向画面右上方的雪山，最后互相确认眼神。","details":"改为夜晚星空场景","narration":"星空照亮前路","type":"水平横移拍摄","transition":"none","voice":"紧张","status":"done","image_url":"","bgm":"""}\
```

- 文案立即更新。

# 8. POST /v1/stories/{4fbb}/shots/{e628}/regenerate

Code block  
```shell
1 curl -X POST "http://localhost:8080/v1/stories/4fbb04b3-db6d-4928-AA2d-
```

```shell
2514a2469a82/shots/e6289115-9e5b-4625-98b0-413cd47d8f0a/regenerate" -H "Content-Type: application/json" -H "X-User-ID: 11111111-2222-3333-4444-555555555555" -d '{details":"需要极光星空画面","asset_type":"ASSET_IMAGE"}'
```

# Code block

1 {"operation_name":"operations/7c4bff7c-ad7b-4b09-90a1-9b22baca0481","state":"queued"}

- 再生成任务创建成功。

9. GET /v1/operations/7c4bdd7c...

# Code block

```batch
1 curl -X GET "http://localhost:8080/v1/operations/7c4bdd7c-ad7b-4b09-90a1-9b22baca0481" -H "X-User-ID: 1111111-2222-3333-4444-555555555555"
```

# Code block

```txt
1 {"id":"7c4bfff7c-ad7b-4b09-90a1-9b22baca0481","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T20:41:12.294092+08:00","updated_at":"2025-12-01T20:41:13.496729+08:00","story_id":"4fbb04b3-db6d-4928-AA2d-2514a2469a82","shot_id":"e6289115-9e5b-4625-98b0-413cd47d8f0a","type":"shot_regen","payload":"{"details":"需要极光星空画面","shot_id":"e6289115-9e5b-4625-98b0-413cd47d8f0a"},"status":"succeeded","retries":0,"error msg":"","worker":"story-worker","started_at":"2025-12-01T20:41:13.304791+08:00","finished_at":"2025-12-01T20:41:13.488044+08:00"}
```

- 再生成成功，worker 正常回写。

10. GET /v1/stories/{4fbb}/shots/{e628} (再生成后)

# Code block

```shell
1 curl -X GET "http://localhost:8080/v1/stories/4fbb04b3-db6d-4928-AA2d-2514a2469a82/shots/e6289115-9e5b-4625-98b0-413cd47d8f0a" -H "X-User-ID: 11111111-2222-3333-4444-555555555555"
```

```javascript
node["id":"e6289115-9e5b-4625-98b0-413cd47d8f0a","user_id":"11111111-2222-3333-4444-5555555555555","created_at":"2025-12-01T20:40:37.19697+08:00","updated_at":"2025-12-01T20:41:13.473451+08:00","story_id":"4fbb04b3-db6d-4928-AA2d-2514a2469a82","sequence":"1","title":"","description":"需要极光星空画面","details":"需要极光星空画面","narration":"","type":"","transition":"","voice":"","status":"done","image_url":"/static/4fbb04b3-db6d-4928-AA2d-2514a2469a82_e6289115-9e5b-4625-98b0-413cd47d8f0a_keyframe.png","bgm":"}")
```

- 模型返回的内容已写回 DB（标题被置空、图片路径替换为静帧文件）。

# 11. POST /v1/stories/{4fbb}/compile

Code block  
```txt
1 curl -X POST "http://localhost:8080/v1/stories/4fbb04b3-db6d-4928-AA2d-2514a2469a82/compile" -H "X-User-ID: 11111111-2222-3333-4444-555555555555"
```

Code block  
```json
1 {"operation_name":"operations/521fe61b-9790-4fae-8c28-e3682a6121b4","state":"queued"}
```

渲染任务入队。

# 12. GET /v1/operations/521fe61b...

Code block  
```batch
1 curl -X GET "http://localhost:8080/v1/operations/521fe61b-9790-4fae-8c28-e3682a6121b4" -H "X-User-ID: 1111111-2222-3333-4444-55555555555"
```

Code block  
```javascript
1 {"id":"521fe61b-9790-4fae-8c28-e3682a6121b4","user_id":"11111111-2222-3333-4444-555555555555","created_at":"2025-12-01T20:41:37.414174+08:00","updated_at":"2025-12-01T20:41:38.619011+08:00","story_id":"4fbb04b3-db6d-4928-AA2d-2514a2469a82","shot_id":"00000000-0000-0000-0000-00000000000000000000","type":"video_render","payload":"{"story_id":"4fbb04b3-db6d-4928-AA2d-
```

```txt
2514a2469a82}", status": "succeeded", "retries": 0, "error msg": "", "worker": "story-worker", "started_at": "2025-12-01T20:41:38.421003+08:00", "finished_at": "2025-12-01T20:41:38.618585+08:00"
```

视频渲染成功，GET/stories 已能看到新的 video_url。