curl -X POST http://localhost:12345/api/v1/storyboard/create -H "Content-Type: application/json" -d '{"operation_id":"op-001","story_id":"story-001","user_id":"u-001","display_name":"温馨短片","script_content":"小狗找妈妈的故事","style":"温馨可爱"}'

curl -X POST http://localhost:12345/api/v1/shot/regenerate -H "Content-Type: application/json" -d '{"operation_id":"op-003","story_id":"story-001","shot_id":"shot_03","user_id":"u-001","detail":"电影感。冷色调的顶光，硬光，高对比度阴影，冷色。画面中央，猎魔人发出一道剑气，女巫举起魔杖，然后施法将剑气击碎，最后两人一愣然后相视而笑。","style":"温馨可爱"}'

curl -X POST http://localhost:12345/api/v1/video/render -H "Content-Type: application/json" -d '{"operation_id":"op-003","story_id":"story-001","user_id":"u-001"}'
